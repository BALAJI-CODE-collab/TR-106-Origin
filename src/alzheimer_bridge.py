from __future__ import annotations

import importlib
import os
import sys
from pathlib import Path
from types import ModuleType
from typing import Any, Callable


def _safe_float(value: Any, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


class AlzheimerModuleError(RuntimeError):
    """Raised when the Alzheimer module cannot be loaded."""


_DEF_MODULE_NAME = "alzheimer_module"
_DEF_FUNCTION_NAME = "detect_alzheimer"


def _candidate_roots() -> list[Path]:
    current = Path(__file__).resolve()
    workspace_root = current.parents[1]  # /Hackathon
    
    # Priority order: workspace ml folder first, then external locations
    roots = [
        workspace_root / "ml",  # Local ml folder in workspace
        workspace_root,          # Workspace root (for ml/ subfolder)
        current.parents[1],
        current.parents[2] if len(current.parents) > 2 else current.parents[1],
        Path.cwd(),
    ]

    env_root = os.getenv("ALZHEIMER_PROJECT_ROOT")
    if env_root:
        roots.insert(0, Path(env_root))

    # Common Windows project layouts: C:\ML, D:\ML, etc.
    roots.extend([
        Path("C:/ML"),
        Path("D:/ML"),
    ])

    unique_roots: list[Path] = []
    for root in roots:
        if root not in unique_roots:
            unique_roots.append(root)
    return unique_roots


def ensure_module_path(module_name: str = _DEF_MODULE_NAME) -> Path:
    """Add likely project roots to sys.path so sibling packages become importable."""
    for root in _candidate_roots():
        for candidate in _module_candidates(root, module_name):
            if candidate.exists():
                if str(root) not in sys.path:
                    sys.path.insert(0, str(root))
                _ensure_package_init(candidate)
                return root

    # Fallback: keep cwd importable even if project is launched from another folder.
    cwd = Path.cwd()
    if str(cwd) not in sys.path:
        sys.path.insert(0, str(cwd))
    return cwd


def _module_candidates(root: Path, module_name: str) -> list[Path]:
    return [
        root / module_name,
        root / "main_app" / module_name,
        root / "alzheimer_module",
        root / "main_app" / "alzheimer_module",
    ]


def _ensure_package_init(package_dir: Path) -> None:
    """Create __init__.py if the folder is a plain directory package."""
    init_file = package_dir / "__init__.py"
    if package_dir.exists() and not init_file.exists():
        init_file.write_text("", encoding="utf-8")


def _safe_import_module(module_name: str = _DEF_MODULE_NAME) -> ModuleType:
    ensure_module_path(module_name)
    try:
        return importlib.import_module(module_name)
    except Exception as exc:
        raise AlzheimerModuleError(
            f"Could not import '{module_name}'. Ensure the folder exists and has __init__.py."
        ) from exc


def get_detect_alzheimer(module_name: str = _DEF_MODULE_NAME) -> Callable[[Any, Any], Any]:
    """Get the detection function from the Alzheimer module.
    
    Tries multiple module names and function names for compatibility:
    - alzheimer_evaluation.evaluate_alzheimer (workspace ml folder)
    - alzheimer_module.detect_alzheimer (external C:/ML folder)
    """
    # 1) First, try external project integration (C:/ML, ALZHEIMER_PROJECT_ROOT)
    external_detector = _build_external_ml_detector()
    if external_detector:
        return external_detector

    # 2) Then try workspace-local module
    try:
        module = importlib.import_module("ml.alzheimer_evaluation")
        detect = getattr(module, "evaluate_alzheimer", None)
        if callable(detect):
            return detect
    except (ImportError, AttributeError):
        pass
    
    # 3) Fall back to generic module loading
    module = _safe_import_module(module_name)
    
    # Try multiple function names for compatibility
    for func_name in [_DEF_FUNCTION_NAME, "evaluate_alzheimer", "evaluate", "detect"]:
        try:
            detect = getattr(module, func_name, None)
            if callable(detect):
                return detect
        except AttributeError:
            continue
    
    raise AlzheimerModuleError(
        f"'{module_name}' does not expose '{_DEF_FUNCTION_NAME}' or 'evaluate_alzheimer'."
    )


def _build_external_ml_detector() -> Callable[[Any, Any], Any] | None:
    """Build adapter callable for external C:/ML Alzheimer project if present."""
    candidate_roots: list[Path] = []
    env_root = os.getenv("ALZHEIMER_PROJECT_ROOT", "").strip()
    if env_root:
        candidate_roots.append(Path(env_root))
    candidate_roots.extend([Path("C:/ML"), Path("D:/ML")])

    for root in candidate_roots:
        web_app_dir = root / "web_app"
        predictor_file = web_app_dir / "multimodal_predictor.py"
        if not predictor_file.exists():
            continue

        try:
            if str(root) not in sys.path:
                sys.path.insert(0, str(root))

            module = importlib.import_module("web_app.multimodal_predictor")
            predictor_cls = getattr(module, "MultiModalAlzheimerPredictor", None)
            if predictor_cls is None:
                continue

            predictor = predictor_cls()

            def _external_detect(text: str, cognitive_data: Any) -> dict[str, Any]:
                payload = cognitive_data if isinstance(cognitive_data, dict) else {}
                lowered = (text or "").lower()

                clinical_data = {
                    "age": int(_safe_float(payload.get("age"), 65)),
                    "education": int(_safe_float(payload.get("education"), 12)),
                    "mmse": _safe_float(payload.get("mmse"), min(30.0, max(10.0, len((text or "").split()) / 2.0))),
                    "cdr": _safe_float(payload.get("cdr"), 0.5),
                    "nwbv": _safe_float(payload.get("nwbv"), 0.75),
                    "hippocampal_volume": _safe_float(payload.get("hippocampal_volume"), 3.2),
                }

                digital_data = {
                    "typing_speed": _safe_float(payload.get("typing_speed"), 70.0),
                    "typing_errors": _safe_float(payload.get("typing_errors"), 2.0),
                    "voice_stability": _safe_float(payload.get("voice_stability"), 75.0),
                    "speech_pause": _safe_float(payload.get("speech_pause"), (text or "").count("...") + (text or "").count("--")),
                    "gps_confusion": _safe_float(payload.get("gps_confusion"), 0.0),
                }

                # Slightly raise risk when memory-related terms are present.
                memory_signals = ["forget", "forgot", "confused", "memory", "dementia", "alzheimer"]
                if any(term in lowered for term in memory_signals):
                    digital_data["speech_pause"] = float(digital_data["speech_pause"]) + 1.0

                explanations: list[str] = []

                # Prefer project's predictor API when fully implemented.
                can_use_native_predict = callable(getattr(predictor, "predict", None)) and all(
                    hasattr(predictor, attr)
                    for attr in ["_extract_clinical_features", "_predict_clinical_risk", "_predict_digital_risk"]
                )

                if can_use_native_predict:
                    risk_raw, confidence_raw, native_explanations = predictor.predict(clinical_data, digital_data)
                    risk_score = max(0.0, min(1.0, _safe_float(risk_raw, 0.5)))
                    confidence = max(0.0, min(1.0, _safe_float(confidence_raw, 0.7)))
                    if isinstance(native_explanations, list):
                        explanations = [str(item) for item in native_explanations[:5]]
                else:
                    # Compatibility fallback for partially completed external project files.
                    age_risk = max(0.0, min(1.0, (clinical_data["age"] - 55) / 45.0))
                    mmse_risk = max(0.0, min(1.0, (30.0 - clinical_data["mmse"]) / 30.0))
                    cdr_risk = max(0.0, min(1.0, clinical_data["cdr"] / 3.0))
                    speech_risk = max(0.0, min(1.0, digital_data["speech_pause"] / 6.0))
                    voice_risk = max(0.0, min(1.0, (100.0 - digital_data["voice_stability"]) / 100.0))

                    risk_score = max(
                        0.0,
                        min(
                            1.0,
                            (age_risk * 0.2)
                            + (mmse_risk * 0.35)
                            + (cdr_risk * 0.2)
                            + (speech_risk * 0.15)
                            + (voice_risk * 0.1),
                        ),
                    )
                    confidence = 0.78
                    explanations = [
                        "External C:/ML predictor loaded in compatibility mode",
                        "Risk derived from age, MMSE, CDR, speech pauses, and voice stability",
                    ]

                if risk_score < 0.35:
                    risk_level = "low"
                elif risk_score < 0.65:
                    risk_level = "moderate"
                else:
                    risk_level = "high"

                return {
                    "risk_score": round(risk_score, 3),
                    "risk_level": risk_level,
                    "confidence": round(confidence, 3),
                    "features": {
                        "source": "external_ml_project",
                        "mode": "native" if can_use_native_predict else "compat",
                        "project_root": str(root),
                        "mmse": clinical_data["mmse"],
                        "voice_stability": digital_data["voice_stability"],
                        "speech_pause": digital_data["speech_pause"],
                        "explanations": explanations,
                    },
                }

            return _external_detect
        except Exception:
            continue

    return None


def evaluate_alzheimer(text: str, cognitive_data: Any, module_name: str = _DEF_MODULE_NAME) -> Any:
    """Wrapper used by main_app after speech-to-text."""
    detect_alzheimer = get_detect_alzheimer(module_name)
    return detect_alzheimer(text, cognitive_data)


def safe_evaluate_alzheimer(
    text: str,
    cognitive_data: Any,
    module_name: str = _DEF_MODULE_NAME,
) -> dict[str, Any]:
    """Graceful fallback wrapper for the main pipeline."""
    try:
        risk = evaluate_alzheimer(text, cognitive_data, module_name=module_name)
        return {"ok": True, "risk_score": risk, "error": None}
    except Exception as exc:
        return {"ok": False, "risk_score": None, "error": str(exc)}
