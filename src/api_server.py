"""
FastAPI backend server for ElderCare AI frontend integration
Provides REST API endpoints for the React frontend
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import sys
from pathlib import Path
import os

# Add src directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

# Load environment variables from workspace .env if present.
def _load_dotenv_file(dotenv_path: Path) -> None:
    if not dotenv_path.exists():
        return
    try:
        for raw_line in dotenv_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value
    except Exception:
        # Keep startup resilient if .env contains malformed lines.
        pass


_load_dotenv_file(Path(__file__).resolve().parent.parent / ".env")

from src.decision_engine import DecisionEngine
from src.llm_client import generate_llm_response, get_llm_status
from src.notification_service import EscalationNotificationService
from src.resident_registry import ResidentRegistry
from src.admin_analytics import AdminAnalyticsService
from src.modules.caregiver_reporting import CaregiverReportBuilder

# Initialize FastAPI app
app = FastAPI(
    title="ElderCare AI API",
    description="Backend API for elderly care AI system",
    version="1.0.0"
)

ALZHEIMER_GAME_DIR = Path(r"C:\ML\Alzheimer_Game")
if ALZHEIMER_GAME_DIR.exists():
    app.mount(
        "/alzheimer-game",
        StaticFiles(directory=str(ALZHEIMER_GAME_DIR), html=True),
        name="alzheimer-game",
    )

PARKINSON_GAME_DIR = Path(r"C:\ML\Parkinson_Game")
if PARKINSON_GAME_DIR.exists():
    app.mount(
        "/parkinson-game",
        StaticFiles(directory=str(PARKINSON_GAME_DIR), html=True),
        name="parkinson-game",
    )

DEMENTIA_GAME_DIR = Path(r"C:\ML\Dementia_Game")
if DEMENTIA_GAME_DIR.exists():
    app.mount(
        "/dementia-game",
        StaticFiles(directory=str(DEMENTIA_GAME_DIR), html=True),
        name="dementia-game",
    )

SPEECH_THERAPY_GAME_DIR = Path(r"C:\ML\Speech_Therapy_Game")
if SPEECH_THERAPY_GAME_DIR.exists():
    app.mount(
        "/speech-therapy-game",
        StaticFiles(directory=str(SPEECH_THERAPY_GAME_DIR), html=True),
        name="speech-therapy-game",
    )

# Add CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize engine
engine = None
caregiver_builder = None
resident_registry = None
notification_service = None
admin_analytics = None

@app.on_event("startup")
async def startup_event():
    """Initialize engine on startup"""
    global engine, caregiver_builder, resident_registry, notification_service, admin_analytics
    engine = DecisionEngine()
    caregiver_builder = CaregiverReportBuilder(
        schedule_manager=engine.schedule,
        history_store=engine.session_history,
    )
    resident_registry = ResidentRegistry()
    notification_service = EscalationNotificationService()
    admin_analytics = AdminAnalyticsService()
    print("✅ ElderCare AI API initialized")

# Request/Response Models
class InteractionRequest(BaseModel):
    text: str
    user_id: str
    session_id: str
    cognitive_data: Optional[Dict[str, Any]] = None
    language: Optional[str] = 'en'

class EmotionResult(BaseModel):
    label: str
    score: float

class MemoryHit(BaseModel):
    text: str
    relevance: Optional[float] = None

class AnomalyAlert(BaseModel):
    is_anomaly: bool
    reasons: List[str]
    z_scores: Dict[str, float]
    iforest_outlier: bool
    iforest_score: float

class CaregiverDashboard(BaseModel):
    daily_nudges: List[str]
    weekly_summary: Dict[str, Any]
    flags: Dict[str, Any]

class AlzheimerRisk(BaseModel):
    ok: bool
    risk_score: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class InteractionResponse(BaseModel):
    response: str
    emotion: Dict[str, Any]
    memory_hits: List[Dict[str, Any]]
    anomaly_alert: Dict[str, Any]
    caregiver_dashboard: Dict[str, Any]
    alzheimer_risk: Dict[str, Any]
    disease_assessment: Dict[str, Any]


def _should_bypass_llm_seed(user_text: str) -> bool:
    lowered = user_text.lower()
    direct_intents = [
        "schedule",
        "plan",
        "calendar",
        "reminder",
        "anxious",
        "anxiety",
        "worried",
        "sad",
        "medicine",
        "medication",
        "tablet",
        "remember",
        "recall",
        "memory",
    ]
    return any(token in lowered for token in direct_intents)


class GuardianLoginRequest(BaseModel):
    username: str
    password: str


class GuardianLoginResponse(BaseModel):
    ok: bool
    resident_id: str = ""
    resident_name: str = ""
    guardian_email: str = ""


class EscalationRequest(BaseModel):
    resident_id: str
    reason: str
    symptoms: List[str] = []
    category: str = ""
    details: Dict[str, Any] = Field(default_factory=dict)
    reminder_id: str = ""
    no_response_seconds: int = 0


class DailyCareStatusRequest(BaseModel):
    resident_id: str
    breakfast: str = "unknown"
    lunch: str = "unknown"
    dinner: str = "unknown"
    tablets: str = "unknown"
    water: str = "unknown"
    notes: str = ""


class RetryGameReportMailRequest(BaseModel):
    resident_id: str
    sent_at: str
    game_name: str = ""


class AlzheimerPredictionRequest(BaseModel):
    text: str = ""
    cognitive_data: Optional[Dict[str, Any]] = None


class ParkinsonPredictionRequest(BaseModel):
    text: str = ""
    cognitive_data: Optional[Dict[str, Any]] = None


import random

def _base_chatbot_response(text: str) -> str:
    lowered = text.lower()
    
    # Medication/health responses
    if "medicine" in lowered or "medication" in lowered or "tablet" in lowered:
        responses = [
            "Let us check your medication reminders together.",
            "I can help you manage your medications. What do you need?",
            "Your medications are important. Shall we review them?",
        ]
        return random.choice(responses)
    
    if "sad" in lowered or "worried" in lowered or "anxious" in lowered or "upset" in lowered:
        responses = [
            "I am here with you. Do you want to talk about what is on your mind?",
            "You do not have to hold this alone. I am listening and I can stay with you.",
            "Let us take this gently. Tell me what would help right now.",
        ]
        return random.choice(responses)
    
    if "alzheimer" in lowered:
        return "I can run an Alzheimer voice screening now. Would you like that?"
    
    if "parkinson" in lowered:
        return "I can run a Parkinson voice screening now. Would you like that?"
    
    if "exercise" in lowered or "walk" in lowered or "activity" in lowered:
        responses = [
            "Light activity is good for you. Shall we plan a walk?",
            "Movement helps with wellness. What exercise do you enjoy?",
            "Regular activity keeps you healthy. Let us do something together.",
        ]
        return random.choice(responses)
    
    if "memory" in lowered or "forget" in lowered:
        responses = [
            "Memory exercises can help. Shall we do a cognitive game?",
            "Let me help you remember. What are we talking about?",
            "I can help strengthen your memory with a fun activity.",
        ]
        return random.choice(responses)
    
    # Default warm responses
    default_responses = [
        "I am listening carefully. Tell me whatever you would like.",
        "I am here with you. What would make this moment better?",
        "Thank you for sharing that. I want to understand you better.",
        "You can talk freely. I will stay with you.",
        "Tell me what you need, and we can go one step at a time.",
    ]
    return random.choice(default_responses)

class HealthCheckResponse(BaseModel):
    status: str
    message: str
    version: str


class LLMStatusResponse(BaseModel):
    provider: str
    enabled: bool
    endpoint: str
    model: str
    api_key_present: bool
    api_key_source: str
    last_error: str

# Routes

@app.get("/", response_model=HealthCheckResponse)
async def root():
    """Health check endpoint"""
    return HealthCheckResponse(
        status="operational",
        message="ElderCare AI API is running",
        version="1.0.0"
    )

@app.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """Detailed health check"""
    return HealthCheckResponse(
        status="healthy" if engine else "initializing",
        message="System operational" if engine else "Initializing...",
        version="1.0.0"
    )


@app.get("/api/llm-status", response_model=LLMStatusResponse)
async def llm_status():
    """Return live LLM configuration and last provider error for debugging."""
    return LLMStatusResponse(**get_llm_status())

@app.post("/api/process", response_model=InteractionResponse)
async def process_interaction(request: InteractionRequest):
    """
    Process user interaction and return AI response with all cognitive outputs
    
    Returns:
    - response: AI assistant's response
    - emotion: Detected emotion with label and score
    - memory_hits: Retrieved memories
    - anomaly_alert: Behavioral anomaly detection results
    - caregiver_dashboard: Caregiver-facing outputs (nudges, summary, flags)
    - alzheimer_risk: Cognitive risk assessment
    """
    if not engine:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    
    try:
        language = request.language or "en"
        llm_seed = None
        if not _should_bypass_llm_seed(request.text):
            llm_seed = generate_llm_response(
                user_text=request.text,
                language=language,
            )

        result = engine.process_interaction(
            user_id=request.user_id,
            user_text=request.text,
            base_chatbot_response=llm_seed,
            activity="api_chat",
            reminder_missed=False,
            session_id=request.session_id,
            cognitive_data={
                **(request.cognitive_data or {}),
                "language": language,
            },
        )
        
        return InteractionResponse(
            response=result.response,
            emotion=result.emotion,
            memory_hits=[{"text": item} for item in result.memory_hits],
            anomaly_alert=result.anomaly_alert,
            caregiver_dashboard=result.caregiver_dashboard,
            alzheimer_risk=result.alzheimer_risk,
            disease_assessment=result.disease_assessment,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing interaction: {str(e)}"
        )


@app.get("/api/residents")
async def list_residents():
    if not resident_registry:
        raise HTTPException(status_code=503, detail="Registry not initialized")
    return {"residents": resident_registry.list_residents()}


@app.post("/api/guardian-login", response_model=GuardianLoginResponse)
async def guardian_login(request: GuardianLoginRequest):
    if not resident_registry:
        raise HTTPException(status_code=503, detail="Registry not initialized")
    auth = resident_registry.authenticate_guardian(request.username, request.password)
    if not auth:
        return GuardianLoginResponse(ok=False)
    return GuardianLoginResponse(
        ok=True,
        resident_id=auth["resident_id"],
        resident_name=auth["resident_name"],
        guardian_email=auth["guardian_email"],
    )


@app.post("/api/escalate-alert")
async def escalate_alert(request: EscalationRequest):
    if not resident_registry or not notification_service:
        raise HTTPException(status_code=503, detail="Services not initialized")

    recipients = resident_registry.escalation_recipients(request.resident_id)
    result = notification_service.send_escalation(
        resident_id=request.resident_id,
        reason=request.reason,
        symptoms=request.symptoms,
        category=request.category,
        details=request.details,
        children_emails=recipients["children"],
        guardian_emails=recipients["guardians"],
    )
    return {
        "ok": True,
        "message": "Escalation notifications sent to children and nearby guardians",
        "result": result,
        "context": {
            "reminder_id": request.reminder_id,
            "no_response_seconds": request.no_response_seconds,
        },
    }


@app.post("/api/caregiver/daily-care-status")
async def caregiver_daily_care_status(request: DailyCareStatusRequest):
    if not resident_registry or not notification_service:
        raise HTTPException(status_code=503, detail="Services not initialized")

    if not request.resident_id:
        raise HTTPException(status_code=400, detail="resident_id is required")

    status_map = {
        "breakfast": request.breakfast,
        "lunch": request.lunch,
        "dinner": request.dinner,
        "tablets": request.tablets,
        "water": request.water,
    }

    missing_items = [
        key
        for key, value in status_map.items()
        if str(value).strip().lower() in {"missed", "not_taken", "no", "skipped"}
    ]

    category = "daily_care_update"
    reason = "Daily care update recorded"
    if missing_items:
        category = "daily_care_missed"
        reason = f"Missed daily care items: {', '.join(missing_items)}"

    recipients = resident_registry.escalation_recipients(request.resident_id)
    details = {
        **status_map,
        "notes": request.notes,
    }
    result = notification_service.send_escalation(
        resident_id=request.resident_id,
        reason=reason,
        symptoms=[],
        category=category,
        details=details,
        children_emails=recipients["children"],
        guardian_emails=recipients["guardians"],
    )

    record_dir = Path("data")
    record_dir.mkdir(parents=True, exist_ok=True)
    record_path = record_dir / "caregiver_daily_status.jsonl"
    entry = {
        "resident_id": request.resident_id,
        "category": category,
        "reason": reason,
        "details": details,
        "mail_result": result,
    }
    with record_path.open("a", encoding="utf-8") as handle:
        import json

        handle.write(json.dumps(entry) + "\n")

    return {
        "ok": True,
        "category": category,
        "reason": reason,
        "missing_items": missing_items,
        "mail": result,
    }


@app.post("/api/caregiver/game-reports/retry-mail")
async def retry_caregiver_game_report_mail(request: RetryGameReportMailRequest):
    if not resident_registry or not notification_service:
        raise HTTPException(status_code=503, detail="Services not initialized")

    if not request.resident_id or not request.sent_at:
        raise HTTPException(status_code=400, detail="resident_id and sent_at are required")

    event_log_path = Path("data") / "escalation_events.jsonl"
    if not event_log_path.exists():
        raise HTTPException(status_code=404, detail="No escalation event log found")

    source_event: Optional[Dict[str, Any]] = None
    try:
        import json

        for raw_line in event_log_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line:
                continue
            try:
                payload = json.loads(line)
            except Exception:
                continue

            if payload.get("resident_id") != request.resident_id:
                continue
            if payload.get("category") != "game_assessment":
                continue
            if str(payload.get("sent_at") or "") != str(request.sent_at):
                continue

            detail_game_name = ""
            details_payload = payload.get("details")
            if isinstance(details_payload, dict):
                detail_game_name = str(details_payload.get("game_name") or "")

            if request.game_name and detail_game_name and request.game_name.strip().lower() != detail_game_name.strip().lower():
                continue

            source_event = payload
            break
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read escalation history: {str(e)}")

    if not source_event:
        raise HTTPException(status_code=404, detail="Matching game assessment report not found")

    recipients = resident_registry.escalation_recipients(request.resident_id)
    details = source_event.get("details") if isinstance(source_event.get("details"), dict) else {}
    reason = str(source_event.get("reason") or "Game assessment follow-up")
    symptoms = source_event.get("symptoms") if isinstance(source_event.get("symptoms"), list) else []

    retry_details = {
        **details,
        "retry_of_sent_at": source_event.get("sent_at"),
        "retry_requested_at": datetime.now(timezone.utc).isoformat(),
    }

    result = notification_service.send_escalation(
        resident_id=request.resident_id,
        reason=reason,
        symptoms=[str(item) for item in symptoms],
        category="game_assessment",
        details=retry_details,
        children_emails=recipients["children"],
        guardian_emails=recipients["guardians"],
    )

    return {
        "ok": True,
        "resident_id": request.resident_id,
        "retried_report_sent_at": request.sent_at,
        "mail": result,
    }


@app.get("/api/caregiver/game-reports/{resident_id}")
async def get_caregiver_game_reports(resident_id: str, limit: int = 20):
    if not resident_id:
        raise HTTPException(status_code=400, detail="resident_id is required")

    safe_limit = max(1, min(100, int(limit)))
    event_log_path = Path("data") / "escalation_events.jsonl"
    if not event_log_path.exists():
        return {"ok": True, "resident_id": resident_id, "reports": []}

    reports: List[Dict[str, Any]] = []
    try:
        import json

        for raw_line in event_log_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line:
                continue
            try:
                payload = json.loads(line)
            except Exception:
                continue

            if payload.get("resident_id") != resident_id:
                continue
            if payload.get("category") != "game_assessment":
                continue

            details = payload.get("details") if isinstance(payload.get("details"), dict) else {}
            smtp_meta = payload.get("smtp") if isinstance(payload.get("smtp"), dict) else {}

            reports.append(
                {
                    "resident_id": resident_id,
                    "sent_at": payload.get("sent_at"),
                    "game_name": details.get("game_name") or "Unknown Game",
                    "reason": payload.get("reason") or "",
                    "details": details,
                    "mail_status": payload.get("status") or "unknown",
                    "mail_sent_to": payload.get("mail_sent_to") or [],
                    "mail_errors": payload.get("mail_errors") or [],
                    "smtp": smtp_meta,
                }
            )

        reports.sort(key=lambda item: str(item.get("sent_at") or ""), reverse=True)
        return {"ok": True, "resident_id": resident_id, "reports": reports[:safe_limit]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading game reports: {str(e)}")


@app.get("/api/admin/resident-report/{user_id}")
async def get_admin_resident_report(user_id: str):
    if not engine or not admin_analytics or not resident_registry or not notification_service:
        raise HTTPException(status_code=503, detail="Services not initialized")

    try:
        logs = engine.get_behavior_logs(user_id)
        report = admin_analytics.build_resident_report(user_id, logs)

        low_happiness_mail_sent = False
        average_happiness = float(report.get("average_happiness", 50.0) or 50.0)
        if admin_analytics.should_send_low_happiness_alert(user_id, average_happiness):
            recipients = resident_registry.escalation_recipients(user_id)
            notification_service.send_escalation(
                resident_id=user_id,
                reason="Happiness level below threshold (<50). Resident misses family and needs a visit.",
                symptoms=[],
                category="low_happiness",
                details={
                    "average_happiness": average_happiness,
                    "threshold": 50,
                    "message": "The resident appears to be emotionally low, missing family, and may need an in-person visit.",
                },
                children_emails=recipients["children"],
                guardian_emails=recipients["guardians"],
            )
            low_happiness_mail_sent = True

        report["low_happiness_mail_sent"] = low_happiness_mail_sent
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error building admin report: {str(e)}")


@app.get("/api/admin/resident-report/{user_id}/json")
async def download_admin_resident_json(user_id: str):
    if not engine or not admin_analytics:
        raise HTTPException(status_code=503, detail="Services not initialized")

    try:
        # Refresh snapshot before download.
        logs = engine.get_behavior_logs(user_id)
        admin_analytics.build_resident_report(user_id, logs)
        snapshot_path = admin_analytics.get_snapshot_path(user_id)
        if not snapshot_path.exists():
            raise HTTPException(status_code=404, detail="Resident JSON report not found")
        return FileResponse(
            path=str(snapshot_path),
            media_type="application/json",
            filename=f"{user_id}_report.json",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error downloading JSON report: {str(e)}")


@app.get("/api/admin/resident-report/{user_id}/pdf")
async def download_admin_resident_pdf(user_id: str):
    if not engine or not admin_analytics:
        raise HTTPException(status_code=503, detail="Services not initialized")

    try:
        logs = engine.get_behavior_logs(user_id)
        report = admin_analytics.build_resident_report(user_id, logs)
        pdf_bytes = admin_analytics.build_pdf_bytes(report)
        if not pdf_bytes:
            raise HTTPException(
                status_code=500,
                detail="PDF generation unavailable. Install reportlab and retry.",
            )
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={user_id}_report.pdf",
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF report: {str(e)}")

@app.get("/api/history/{user_id}")
async def get_session_history(user_id: str):
    """Get conversation history for a user"""
    if not engine:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    
    try:
        history = engine.get_session_history(user_id)
        return {
            "user_id": user_id,
            "interactions": history,
            "count": len(history)
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching history: {str(e)}"
        )

@app.get("/api/summary/{user_id}")
async def get_weekly_summary(user_id: str):
    """Get weekly summary for caregiver dashboard"""
    if not engine or not caregiver_builder:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    
    try:
        logs = engine.get_behavior_logs(user_id)
        summary = caregiver_builder.build_weekly_summary(user_id, logs)
        return summary
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating summary: {str(e)}"
        )

@app.get("/api/user/{user_id}")
async def get_user_profile(user_id: str):
    """Get user profile and settings"""
    if not engine:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    
    try:
        profile = engine.get_user_profile(user_id)
        return profile
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching profile: {str(e)}"
        )

@app.post("/api/caregiver-nudge/{user_id}")
async def get_caregiver_nudges(user_id: str):
    """Get daily caregiver nudges"""
    if not engine or not caregiver_builder:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    
    try:
        from datetime import datetime
        nudges = caregiver_builder.build_daily_nudges(user_id, datetime.now())
        return {"user_id": user_id, "nudges": nudges}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating nudges: {str(e)}"
        )

@app.get("/api/stats/{user_id}")
async def get_user_stats(user_id: str):
    """Get user interaction statistics"""
    if not engine:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    
    try:
        stats = engine.get_user_stats(user_id)
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching stats: {str(e)}"
        )


@app.get("/api/alzheimer-predict/{user_id}")
async def get_alzheimer_prediction(user_id: str):
    """Get Alzheimer risk prediction from recent user interactions."""
    if not engine:
        raise HTTPException(status_code=503, detail="Engine not initialized")

    try:
        return engine.get_alzheimer_prediction(user_id)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating Alzheimer prediction: {str(e)}"
        )


@app.post("/api/alzheimer-predict/{user_id}")
async def post_alzheimer_prediction(user_id: str, request: AlzheimerPredictionRequest):
    """Run Alzheimer risk prediction for provided text/cognitive inputs."""
    if not engine:
        raise HTTPException(status_code=503, detail="Engine not initialized")

    try:
        return engine.get_alzheimer_prediction(
            user_id=user_id,
            text=request.text,
            cognitive_data=request.cognitive_data,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating Alzheimer prediction: {str(e)}"
        )


@app.get("/api/parkinson-predict/{user_id}")
async def get_parkinson_prediction(user_id: str):
    """Get Parkinson risk prediction from recent user interactions."""
    if not engine:
        raise HTTPException(status_code=503, detail="Engine not initialized")

    try:
        return engine.get_parkinson_prediction(user_id)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating Parkinson prediction: {str(e)}"
        )


@app.post("/api/parkinson-predict/{user_id}")
async def post_parkinson_prediction(user_id: str, request: ParkinsonPredictionRequest):
    """Run Parkinson risk prediction for provided text/cognitive inputs."""
    if not engine:
        raise HTTPException(status_code=503, detail="Engine not initialized")

    try:
        return engine.get_parkinson_prediction(
            user_id=user_id,
            text=request.text,
            cognitive_data=request.cognitive_data,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating Parkinson prediction: {str(e)}"
        )

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "status": "error"}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle unexpected exceptions"""
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "status": "error"}
    )

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting ElderCare AI API Server...")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
