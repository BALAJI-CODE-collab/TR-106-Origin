from __future__ import annotations

import os
import tempfile
import wave
from pathlib import Path
from typing import List, Tuple
import time

import numpy as np
import sounddevice as sd


class MicrophoneCapture:
    """Records audio from system microphone into a temporary WAV file."""

    PREFERRED_DEVICE_KEYWORDS = ("microphone", "mic", "headset", "usb")
    EXCLUDED_DEVICE_KEYWORDS = ("mapper", "primary sound", "stereo mix")

    @staticmethod
    def list_input_devices() -> List[str]:
        devices = sd.query_devices()
        names: List[str] = []
        for idx, dev in enumerate(devices):
            max_in = int(dev.get("max_input_channels", 0))
            if max_in > 0:
                names.append(f"{idx}: {dev.get('name', 'Unknown Input Device')}")
        return names

    @staticmethod
    def _resolve_device(device_hint: str | None) -> int | str | None:
        if not device_hint:
            devices = sd.query_devices()
            fallback_index: int | None = None
            preferred_candidates: list[int] = []
            all_candidates: list[int] = []
            for idx, dev in enumerate(devices):
                if int(dev.get("max_input_channels", 0)) <= 0:
                    continue

                name = str(dev.get("name", "")).lower()
                if fallback_index is None:
                    fallback_index = idx
                all_candidates.append(idx)
                if any(keyword in name for keyword in MicrophoneCapture.PREFERRED_DEVICE_KEYWORDS) and not any(
                    keyword in name for keyword in MicrophoneCapture.EXCLUDED_DEVICE_KEYWORDS
                ):
                    preferred_candidates.append(idx)

            for candidate in preferred_candidates + all_candidates:
                if MicrophoneCapture._can_open_device(candidate):
                    return candidate

            return fallback_index

        hint = device_hint.strip()
        if hint.isdigit():
            return int(hint)

        devices = sd.query_devices()
        lowered_hint = hint.lower()
        for idx, dev in enumerate(devices):
            name = str(dev.get("name", "")).lower()
            max_in = int(dev.get("max_input_channels", 0))
            if max_in > 0 and lowered_hint in name:
                return idx

        available = ", ".join(MicrophoneCapture.list_input_devices())
        raise ValueError(
            f"Could not find input device matching '{device_hint}'. Available: {available}"
        )

    @staticmethod
    def _can_open_device(device_index: int, samplerate: int | None = None, channels: int = 1) -> bool:
        try:
            if samplerate is None:
                samplerate = int(float(sd.query_devices(device_index).get("default_samplerate", 16000)))
            sd.check_input_settings(
                device=device_index,
                samplerate=samplerate,
                channels=channels,
                dtype="int16",
            )
            return True
        except Exception:
            return False

    @staticmethod
    def record_to_temp_wav(
        duration_sec: int = 6,
        sample_rate: int = 16000,
        channels: int = 1,
        device_hint: str | None = None,
    ) -> str:
        wav_path, _, _, _ = MicrophoneCapture.record_to_temp_wav_with_stats(
            duration_sec=duration_sec,
            sample_rate=sample_rate,
            channels=channels,
            device_hint=device_hint,
        )
        return wav_path

    @staticmethod
    def record_to_temp_wav_with_stats(
        duration_sec: int = 6,
        sample_rate: int = 16000,
        channels: int = 1,
        device_hint: str | None = None,
    ) -> Tuple[str, int, str, float]:
        devices = sd.query_devices()

        def add_candidate(index: int, bucket: list[int]) -> None:
            if index not in bucket:
                bucket.append(index)

        candidates: list[int] = []
        if device_hint:
            hint = device_hint.strip()
            if hint.isdigit():
                add_candidate(int(hint), candidates)
            else:
                lowered_hint = hint.lower()
                for idx, dev in enumerate(devices):
                    name = str(dev.get("name", "")).lower()
                    if int(dev.get("max_input_channels", 0)) > 0 and lowered_hint in name:
                        add_candidate(idx, candidates)

        preferred_candidates: list[int] = []
        all_candidates: list[int] = []
        for idx, dev in enumerate(devices):
            if int(dev.get("max_input_channels", 0)) <= 0:
                continue
            all_candidates.append(idx)
            name = str(dev.get("name", "")).lower()
            if any(keyword in name for keyword in MicrophoneCapture.PREFERRED_DEVICE_KEYWORDS) and not any(
                keyword in name for keyword in MicrophoneCapture.EXCLUDED_DEVICE_KEYWORDS
            ):
                preferred_candidates.append(idx)

        for idx in preferred_candidates + all_candidates:
            add_candidate(idx, candidates)

        if not candidates:
            raise ValueError("No usable input microphone was found. Run --list-mics and select a device index.")

        frames = int(duration_sec * sample_rate)
        last_error: Exception | None = None

        for device in candidates:
            device_samplerate = int(float(sd.query_devices(device).get("default_samplerate", sample_rate)))
            if not MicrophoneCapture._can_open_device(device, device_samplerate, channels):
                continue

            device_name = str(sd.query_devices(device).get("name", "Unknown Input Device"))
            try:
                audio = sd.rec(
                    frames,
                    samplerate=device_samplerate,
                    channels=channels,
                    dtype="int16",
                    device=device,
                )
                sd.wait()

                pcm = np.asarray(audio).reshape(-1)
                if device_samplerate != sample_rate and pcm.size > 1:
                    pcm = MicrophoneCapture._resample_pcm(pcm, device_samplerate, sample_rate)

                normalized = pcm.astype(np.float32) / 32768.0
                rms = float(np.sqrt(np.mean(np.square(normalized)))) if normalized.size > 0 else 0.0

                temp_fd, temp_file = tempfile.mkstemp(prefix="elderly_voice_", suffix=".wav")
                os.close(temp_fd)
                temp_path = Path(temp_file)
                with wave.open(str(temp_path), "wb") as handle:
                    handle.setnchannels(channels)
                    handle.setsampwidth(2)
                    handle.setframerate(sample_rate)
                    handle.writeframes(pcm.tobytes())

                return str(temp_path), device, device_name, rms
            except Exception as exc:
                last_error = exc

        raise RuntimeError(
            f"Unable to start recording from any input microphone. Last error: {last_error}"
        )

    @staticmethod
    def record_utterance_to_temp_wav_with_stats(
        max_duration_sec: int = 15,
        sample_rate: int = 16000,
        channels: int = 1,
        device_hint: str | None = None,
        start_threshold: float = 0.01,
        end_threshold: float = 0.008,
        end_silence_sec: float = 0.8,
    ) -> Tuple[str, int, str, float]:
        devices = sd.query_devices()

        def add_candidate(index: int, bucket: list[int]) -> None:
            if index not in bucket:
                bucket.append(index)

        candidates: list[int] = []
        if device_hint:
            hint = device_hint.strip()
            if hint.isdigit():
                add_candidate(int(hint), candidates)
            else:
                lowered_hint = hint.lower()
                for idx, dev in enumerate(devices):
                    name = str(dev.get("name", "")).lower()
                    if int(dev.get("max_input_channels", 0)) > 0 and lowered_hint in name:
                        add_candidate(idx, candidates)

        preferred_candidates: list[int] = []
        all_candidates: list[int] = []
        for idx, dev in enumerate(devices):
            if int(dev.get("max_input_channels", 0)) <= 0:
                continue
            all_candidates.append(idx)
            name = str(dev.get("name", "")).lower()
            if any(keyword in name for keyword in MicrophoneCapture.PREFERRED_DEVICE_KEYWORDS) and not any(
                keyword in name for keyword in MicrophoneCapture.EXCLUDED_DEVICE_KEYWORDS
            ):
                preferred_candidates.append(idx)

        for idx in preferred_candidates + all_candidates:
            add_candidate(idx, candidates)

        if not candidates:
            raise ValueError("No usable input microphone was found. Run --list-mics and select a device index.")

        last_error: Exception | None = None
        max_blocks = max(1, int(max_duration_sec / 0.1))
        silence_blocks_needed = max(1, int(end_silence_sec / 0.1))

        for device in candidates:
            device_samplerate = int(float(sd.query_devices(device).get("default_samplerate", sample_rate)))
            if not MicrophoneCapture._can_open_device(device, device_samplerate, channels):
                continue

            device_name = str(sd.query_devices(device).get("name", "Unknown Input Device"))
            try:
                blocksize = max(1, int(device_samplerate * 0.1))
                captured_blocks: list[np.ndarray] = []
                speech_started = False
                silence_blocks = 0
                peak_rms = 0.0

                with sd.InputStream(
                    samplerate=device_samplerate,
                    channels=channels,
                    dtype="int16",
                    device=device,
                    blocksize=blocksize,
                ) as stream:
                    for _ in range(max_blocks):
                        frames, _overflowed = stream.read(blocksize)
                        block = np.asarray(frames).reshape(-1)
                        if block.size == 0:
                            continue

                        normalized = block.astype(np.float32) / 32768.0
                        rms = float(np.sqrt(np.mean(np.square(normalized)))) if normalized.size > 0 else 0.0
                        peak_rms = max(peak_rms, rms)

                        if not speech_started:
                            if rms >= start_threshold:
                                speech_started = True
                                captured_blocks.append(block.copy())
                            continue

                        captured_blocks.append(block.copy())
                        if rms < end_threshold:
                            silence_blocks += 1
                            if silence_blocks >= silence_blocks_needed:
                                break
                        else:
                            silence_blocks = 0

                if not speech_started or not captured_blocks:
                    raise ValueError("No speech detected")

                pcm = np.concatenate(captured_blocks)
                if device_samplerate != sample_rate and pcm.size > 1:
                    pcm = MicrophoneCapture._resample_pcm(pcm, device_samplerate, sample_rate)

                normalized = pcm.astype(np.float32) / 32768.0
                rms = float(np.sqrt(np.mean(np.square(normalized)))) if normalized.size > 0 else 0.0
                if peak_rms > rms:
                    rms = peak_rms

                temp_fd, temp_file = tempfile.mkstemp(prefix="elderly_voice_", suffix=".wav")
                os.close(temp_fd)
                temp_path = Path(temp_file)
                with wave.open(str(temp_path), "wb") as handle:
                    handle.setnchannels(channels)
                    handle.setsampwidth(2)
                    handle.setframerate(sample_rate)
                    handle.writeframes(pcm.tobytes())

                return str(temp_path), device, device_name, rms
            except Exception as exc:
                last_error = exc

        if isinstance(last_error, ValueError) and str(last_error) == "No speech detected":
            raise last_error

        raise RuntimeError(
            f"Unable to capture a speech utterance from any input microphone. Last error: {last_error}"
        )

    @staticmethod
    def _resample_pcm(pcm: np.ndarray, source_rate: int, target_rate: int) -> np.ndarray:
        if source_rate == target_rate or pcm.size < 2:
            return pcm

        duration = pcm.size / float(source_rate)
        source_times = np.linspace(0.0, duration, num=pcm.size, endpoint=False)
        target_count = max(1, int(round(duration * target_rate)))
        target_times = np.linspace(0.0, duration, num=target_count, endpoint=False)
        resampled = np.interp(target_times, source_times, pcm.astype(np.float32))
        return np.clip(resampled, -32768, 32767).astype(np.int16)
