"""
FastAPI backend server for ElderCare AI frontend integration
Provides REST API endpoints for the React frontend
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import sys
from pathlib import Path

# Add src directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from src.decision_engine import DecisionEngine
from src.llm_client import generate_llm_response, get_llm_status
from src.notification_service import EscalationNotificationService
from src.resident_registry import ResidentRegistry
from src.modules.caregiver_reporting import CaregiverReportBuilder

# Initialize FastAPI app
app = FastAPI(
    title="ElderCare AI API",
    description="Backend API for elderly care AI system",
    version="1.0.0"
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

@app.on_event("startup")
async def startup_event():
    """Initialize engine on startup"""
    global engine, caregiver_builder, resident_registry, notification_service
    engine = DecisionEngine()
    caregiver_builder = CaregiverReportBuilder(
        schedule_manager=engine.schedule,
        history_store=engine.session_history,
    )
    resident_registry = ResidentRegistry()
    notification_service = EscalationNotificationService()
    print("✅ ElderCare AI API initialized")

# Request/Response Models
class InteractionRequest(BaseModel):
    text: str
    user_id: str
    session_id: str
    cognitive_data: Optional[Dict[str, Any]] = None
    language: Optional[str] = 'ta'

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
    reminder_id: str = ""
    no_response_seconds: int = 0


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
            "I am here for you. Would you like a calming breathing exercise?",
            "I understand you are feeling down. Let us talk about it.",
            "You are not alone. How can I help you feel better?",
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
        "Thank you for sharing. How can I support you right now?",
        "I am listening. Tell me more.",
        "That is interesting. What else is on your mind?",
        "I am here to help. What do you need?",
        "Tell me how I can assist you today.",
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
        language = request.language or "ta"
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
