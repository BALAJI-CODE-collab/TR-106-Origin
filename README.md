# Elderly Care AI Upgrade (Phase 2 Modules)

This project extends an existing voice-based elderly care AI pipeline with modular intelligence components while preserving Phase 1 assumptions:

- Speech-to-text (Whisper) remains upstream
- Existing chatbot remains the base response provider
- Existing reminder scheduler remains in place
- Existing dashboard can consume alerts from this layer

## Added Modules

1. **Emotion Detection Module** (`src/modules/emotion_detection.py`)
- Uses VADER sentiment analysis
- Returns emotion `label` (`happy`, `sad`, `neutral`, `anxious`) and score
- Supports tone adaptation in response generation

2. **Long-Term Memory Module** (`src/modules/long_term_memory.py`)
- Stores user facts/conversations in JSON
- Uses TF-IDF vector embeddings + cosine similarity retrieval
- Retrieves memory snippets relevant to current user input

3. **Proactive Engagement Module** (`src/modules/proactive_engagement.py`)
- Tracks last user interaction timestamp
- Triggers friendly check-ins after inactivity threshold (default 6 hours)

4. **Advanced Anomaly Detection Module** (`src/modules/advanced_anomaly_detection.py`)
- Tracks interaction frequency, missed reminders, emotion trend
- Uses Z-score logic to detect abnormal behavior shifts
- Produces reasoned alerts for dashboard integration

5. **Behavior Logging System** (`src/modules/behavior_logging.py`)
- Logs each interaction with timestamp, emotion, response latency, and activity
- Stores records in JSONL for audit and analytics

6. **Decision Engine** (`src/decision_engine.py`)
- Central orchestrator combining emotion + memory + behavior
- Produces final adapted response and anomaly alert payload

7. **Caregiver Health Schedule Module** (`src/modules/health_schedule.py`)
- Reads caregiver-entered schedules (medications, meals, exercises)
- Adds upcoming schedule context to responses

8. **Session-by-Session History Module** (`src/modules/session_history.py`)
- Stores each turn under `user_id + session_id`
- Keeps conversation history grouped per session

9. **Whisper STT Connector** (`src/modules/stt_whisper.py`)
- Uses local Whisper model inference (no cloud API)
- Converts audio files to text and feeds the same Decision Engine path

## Run

Install dependencies:

```bash
pip install -r requirements.txt
```

Set up LiveKit environment variables for room-based voice handling:

```bash
set LIVEKIT_URL=your_livekit_url
set LIVEKIT_API_KEY=your_livekit_api_key
set LIVEKIT_API_SECRET=your_livekit_api_secret
```

Run demo:

```bash
python -m src.demo
```

Run local Whisper pipeline (audio file -> transcription -> decision engine):

```bash
python -m src.voice_runner --audio-file path/to/voice.wav --user-id elder_001 --session-id morning-01
```

Run live microphone pipeline (record -> local Whisper -> decision engine):

```bash
python -m src.voice_runner --mic --mic-seconds 6 --user-id elder_001 --session-id live-01
```

LiveKit-handled voice mode:

```bash
python -m src.livekit_agent dev
```

This mode uses LiveKit for room connection, audio transport, turn detection, and transcription flow, then sends each user turn into the same Decision Engine.

Continuous terminal listening mode:

```bash
python -m src.voice_runner --live --mic-seconds 4 --user-id elder_001 --session-id live-01
```

This prints each spoken chunk, the detected emotion, and the response in the terminal until you press Ctrl+C.

List available microphone devices:

```bash
python -m src.voice_runner --list-mics
```

Use a specific microphone by partial device name or index:

```bash
python -m src.voice_runner --mic --mic-device "USBAudio1.0" --mic-seconds 6
```

Optional model selection:

```bash
python -m src.voice_runner --audio-file path/to/voice.wav --whisper-model base
```

Quick test without local STT (useful before microphone arrives):

```bash
python -m src.voice_runner --text "I am feeling worried today" --user-id elder_001 --session-id morning-01
```

Notes for local Whisper:

```bash
pip install -r requirements.txt
```

Local Whisper may require ffmpeg available on your system path for some audio formats.

Caregiver schedule is configured in `data/health_schedule.json`.
Session-wise conversation history is stored in `data/session_history.json`.

## Sample Test Inputs

The demo includes these sample inputs:

1. `I feel great today and had a nice breakfast.`
2. `I am worried because I forgot my medicine yesterday.`
3. `My daughter will visit me after my evening walk.`

## Example Output Shape

For each interaction, the system prints:

- Emotion: `{'label': 'happy', 'score': 0.784}`
- Memory hits: `['You enjoy evening walks with your daughter Meera.']`
- Response: tone-adjusted + optional memory context
- Anomaly alert:
  - `is_anomaly`
  - `reasons`
  - `z_scores` for tracked metrics

It also runs a proactive check after 7 hours of inactivity and prints a friendly check-in message.


cd C:\Hackathon
c:/Hackathon/.venv/Scripts/python.exe -m src.voice_runner --live --mic-device 1 --mic-seconds 4 --user-id elder_001 --session-id live-01
