from __future__ import annotations

import argparse
import time
from pathlib import Path
from datetime import datetime, timezone

from src.decision_engine import DecisionEngine
from src.alzheimer_bridge import safe_evaluate_alzheimer
from src.modules.tts_output import EmpatheticTextToSpeech
from src.modules.mic_capture import MicrophoneCapture
from src.modules.stt_whisper import WhisperSTT


def base_chatbot_response(user_text: str) -> str:
    """Keeps compatibility with a simple existing chatbot layer."""
    lowered = user_text.lower()
    if "medicine" in lowered or "medication" in lowered:
        return "Let us check your medication reminders together."
    if "sad" in lowered or "worried" in lowered or "anxious" in lowered:
        return "I am here for you. Would you like a calming breathing exercise?"
    return "Thank you for sharing. How can I support you right now?"


def print_result(user_text: str, result: object) -> None:
    print("User text:", user_text)
    print("Session ID:", result.session_id)
    print("Emotion:", result.emotion)
    print("Memory hits:", result.memory_hits)
    print("Upcoming schedule:", result.upcoming_schedule)
    print("Caregiver dashboard:", getattr(result, "caregiver_dashboard", {}))
    print("Response:", result.response)
    print("Anomaly alert:", result.anomaly_alert)


def process_text(
    engine: DecisionEngine,
    user_id: str,
    session_id: str,
    text: str,
    tts: EmpatheticTextToSpeech | None = None,
) -> None:
    cognitive_data = {
        "session_id": session_id,
        "user_id": user_id,
        "text_length": len(text),
        "word_count": len(text.split()),
    }
    alzheimer_result = safe_evaluate_alzheimer(text, cognitive_data)
    print("Alzheimer risk:", alzheimer_result)

    result = engine.process_interaction(
        user_id=user_id,
        user_text=text,
        base_chatbot_response=None,
        activity="voice_chat",
        reminder_missed=False,
        session_id=session_id,
        now=datetime.now(timezone.utc),
    )
    print_result(text, result)
    if tts:
        tts.speak(result.response, emotion_label=result.emotion.get("label", "neutral"))


def run_live_mic_loop(
    engine: DecisionEngine,
    user_id: str,
    session_id: str,
    mic_seconds: int,
    mic_device: str | None,
    whisper_model: str,
    language: str | None,
    speech_gap_seconds: float,
    tts: EmpatheticTextToSpeech | None,
) -> None:
    live_language = language or "en"
    live_model = whisper_model if whisper_model != "base" else "small"
    stt = WhisperSTT(model=live_model)
    print("Live mic mode started. Speak naturally. Press Ctrl+C to stop.")

    while True:
        print("Listening...")
        temp_mic_file: str | None = None
        temp_mic_file, device_index, device_name, rms = MicrophoneCapture.record_utterance_to_temp_wav_with_stats(
            max_duration_sec=mic_seconds,
            device_hint=mic_device,
            end_silence_sec=speech_gap_seconds,
        )
        print(f"Mic device: {device_index} ({device_name}) | level: {rms:.5f}")
        try:
            transcription = stt.transcribe_file(audio_path=temp_mic_file, language=live_language)
            print("Transcription model:", transcription.model)
            print("Heard:", transcription.text or "[silence]")
            if not transcription.text.strip():
                raise ValueError("No speech detected")
            process_text(engine, user_id, session_id, transcription.text, tts=tts)
        except ValueError as exc:
            if str(exc) == "No speech detected":
                print("No speech detected")
                raise
            raise
        finally:
            if temp_mic_file:
                try:
                    Path(temp_mic_file).unlink(missing_ok=True)
                except PermissionError:
                    pass

        time.sleep(0.1)


def main() -> None:
    parser = argparse.ArgumentParser(description="Local-Whisper-to-Decision-Engine runner")
    parser.add_argument("--user-id", default="elder_001", help="Unique user identifier")
    parser.add_argument(
        "--session-id",
        default="session-default",
        help="Conversation session ID for session-wise history storage",
    )
    parser.add_argument(
        "--audio-file",
        default=None,
        help="Path to audio file for local Whisper transcription (wav/mp3/m4a)",
    )
    parser.add_argument("--mic", action="store_true", help="Capture speech from microphone")
    parser.add_argument(
        "--live",
        action="store_true",
        help="Keep listening on the microphone and print each utterance in the terminal",
    )
    parser.add_argument(
        "--list-mics",
        action="store_true",
        help="List available input microphone devices and exit",
    )
    parser.add_argument(
        "--mic-device",
        default=None,
        help="Microphone device index or partial name (e.g., Grenaro)",
    )
    parser.add_argument(
        "--mic-seconds",
        type=int,
        default=6,
        help="Maximum listen time in seconds for one speech turn when using --live",
    )
    parser.add_argument(
        "--speech-gap-seconds",
        type=float,
        default=10.0,
        help="Silence gap required before ending one utterance in --live mode",
    )
    parser.add_argument(
        "--text",
        default=None,
        help="Optional direct text input for quick testing without local STT",
    )
    parser.add_argument("--language", default=None, help="Optional language code, e.g. en")
    parser.add_argument(
        "--whisper-model",
        default="base",
        help="Local Whisper model name (tiny, base, small, medium, large)",
    )
    args = parser.parse_args()

    if args.list_mics:
        for line in MicrophoneCapture.list_input_devices():
            print(line)
        return

    engine = DecisionEngine()
    tts = EmpatheticTextToSpeech()

    if args.text:
        process_text(engine, args.user_id, args.session_id, args.text, tts=tts)
        return

    if args.live:
        run_live_mic_loop(
            engine=engine,
            user_id=args.user_id,
            session_id=args.session_id,
            mic_seconds=args.mic_seconds,
            mic_device=args.mic_device,
            whisper_model=args.whisper_model,
            language=args.language,
            speech_gap_seconds=args.speech_gap_seconds,
            tts=tts,
        )
        return

    audio_file = args.audio_file
    temp_mic_file: str | None = None
    if args.mic:
        print("Recording from microphone...")
        temp_mic_file = MicrophoneCapture.record_to_temp_wav(
            duration_sec=args.mic_seconds,
            device_hint=args.mic_device,
        )
        print("Recorded file:", temp_mic_file)
        audio_file = temp_mic_file

    if not audio_file:
        raise ValueError("Provide one of --text, --audio-file, or --mic.")

    stt = WhisperSTT(model=args.whisper_model)
    transcription = stt.transcribe_file(audio_path=audio_file, language=args.language)
    print("Transcription model:", transcription.model)
    process_text(engine, args.user_id, args.session_id, transcription.text, tts=tts)

    if temp_mic_file:
        try:
            Path(temp_mic_file).unlink(missing_ok=True)
        except PermissionError:
            pass


if __name__ == "__main__":
    main()
