# ElderCare AI - Complete Setup Guide

## 📋 System Overview

ElderCare AI is a comprehensive, intelligent care system for elderly individuals with:
- **Python Backend**: Decision engine with emotion, memory, anomaly detection, and Alzheimer risk assessment
- **React Frontend**: Modern, animated UI for users and caregivers
- **FastAPI Integration**: REST API connecting frontend and backend
- **ML Pipeline**: Advanced cognitive assessment and behavioral analysis

## 🛠️ Prerequisites

### System Requirements
- **OS**: Windows 10/11, macOS 11+, or Linux
- **Python**: 3.10 or higher
- **Node.js**: 16.x or higher
- **npm/yarn**: 8.x or higher

### Hardware (Recommended)
- CPU: Dual-core or better
- RAM: 4GB minimum (8GB recommended)
- Disk: 2GB free space

## 📦 Installation

### 1. Backend Setup

#### Step 1.1: Create Python Virtual Environment

```bash
cd C:\Hackathon
python -m venv .venv
.\.venv\Scripts\activate  # On Windows
# source .venv/bin/activate  # On macOS/Linux
```

#### Step 1.2: Install Python Dependencies

```bash
# Install main requirements
pip install -r requirements.txt

# Install API dependencies
pip install -r requirements-api.txt

# Verify installation
python -c "import fastapi; print('FastAPI installed:', fastapi.__version__)"
```

#### Step 1.3: Configure Environment

Create `.env` file in project root:

```env
# Elderly Care AI Configuration
USER_ID=elder_001
SESSION_ID=default
LOG_LEVEL=INFO
DATA_DIR=./data
MODEL_DIR=./models

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_WORKERS=2

# Audio Configuration (if using voice input)
AUDIO_DEVICE_INDEX=1
AUDIO_SAMPLE_RATE=16000
AUDIO_CHUNK_SIZE=1024
SPEECH_GAP_SECONDS=10.0

# Speech-to-Text
STT_MODEL_SIZE=small
STT_LANGUAGE=en

# ML Module (Optional)
ALZHEIMER_PROJECT_ROOT=C:/ML
```

#### Step 1.4: Initialize Data Directories

```bash
python -c "from pathlib import Path; Path('data').mkdir(exist_ok=True); Path('data/raw').mkdir(exist_ok=True)"
```

### 2. Frontend Setup

#### Step 2.1: Navigate to Frontend Directory

```bash
cd frontend
```

#### Step 2.2: Install Node Dependencies

```bash
npm install
```

If you're using yarn:

```bash
yarn install
```

#### Step 2.3: Create Frontend Environment File

Create `.env.local` in `frontend/` directory:

```env
VITE_API_URL=http://localhost:8000
VITE_APP_TITLE=ElderCare AI
```

### 3. ML Module Integration (Optional)

If you have the Alzheimer detection ML module:

1. Copy/symlink your ML folder to `C:\ML` or configure `ALZHEIMER_PROJECT_ROOT` environment variable
2. The system will auto-discover the module at runtime

Verify integration:

```bash
python -c "from src.alzheimer_bridge import safe_evaluate_alzheimer; print(safe_evaluate_alzheimer('test', {}))"
```

## 🚀 Running the System

### Option A: Full Stack (Recommended for Development)

#### Terminal 1 - Start Backend API Server

```bash
cd C:\Hackathon
.\.venv\Scripts\activate  # Activate venv
python -m src.api_server
```

Expected output:
```
✅ ElderCare AI API initialized
🚀 Starting ElderCare AI API Server...
INFO:     Uvicorn running on http://0.0.0.0:8000
```

#### Terminal 2 - Start Frontend Development Server

```bash
cd C:\Hackathon\frontend
npm run dev
```

Expected output:
```
  VITE v5.0.0  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

#### Terminal 3 - (Optional) Test Voice Interaction

```bash
cd C:\Hackathon
.\.venv\Scripts\activate
python -m src.voice_runner --text "I feel good today"
```

### Option B: Backend Only (For API Testing)

```bash
cd C:\Hackathon
.\.venv\Scripts\activate
python -m src.api_server
```

Test API endpoints:

```bash
# Health check
curl http://localhost:8000/health

# Process interaction
curl -X POST http://localhost:8000/api/process \
  -H "Content-Type: application/json" \
  -d '{"text":"I feel good","user_id":"elder_001","session_id":"test"}'
```

### Option C: CLI Only (No Frontend)

```bash
cd C:\Hackathon
.\.venv\Scripts\activate

# Text input
python -m src.voice_runner --text "How are you?"

# Continuous listening (requires microphone)
python -m src.voice_runner --live

# Load from audio file
python -m src.voice_runner --audio-file sample.wav
```

## 📊 Accessing the System

### Web Interface
- **URL**: http://localhost:5173
- **User View**: Chat interface with emotion detection
- **Caregiver View**: Analytics dashboard with weekly summaries

### API Documentation
- **URL**: http://localhost:8000/docs (Interactive Swagger UI)
- **Alternative**: http://localhost:8000/redoc (ReDoc)

### API Base URL
- **Local Development**: http://localhost:8000
- **Production**: Configure in `.env.local`

## 🔧 Configuration

### Backend Configuration (`src/config.py` or `.env`)

```python
# Emotion detection
EMOTION_THRESHOLD = 0.5

# Memory retrieval
MEMORY_TOP_K = 3
MEMORY_SIMILARITY_THRESHOLD = 0.3

# Anomaly detection
ANOMALY_Z_THRESHOLD = 2.0
ANOMALY_IFOREST_THRESHOLD = 0.5

# Alzheimer assessment
ALZHEIMER_RISK_THRESHOLD = 0.4

# Caregiver nudges
NUDGE_INTERVAL_HOURS = 6
NUDGE_FREQUENCY = "daily"

# Session timeout
SESSION_TIMEOUT_MINUTES = 60
```

### Frontend Configuration (`frontend/.env.local`)

```env
# API Configuration
VITE_API_URL=http://localhost:8000
VITE_API_TIMEOUT=30000

# Feature Flags
VITE_ENABLE_CAREGIVER_VIEW=true
VITE_ENABLE_TTS=true
VITE_ENABLE_ANIMATIONS=true

# UI Configuration
VITE_THEME=light
VITE_FONT_SIZE=16
```

## 📁 Project Structure

```
Hackathon/
├── src/
│   ├── modules/                 # Core AI modules
│   │   ├── emotion_detection.py
│   │   ├── long_term_memory.py
│   │   ├── behavior_logging.py
│   │   ├── advanced_anomaly_detection.py
│   │   ├── attention_integration.py
│   │   ├── caregiver_reporting.py
│   │   ├── health_schedule.py
│   │   └── tts_output.py
│   ├── decision_engine.py       # Central orchestrator
│   ├── voice_runner.py          # CLI interface
│   ├── api_server.py            # FastAPI server
│   └── alzheimer_bridge.py      # ML module integration
├── frontend/                     # React web app
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── services/            # API client
│   │   ├── App.tsx              # Main app
│   │   └── index.css            # Styles
│   ├── package.json
│   └── vite.config.ts
├── ml/                          # Local ML module (optional)
├── data/                        # User data and logs
├── requirements.txt             # Python dependencies
├── requirements-api.txt         # API-specific dependencies
└── .env                         # Configuration
```

## 🧪 Testing

### Unit Tests

```bash
# Test emotion detection
python -m pytest src/modules/test_emotion_detection.py -v

# Test memory retrieval
python -m pytest src/modules/test_long_term_memory.py -v

# Test API endpoints
python -m pytest src/test_api_server.py -v
```

### Integration Tests

```bash
# End-to-end test
python -m pytest src/test_integration.py -v

# API integration
python -m pytest frontend/test/api.test.ts
```

### Manual Testing

#### Test Emotion Detection

```bash
python -c "
from src.modules.emotion_detection import EmotionDetector
detector = EmotionDetector()
result = detector.detect('I feel really sad today')
print(f'Emotion: {result.label}, Score: {result.score}')
"
```

#### Test Memory Storage

```bash
python -c "
from src.modules.long_term_memory import LongTermMemory
memory = LongTermMemory()
memory.store_conversation('elder_001', 'I like ice cream')
results = memory.retrieve_relevant('elder_001', 'food preferences')
print(results)
"
```

#### Test API

```bash
# Using curl
curl -X POST http://localhost:8000/api/process \
  -H 'Content-Type: application/json' \
  -d '{\"text\": \"I feel worried\", \"user_id\": \"elder_001\", \"session_id\": \"test_001\"}'

# Using Python requests
python -c "
import requests
response = requests.post(
    'http://localhost:8000/api/process',
    json={'text': 'Hello', 'user_id': 'elder_001', 'session_id': 'test'}
)
print(response.json())
"
```

## 🐛 Troubleshooting

### Common Issues

#### Issue: "ModuleNotFoundError: No module named 'fastapi'"
**Solution**: Install API requirements
```bash
pip install -r requirements-api.txt
```

#### Issue: Port 8000 already in use
**Solution**: Use different port or kill process
```bash
# Kill existing process (Windows)
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Use different port
python -m src.api_server --port 8001
```

#### Issue: Microphone not detected
**Solution**: Specify device index
```bash
python -m src.voice_runner --live --mic-device 1
```

#### Issue: Frontend can't reach backend
**Solution**: Check API URL in `.env.local`
```env
VITE_API_URL=http://localhost:8000
```

#### Issue: TTS not producing audio
**Solution**: Install pyttsx3 and check system audio
```bash
pip install pyttsx3 --upgrade
```

### Debug Mode

Enable verbose logging:

```bash
# Backend
PYTHONUNBUFFERED=1 python -m src.api_server --log-level DEBUG

# Frontend
VITE_DEBUG=true npm run dev
```

## 🚢 Deployment

### Docker Deployment

1. Create `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements*.txt .
RUN pip install -r requirements-api.txt

COPY src/ ./src/
EXPOSE 8000

CMD ["python", "-m", "src.api_server"]
```

2. Build and run:

```bash
docker build -t eldercare-api .
docker run -p 8000:8000 eldercare-api
```

### Production Deployment

#### Backend (Production)

```bash
# Install gunicorn
pip install gunicorn

# Run with gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker src.api_server:app --bind 0.0.0.0:8000
```

#### Frontend (Production)

```bash
# Build
cd frontend
npm run build

# Serve with static server
npx serve -s dist
```

## 📈 Performance Optimization

### Backend
- Enable async/await in API
- Use connection pooling for data
- Cache frequently accessed data
- Monitor memory usage

### Frontend
- Enable production build optimizations
- Lazy load components
- Optimize bundle size
- Use service workers for offline support

## 🔐 Security Considerations

- Use HTTPS in production
- Set `CORS_ORIGINS` to specific domains
- Validate all API inputs
- Sanitize user data
- Use environment variables for secrets
- Implement authentication if needed

## 📝 Logging

### Backend Logs

Logs are written to:
- Console: Real-time debugging
- File: `data/logs/app.log`
- Session: `data/logs/session_<id>.log`

Configure logging level in `.env`:

```env
LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR, CRITICAL
```

### Frontend Logs

Enable console logs:

```javascript
// In App.tsx
if (process.env.VITE_DEBUG) {
  console.log('Interaction:', output);
}
```

## 📚 Documentation

- **API Docs**: http://localhost:8000/docs
- **Frontend Docs**: See `frontend/README.md`
- **Module Docs**: Docstrings in each Python file

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## 📞 Support

For issues:
1. Check logs for error messages
2. Review this guide's troubleshooting section
3. Test individual modules
4. Check GitHub issues

## 📄 License

MIT License - See LICENSE file

## 🎉 Next Steps

1. **Start the system** following the "Running the System" section
2. **Access the web interface** at http://localhost:5173
3. **Explore features**:
   - Chat with the AI assistant
   - View emotion detection in real-time
   - Check caregiver dashboard
   - Monitor anomaly alerts
4. **Configure settings** via `.env` files
5. **Customize** components in frontend/src

Congratulations! You now have a fully functional ElderCare AI system! 🎊
