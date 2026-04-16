from __future__ import annotations

import importlib
import os
import sys
from pathlib import Path
from types import ModuleType
from typing import Any, Callable


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
    # First, try the new workspace-local module
    try:
        module = importlib.import_module("ml.alzheimer_evaluation")
        detect = getattr(module, "evaluate_alzheimer", None)
        if callable(detect):
            return detect
    except (ImportError, AttributeError):
        pass
    
    # Fall back to the standard module loading
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
