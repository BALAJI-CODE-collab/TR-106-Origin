from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class SpeechConfig:
    """Simple voice settings used to make the assistant sound more empathetic."""

    rate: int = 175
    volume: float = 1.0


class EmpatheticTextToSpeech:
    """Optional text-to-speech output with emotion-aware voice settings."""

    def __init__(self) -> None:
        self._engine = None
        try:
            import pyttsx3  # type: ignore

            self._engine = pyttsx3.init()
        except Exception:
            self._engine = None

    @staticmethod
    def _config_for_emotion(emotion_label: str) -> SpeechConfig:
        if emotion_label == "sad":
            return SpeechConfig(rate=155, volume=0.95)
        if emotion_label == "anxious":
            return SpeechConfig(rate=160, volume=0.97)
        if emotion_label == "happy":
            return SpeechConfig(rate=185, volume=1.0)
        return SpeechConfig(rate=175, volume=0.98)

    def speak(self, text: str, emotion_label: str = "neutral") -> bool:
        """Speak text when pyttsx3 is available; otherwise fall back silently."""
        if not self._engine:
            return False

        config = self._config_for_emotion(emotion_label)
        try:
            self._engine.setProperty("rate", config.rate)
            self._engine.setProperty("volume", config.volume)
            self._engine.say(text)
            self._engine.runAndWait()
            return True
        except Exception:
            return False
