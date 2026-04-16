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

@app.on_event("startup")
async def startup_event():
    """Initialize engine on startup"""
    global engine, caregiver_builder
    engine = DecisionEngine()
    caregiver_builder = CaregiverReportBuilder()
    print("✅ ElderCare AI API initialized")

# Request/Response Models
class InteractionRequest(BaseModel):
    text: str
    user_id: str
    session_id: str
    cognitive_data: Optional[Dict[str, Any]] = None

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


def _base_chatbot_response(text: str) -> str:
    lowered = text.lower()
    if "medicine" in lowered or "medication" in lowered:
        return "Let us check your medication reminders together."
    if "sad" in lowered or "worried" in lowered or "anxious" in lowered:
        return "I am here for you. Would you like a calming breathing exercise?"
    if "alzheimer" in lowered:
        return "I can run an Alzheimer voice screening now."
    if "parkinson" in lowered:
        return "I can run a Parkinson voice screening now."
    return "Thank you for sharing. How can I support you right now?"

class HealthCheckResponse(BaseModel):
    status: str
    message: str
    version: str

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
        result = engine.process_interaction(
            user_id=request.user_id,
            user_text=request.text,
            base_chatbot_response=None,
            activity="api_chat",
            reminder_missed=False,
            session_id=request.session_id,
            cognitive_data=request.cognitive_data,
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
