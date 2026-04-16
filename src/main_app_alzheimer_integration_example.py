from __future__ import annotations

from typing import Any

from src.alzheimer_bridge import safe_evaluate_alzheimer


def after_speech_to_text_pipeline(text: str, cognitive_data: dict[str, Any]) -> dict[str, Any]:
    """Example hook to call after speech-to-text in main_app."""
    result = safe_evaluate_alzheimer(text, cognitive_data)
    return result


if __name__ == "__main__":
    sample_text = "I keep forgetting appointments and get confused sometimes."
    sample_cognitive_data = {
        "memory_score": 0.42,
        "speech_pause_rate": 0.31,
        "behavior_decline": 0.67,
    }
    print(after_speech_to_text_pipeline(sample_text, sample_cognitive_data))
