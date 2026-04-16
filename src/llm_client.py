from __future__ import annotations

import json
import os
from typing import Any, Dict, Optional
from urllib import error, request


_LAST_ERROR = ""


def _set_last_error(message: str) -> None:
    global _LAST_ERROR
    _LAST_ERROR = message


def _get_last_error() -> str:
    return _LAST_ERROR


def _provider_defaults(provider: str) -> tuple[str, str]:
    normalized = provider.lower().strip()
    if normalized == "groq":
        return "https://api.groq.com/openai/v1/chat/completions", "llama-3.1-8b-instant"
    if normalized == "openrouter":
        return "https://openrouter.ai/api/v1/chat/completions", "meta-llama/llama-3.1-8b-instruct:free"
    if normalized == "openai":
        return "https://api.openai.com/v1/chat/completions", "gpt-4o-mini"
    return "", ""


def _resolve_api_key(provider: str) -> tuple[str, str]:
    """Resolve API key and its source env var for the provider."""
    provider = provider.lower().strip()
    if provider == "groq":
        key = os.getenv("LLM_API_KEY", "").strip() or os.getenv("GROQ_API_KEY", "").strip()
        source = "LLM_API_KEY" if os.getenv("LLM_API_KEY", "").strip() else "GROQ_API_KEY"
        return key, source
    if provider == "openrouter":
        key = os.getenv("LLM_API_KEY", "").strip() or os.getenv("OPENROUTER_API_KEY", "").strip()
        source = "LLM_API_KEY" if os.getenv("LLM_API_KEY", "").strip() else "OPENROUTER_API_KEY"
        return key, source
    if provider == "openai":
        key = os.getenv("LLM_API_KEY", "").strip() or os.getenv("OPENAI_API_KEY", "").strip()
        source = "LLM_API_KEY" if os.getenv("LLM_API_KEY", "").strip() else "OPENAI_API_KEY"
        return key, source
    return "", ""


def _build_prompt(language: str, user_text: str) -> str:
    if language == "ta":
        return (
            "நீங்கள் வயதானவர்களுக்கு உதவும் உரையாடல் துணை. "
            "இயல்பான தமிழில் பேசவும். ரோபோ மாதிரி அல்லது ஒரே மாதிரி பதில் தர வேண்டாம். "
            "பரிவுடன், தெளிவாக, பயனுள்ள படிகள் அல்லது ஒரு அடுத்த கேள்வியுடன் பதில் கொடு. "
            "பயனர் கேள்வி: "
            f"{user_text}"
        )
    return (
        "You are a compassionate elderly-care conversational companion. "
        "Respond naturally (not robotic), with empathy, clear guidance, and one helpful follow-up when relevant. "
        f"User message: {user_text}"
    )


def _resolve_model(provider: str, default_model: str) -> str:
    provider_specific = os.getenv(f"LLM_MODEL_{provider.upper()}", "").strip()
    if provider_specific:
        return provider_specific
    generic = os.getenv("LLM_MODEL", "").strip()
    if generic:
        return generic
    return default_model


def generate_llm_response(user_text: str, language: str = "ta") -> Optional[str]:
    provider = os.getenv("LLM_PROVIDER", "openrouter").lower().strip()
    
    # Fallback chain: Try LLM_PROVIDER, then openrouter, then openai, then groq
    providers_to_try = []
    if provider and provider not in {"", "none", "off", "local"}:
        providers_to_try.append(provider)
    
    # Add fallback providers
    if provider != "openrouter":
        providers_to_try.append("openrouter")
    if provider != "openai":
        providers_to_try.append("openai")
    if provider != "groq":
        providers_to_try.append("groq")

    # Remove duplicates while preserving order
    ordered_providers = list(dict.fromkeys(providers_to_try))
    failure_details: list[str] = []

    for try_provider in ordered_providers:
        api_key, _source = _resolve_api_key(try_provider)
        if not api_key:
            failure_details.append(f"{try_provider.upper()}: Missing API key")
            continue

        endpoint, default_model = _provider_defaults(try_provider)
        if not endpoint:
            failure_details.append(f"{try_provider.upper()}: Unsupported provider")
            continue

        model = _resolve_model(try_provider, default_model)
        timeout_raw = os.getenv("LLM_TIMEOUT_SECONDS", "12")
        try:
            timeout_seconds = float(timeout_raw)
        except ValueError:
            timeout_seconds = 12.0

        payload = {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a safe, empathetic elderly-care assistant. "
                        "Use warm conversational style, avoid repetitive stock lines, "
                        "and provide complete, easy-to-understand responses."
                    ),
                },
                {
                    "role": "user",
                    "content": _build_prompt(language=language, user_text=user_text),
                },
            ],
            "temperature": 0.55,
            "max_tokens": 220,
        }

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        }
        if try_provider == "openrouter":
            headers["HTTP-Referer"] = os.getenv("LLM_APP_URL", "http://localhost:5173")
            headers["X-Title"] = os.getenv("LLM_APP_NAME", "ElderCare AI")

        req = request.Request(
            endpoint,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        try:
            with request.urlopen(req, timeout=timeout_seconds) as resp:
                raw = resp.read().decode("utf-8")
            parsed = json.loads(raw)
            content = parsed.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
            if content:
                _set_last_error("")
                return content
            else:
                failure_details.append(f"{try_provider.upper()}: Empty response")
                continue
        except error.HTTPError as exc:
            body = ""
            try:
                body = exc.read().decode("utf-8")
            except Exception:
                body = ""
            failure_details.append(f"{try_provider.upper()} HTTP {exc.code}: {body[:120]}")
            continue
        except error.URLError as exc:
            failure_details.append(f"{try_provider.upper()} Network error: {exc.reason}")
            continue
        except TimeoutError:
            failure_details.append(f"{try_provider.upper()} Timeout")
            continue
        except (ValueError, KeyError, IndexError) as exc:
            failure_details.append(f"{try_provider.upper()} Invalid response: {exc}")
            continue

    # All providers failed
    if failure_details:
        _set_last_error(" | ".join(failure_details))
    else:
        _set_last_error("All LLM providers failed or no API keys available")
    return None


def get_llm_status() -> Dict[str, Any]:
    provider = os.getenv("LLM_PROVIDER", "none").lower().strip()
    endpoint, default_model = _provider_defaults(provider)
    model = _resolve_model(provider, default_model)
    api_key, source = _resolve_api_key(provider)

    return {
        "provider": provider or "none",
        "enabled": provider not in {"", "none", "off", "local"},
        "endpoint": endpoint,
        "model": model,
        "api_key_present": bool(api_key),
        "api_key_source": source if api_key else "",
        "last_error": _get_last_error(),
    }
