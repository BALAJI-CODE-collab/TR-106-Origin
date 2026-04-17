from __future__ import annotations

import json
import os
import smtplib
from datetime import datetime, timezone
from email.message import EmailMessage
from pathlib import Path
from typing import Any, Dict, List


def _first_env(*keys: str, default: str = "") -> str:
    for key in keys:
        value = os.getenv(key)
        if value is not None and str(value).strip() != "":
            return str(value).strip()
    return default


def _as_bool(value: str, default: bool = False) -> bool:
    if value is None:
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _as_int(value: str, default: int) -> int:
    try:
        return int(str(value).strip())
    except Exception:
        return default


def _smtp_protocol() -> str:
    protocol = _first_env("SMTP_PROTOCOL", "MAIL_PROTOCOL", default="").strip().lower()
    if protocol in {"smtps", "ssl"}:
        return "smtps"
    if protocol in {"smtp", "plain"}:
        return "smtp"
    if protocol in {"starttls", "smtp+starttls", "tls"}:
        return "starttls"
    return "auto"


class EscalationNotificationService:
    def __init__(self, event_log_path: str = "data/escalation_events.jsonl") -> None:
        self.event_log_path = Path(event_log_path)
        self.event_log_path.parent.mkdir(parents=True, exist_ok=True)
        self.event_log_path.touch(exist_ok=True)

    def send_escalation(
        self,
        resident_id: str,
        reason: str,
        symptoms: List[str],
        category: str,
        details: Dict[str, Any],
        children_emails: List[str],
        guardian_emails: List[str],
    ) -> Dict[str, object]:
        recipients = sorted(set(children_emails + guardian_emails))
        sent_mail_to: List[str] = []
        mail_errors: List[str] = []

        subject = f"[ElderCare Alert] {resident_id} - {reason}"
        detail_lines = [f"- {key}: {value}" for key, value in (details or {}).items()]
        body = "\n".join(
            [
                "ElderCare escalation alert generated.",
                "",
                f"Resident ID: {resident_id}",
                f"Category: {category or 'general'}",
                f"Reason: {reason}",
                f"Symptoms: {', '.join(symptoms) if symptoms else 'none'}",
                "",
                "Details:",
                *(detail_lines or ["- none"]),
                "",
                f"Timestamp (UTC): {datetime.now(timezone.utc).isoformat()}",
            ]
        )

        smtp_host = _first_env("SMTP_HOST", "MAIL_HOST", "EMAIL_HOST", "SMTP_SERVER")
        smtp_port = _as_int(_first_env("SMTP_PORT", "MAIL_PORT", "EMAIL_PORT", default="587"), 587)
        smtp_user = _first_env("SMTP_USER", "SMTP_USERNAME", "MAIL_USER", "MAIL_USERNAME", "EMAIL_USER")
        smtp_password = _first_env("SMTP_PASSWORD", "SMTP_PASS", "MAIL_PASSWORD", "MAIL_PASS", "EMAIL_PASSWORD")
        smtp_from = _first_env("SMTP_FROM", "MAIL_FROM", "EMAIL_FROM", default=smtp_user)
        smtp_use_ssl = _as_bool(_first_env("SMTP_USE_SSL", "MAIL_USE_SSL", "EMAIL_USE_SSL", default="false"), False)
        smtp_disable_tls = _as_bool(_first_env("SMTP_DISABLE_STARTTLS", "SMTP_DISABLE_TLS", "MAIL_DISABLE_STARTTLS", default="false"), False)
        smtp_protocol = _smtp_protocol()

        use_ssl = smtp_use_ssl or smtp_protocol == "smtps"
        starttls_enabled = (not smtp_disable_tls) if smtp_protocol in {"auto", "starttls"} else False

        if smtp_host and smtp_from and recipients:
            for recipient in recipients:
                try:
                    msg = EmailMessage()
                    msg["Subject"] = subject
                    msg["From"] = smtp_from
                    msg["To"] = recipient
                    msg.set_content(body)

                    if use_ssl:
                        with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10) as server:
                            if smtp_user and smtp_password:
                                server.login(smtp_user, smtp_password)
                            server.send_message(msg)
                    else:
                        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                            try:
                                if starttls_enabled:
                                    server.starttls()
                            except Exception:
                                # Continue without TLS for SMTP servers that do not support STARTTLS.
                                pass
                            if smtp_user and smtp_password:
                                server.login(smtp_user, smtp_password)
                            server.send_message(msg)
                    sent_mail_to.append(recipient)
                except Exception as exc:
                    # Keep escalation flow resilient even if one recipient mail fails.
                    mail_errors.append(f"{recipient}: {type(exc).__name__}: {exc}")
                    continue

        payload = {
            "resident_id": resident_id,
            "reason": reason,
            "symptoms": symptoms,
            "category": category,
            "details": details,
            "recipients": recipients,
            "mail_sent_to": sent_mail_to,
            "mail_errors": mail_errors,
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "status": "sent" if sent_mail_to else ("logged_only_no_smtp" if not smtp_host or not smtp_from else "logged_only_mail_failed"),
            "smtp": {
                "configured": bool(smtp_host and smtp_from),
                "host": smtp_host,
                "port": smtp_port,
                "from": smtp_from,
                "protocol": smtp_protocol,
                "use_ssl": use_ssl,
                "starttls_enabled": starttls_enabled,
            },
        }
        with self.event_log_path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(payload) + "\n")
        return payload
