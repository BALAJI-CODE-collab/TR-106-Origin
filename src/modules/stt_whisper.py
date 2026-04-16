from __future__ import annotations

import wave
from dataclasses import dataclass
from pathlib import Path

import numpy as np


@dataclass
class TranscriptionResult:
    """Structured output from Whisper transcription."""

    text: str
    model: str


class WhisperSTT:
    """Thin wrapper around local Whisper transcription."""

    def __init__(self, model: str = "base") -> None:
        # Import lazily so text-only mode can run without local Whisper installed.
        try:
            import whisper  # type: ignore
        except ImportError as exc:
            raise ImportError(
                "Local Whisper is not installed. Run: pip install openai-whisper"
            ) from exc

        self._whisper = whisper
        self.model = model
        self._loaded_model = self._whisper.load_model(model)

    def transcribe_file(
        self,
        audio_path: str,
        language: str | None = None,
        prompt: str | None = None,
    ) -> TranscriptionResult:
        file_path = Path(audio_path)
        if not file_path.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        if file_path.suffix.lower() == ".wav":
            audio = self._load_wav_audio(file_path)
            response = self._loaded_model.transcribe(
                audio,
                language=language,
                prompt=prompt,
            )
        else:
            response = self._loaded_model.transcribe(
                str(file_path),
                language=language,
                prompt=prompt,
            )

        return TranscriptionResult(text=response["text"].strip(), model=self.model)

    @staticmethod
    def _load_wav_audio(file_path: Path) -> np.ndarray:
        with wave.open(str(file_path), "rb") as handle:
            sample_width = handle.getsampwidth()
            channel_count = handle.getnchannels()
            sample_rate = handle.getframerate()
            frame_count = handle.getnframes()
            raw = handle.readframes(frame_count)

        if sample_width != 2:
            raise ValueError(
                f"Unsupported WAV sample width {sample_width * 8} bits. Use 16-bit PCM WAV."
            )

        audio = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
        if channel_count > 1:
            audio = audio.reshape(-1, channel_count).mean(axis=1)

        if sample_rate != 16000 and audio.size > 1:
            duration = audio.size / float(sample_rate)
            source_times = np.linspace(0.0, duration, num=audio.size, endpoint=False)
            target_count = max(1, int(round(duration * 16000)))
            target_times = np.linspace(0.0, duration, num=target_count, endpoint=False)
            audio = np.interp(target_times, source_times, audio).astype(np.float32)

        return audio
