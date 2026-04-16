from __future__ import annotations

import time
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List

from src.modules.advanced_anomaly_detection import AdvancedAnomalyDetector, AnomalyResult
from src.alzheimer_bridge import safe_evaluate_alzheimer
from src.modules.attention_integration import (
    MultiModalAttention,
    MultiModalAttentionResult,
    SelfAttention,
    TemporalAttention,
)
from src.modules.behavior_logging import BehaviorLogger
from src.modules.caregiver_reporting import CaregiverReportBuilder
from src.modules.emotion_detection import EmotionDetector
from src.modules.health_schedule import HealthScheduleManager
from src.modules.long_term_memory import LongTermMemory, MemoryItem
from src.modules.proactive_engagement import ProactiveEngagement
from src.modules.session_history import SessionHistoryStore, SessionTurn


@dataclass
class DecisionOutput:
    """Combined result returned by the central decision engine."""

    response: str
    emotion: Dict[str, Any]
    memory_hits: List[str]
    session_id: str
    upcoming_schedule: List[Dict[str, str]]
    attention: Dict[str, Any]
    caregiver_dashboard: Dict[str, Any]
    proactive_message: str
    anomaly_alert: Dict[str, Any]
    alzheimer_risk: Dict[str, Any]
    disease_assessment: Dict[str, Any]


class DecisionEngine:
    """Orchestrates emotion, memory, behavior, and anomaly modules."""

    def __init__(self) -> None:
        self.emotion_detector = EmotionDetector()
        self.memory = LongTermMemory()
        self.proactive = ProactiveEngagement(threshold_hours=6)
        self.logger = BehaviorLogger()
        self.schedule = HealthScheduleManager()
        self.session_history = SessionHistoryStore()
        self.report_builder = CaregiverReportBuilder(self.schedule, self.session_history)
        self.anomaly_detector = AdvancedAnomalyDetector(z_threshold=2.0)
        self.self_attention = SelfAttention()
        self.temporal_attention = TemporalAttention()
        self.multi_modal_attention = MultiModalAttention()

    def _adapt_tone(self, base_response: str, emotion_label: str) -> str:
        if emotion_label == "sad":
            return f"I am here with you. {base_response}"
        if emotion_label == "anxious":
            return f"Take a slow breath with me. {base_response}"
        if emotion_label == "happy":
            return f"That is lovely to hear. {base_response}"
        return base_response

    def _compose_memory_context(self, memories: List[MemoryItem]) -> str:
        if not memories:
            return ""
        snippets = "; ".join(item.text for item in memories[:2])
        return f" I remember: {snippets}."

    def _base_chatbot_response(self, user_text: str) -> str:
        lowered = user_text.lower()
        if "medicine" in lowered or "medication" in lowered:
            return "Let us check your medication reminders together."
        if "sad" in lowered or "worried" in lowered or "anxious" in lowered:
            return "I am here for you. Would you like a calming breathing exercise?"
        if "alzheimer" in lowered:
            return "I can run an Alzheimer risk screening from your voice interaction now."
        if "parkinson" in lowered:
            return "I can run a Parkinson symptom-risk screening from your voice interaction now."
        return "Thank you for sharing. How can I support you right now?"

    def _contains_any(self, text: str, words: List[str]) -> bool:
        return any(word in text for word in words)

    def _companion_response(self, user_text: str, user_id: str, now: datetime) -> str:
        lowered = user_text.lower().strip()
        compact = re.sub(r"\s+", " ", lowered)

        greetings = ["hi", "hello", "hey", "good morning", "good evening"]
        wellbeing = ["how are you", "how do you feel", "are you there"]
        schedule = ["schedule", "plan", "today", "what next", "reminder"]
        medication = ["medicine", "medication", "tablet", "pill", "dose"]
        food = ["food", "meal", "eat", "diet", "hungry", "drink"]
        exercise = ["walk", "exercise", "yoga", "stretch", "activity"]
        sleep = ["sleep", "insomnia", "nap", "tired"]
        emotion = ["sad", "anxious", "worried", "lonely", "upset", "afraid", "stress"]
        memory = ["forgot", "remember", "memory", "confused", "forget"]
        family = ["daughter", "son", "family", "grandchild", "friend", "visit"]
        safety = ["help", "emergency", "fall", "pain", "dizzy", "chest pain", "ambulance"]
        prayer = ["pray", "prayer", "spiritual", "god", "meditation"]
        fun = ["joke", "story", "song", "motivate", "motivation"]

        if self._contains_any(compact, safety):
            return (
                "Your safety comes first. If this feels urgent or severe, please contact a caregiver or emergency services now. "
                "I can stay with you while we do the next step calmly."
            )

        if self._contains_any(compact, greetings):
            return "I am here with you. Tell me what you need right now, and we will do it together step by step."

        if self._contains_any(compact, wellbeing):
            return "I am fully available for you. We can check your mood, schedule, reminders, or just have a friendly conversation."

        if self._contains_any(compact, schedule):
            upcoming = self.schedule.get_upcoming_items(user_id=user_id, now=now)
            if upcoming:
                first = upcoming[0]
                return f"Your next plan is {first.title} at {first.time}. Would you like me to walk you through the rest of your day?"
            return "I do not see a scheduled item right now. Would you like me to help create a reminder for today?"

        if self._contains_any(compact, medication):
            return "Let us handle medicines carefully. I can remind you on time and we can confirm each dose together."

        if self._contains_any(compact, food):
            return "For today, let us keep meals simple, light, and regular. I can remind you for water, meals, and medication timing."

        if self._contains_any(compact, exercise):
            return "A short, safe routine helps a lot. We can start with gentle stretches and a brief walk if you feel comfortable."

        if self._contains_any(compact, sleep):
            return "For better sleep, let us keep a calm routine: light dinner, less screen time, and a short breathing exercise before bed."

        if self._contains_any(compact, emotion):
            return "Thank you for sharing that. Let us take one slow breath together. I am here to support you and we can go one small step at a time."

        if self._contains_any(compact, memory):
            return "No problem, memory slips happen. I can repeat important points, set reminders, and keep a simple daily checklist for you."

        if self._contains_any(compact, family):
            return "That sounds meaningful. I can help you prepare a reminder before your family call or visit so you feel ready and relaxed."

        if self._contains_any(compact, prayer):
            return "That is a peaceful choice. We can take a quiet minute now for breathing, reflection, or prayer if you like."

        if self._contains_any(compact, fun):
            return "Let us keep your mind active and cheerful. I can start a light memory game or share a short motivational thought."

        if compact.endswith("?") or self._contains_any(compact, ["what", "why", "how", "when", "where"]):
            return (
                "That is a thoughtful question. I will help with a clear and simple answer, and if needed, we can break it into small steps together."
            )

        return (
            "I understand. I am your daily companion, and I can help with reminders, mood support, health routines, and conversation anytime."
        )

    def _detect_disease_intent(self, user_text: str) -> str:
        lowered = user_text.lower()
        if any(keyword in lowered for keyword in ["alzheimer", "alzheimers", "dementia"]):
            return "alzheimer"
        if any(keyword in lowered for keyword in ["parkinson", "parkinsons", "tremor", "rigidity"]):
            return "parkinson"
        return "none"

    def _evaluate_parkinson_proxy(self, text: str, cognitive_data: Dict[str, Any] | None = None) -> Dict[str, Any]:
        words = [w for w in text.lower().split() if w.strip()]
        unique_ratio = (len(set(words)) / len(words)) if words else 0.0
        pause_markers = text.count("...") + text.count("--")
        repetition_count = max(0, len(words) - len(set(words))) if words else 0
        gait_terms = sum(
            1
            for marker in ["tremor", "shaking", "stiff", "slow", "balance", "walk"]
            if marker in text.lower()
        )

        score = min(
            0.95,
            0.1
            + (0.28 if pause_markers >= 2 else 0.0)
            + min(0.25, repetition_count * 0.03)
            + (0.22 if unique_ratio < 0.45 else 0.0)
            + min(0.3, gait_terms * 0.08),
        )

        if cognitive_data and isinstance(cognitive_data, dict):
            speech_rate = cognitive_data.get("speech_rate")
            if isinstance(speech_rate, (int, float)) and speech_rate < 90:
                score = min(0.95, score + 0.1)

        risk_level = "low" if score < 0.35 else "moderate" if score < 0.65 else "high"
        confidence = min(0.9, 0.55 + (0.07 * gait_terms) + (0.05 if pause_markers > 0 else 0.0))

        return {
            "ok": True,
            "risk_score": {
                "risk_score": round(score, 3),
                "risk_level": risk_level,
                "confidence": round(confidence, 3),
                "features": {
                    "pause_markers": pause_markers,
                    "repetition_count": repetition_count,
                    "vocabulary_diversity": round(unique_ratio, 3),
                    "motor_term_hits": gait_terms,
                },
            },
            "error": None,
        }

    def process_interaction(
        self,
        user_id: str,
        user_text: str,
        base_chatbot_response: str | None = None,
        activity: str = "general_chat",
        reminder_missed: bool = False,
        session_id: str = "session-default",
        now: datetime | None = None,
        cognitive_data: Dict[str, Any] | None = None,
    ) -> DecisionOutput:
        started = time.perf_counter()
        current_time = now or datetime.now(timezone.utc)

        emotion = self.emotion_detector.detect(user_text)
        self_attention = self.self_attention.analyze(user_text, emotion.label)
        memories = self.memory.retrieve_relevant(user_id=user_id, query=user_text, top_k=3)
        upcoming_items = self.schedule.get_upcoming_items(user_id=user_id, now=current_time)

        response_seed = base_chatbot_response or self._companion_response(user_text, user_id, current_time)
        enriched = self._adapt_tone(response_seed, emotion.label)
        enriched += self._compose_memory_context(memories)
        if upcoming_items:
            first_item = upcoming_items[0]
            enriched += (
                f" Upcoming {first_item.category[:-1]} at {first_item.time}:"
                f" {first_item.title}."
            )

        self.memory.store_conversation(user_id=user_id, text=user_text)

        elapsed_ms = (time.perf_counter() - started) * 1000.0
        record = self.logger.make_record(
            user_id=user_id,
            user_text=user_text,
            bot_response=enriched,
            emotion_label=emotion.label,
            emotion_score=emotion.score,
            response_time_ms=elapsed_ms,
            activity=activity,
            reminder_missed=reminder_missed,
            session_id=session_id,
            timestamp=now,
        )
        self.logger.log_interaction(record)

        self.session_history.append_turn(
            SessionTurn(
                user_id=user_id,
                session_id=session_id,
                timestamp=record.timestamp,
                user_text=user_text,
                assistant_text=enriched,
                emotion_label=emotion.label,
            )
        )

        self.proactive.update_last_interaction(user_id=user_id, ts=now)
        proactive_result = self.proactive.check(user_id=user_id, now=now)

        user_logs = self.logger.read_logs(user_id=user_id)
        anomaly: AnomalyResult = self.anomaly_detector.evaluate(user_logs)
        temporal_attention = self.temporal_attention.analyze(user_logs, now=current_time)
        weekly_summary = self.report_builder.build_weekly_summary(user_id=user_id, logs=user_logs, now=current_time)
        daily_nudges = self.report_builder.build_daily_nudges(user_id=user_id, now=current_time)
        dashboard_flags = self.report_builder.build_dashboard_flags(user_id=user_id, logs=user_logs, now=current_time)

        behavior_risk = 1.0 if anomaly.is_anomaly else 0.25
        memory_strength = min(1.0, len(memories) / 3.0)
        speech_strength = min(1.0, max(0.0, len(user_text.strip()) / 60.0))
        attention_fusion: MultiModalAttentionResult = self.multi_modal_attention.fuse(
            emotion_score=abs(emotion.score),
            temporal_risk=temporal_attention.weighted_risk,
            behavior_risk=behavior_risk,
            memory_strength=memory_strength,
            speech_strength=speech_strength,
        )

        if attention_fusion.recommendation == "supportive_followup":
            enriched += " Would you like me to stay with you and talk a little more?"
        elif attention_fusion.recommendation == "alert_caregiver":
            if not anomaly.is_anomaly:
                anomaly.is_anomaly = True
                anomaly.reasons.append("Multi-modal attention flagged elevated risk")

        alzheimer_risk = safe_evaluate_alzheimer(user_text, cognitive_data or {})
        disease_intent = self._detect_disease_intent(user_text)
        parkinson_risk = self._evaluate_parkinson_proxy(user_text, cognitive_data)

        if disease_intent == "alzheimer":
            if alzheimer_risk.get("ok") and alzheimer_risk.get("risk_score"):
                risk = alzheimer_risk["risk_score"]
                enriched += (
                    f" Alzheimer screening indicates {risk.get('risk_level', 'unknown')} risk "
                    f"with score {risk.get('risk_score', 'n/a')}."
                )
            else:
                enriched += " I could not complete Alzheimer screening right now."

        if disease_intent == "parkinson":
            risk = parkinson_risk["risk_score"]
            enriched += (
                f" Parkinson screening indicates {risk.get('risk_level', 'unknown')} risk "
                f"with score {risk.get('risk_score', 'n/a')}."
            )

        return DecisionOutput(
            response=enriched,
            emotion={"label": emotion.label, "score": round(emotion.score, 3)},
            memory_hits=[item.text for item in memories],
            session_id=session_id,
            upcoming_schedule=[
                {"category": item.category, "title": item.title, "time": item.time}
                for item in upcoming_items
            ],
            attention={
                "self_attention": {
                    "focus_terms": self_attention.focus_terms,
                    "focus_score": round(self_attention.focus_score, 3),
                },
                "temporal_attention": {
                    "weighted_risk": round(temporal_attention.weighted_risk, 3),
                    "trend": temporal_attention.trend,
                },
                "multimodal_attention": {
                    "fused_risk": round(attention_fusion.fused_risk, 3),
                    "recommendation": attention_fusion.recommendation,
                    "modalities": {
                        k: round(v, 3) for k, v in attention_fusion.modality_scores.items()
                    },
                },
            },
            caregiver_dashboard={
                "daily_nudges": daily_nudges,
                "weekly_summary": {
                    "user_id": weekly_summary.user_id,
                    "total_interactions": weekly_summary.total_interactions,
                    "missed_reminders": weekly_summary.missed_reminders,
                    "silence_period_hours": weekly_summary.silence_period_hours,
                    "frequent_emotions": weekly_summary.frequent_emotions,
                    "top_concerns": weekly_summary.top_concerns,
                },
                "flags": dashboard_flags,
            },
            proactive_message=proactive_result.message,
            anomaly_alert={
                "is_anomaly": anomaly.is_anomaly,
                "reasons": anomaly.reasons,
                "z_scores": {k: round(v, 3) for k, v in anomaly.z_scores.items()},
                "iforest_outlier": anomaly.iforest_outlier,
                "iforest_score": round(anomaly.iforest_score, 4),
            },
            alzheimer_risk=alzheimer_risk,
            disease_assessment={
                "requested": disease_intent,
                "alzheimer": alzheimer_risk,
                "parkinson": parkinson_risk,
            },
        )

    def run_proactive_check(self, user_id: str, now: datetime | None = None) -> str:
        result = self.proactive.check(user_id=user_id, now=now)
        return result.message

    def get_session_history(self, user_id: str) -> List[Dict[str, Any]]:
        """Get session history for a user"""
        history = self.session_history.get_session_history(user_id)
        return [
            {
                "timestamp": turn.timestamp.isoformat() if hasattr(turn.timestamp, 'isoformat') else str(turn.timestamp),
                "user_text": turn.user_text,
                "assistant_response": turn.assistant_response,
                "emotion": turn.emotion if hasattr(turn, 'emotion') else None,
            }
            for turn in history
        ]

    def get_behavior_logs(self, user_id: str) -> List[Dict[str, Any]]:
        """Get behavior logs for a user"""
        logs = self.logger.read_logs(user_id)
        return logs

    def get_user_profile(self, user_id: str) -> Dict[str, Any]:
        """Get user profile information"""
        return {
            "user_id": user_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "modules": {
                "emotion_detection": True,
                "long_term_memory": True,
                "behavior_logging": True,
                "anomaly_detection": True,
                "caregiver_reporting": True,
                "attention_integration": True,
            }
        }

    def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Get user statistics"""
        logs = self.get_behavior_logs(user_id)
        history = self.get_session_history(user_id)
        
        emotion_counts = {}
        total_interactions = len(history)
        
        for log in logs:
            emotion = log.get("emotion_label", "unknown")
            emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
        
        return {
            "user_id": user_id,
            "total_interactions": total_interactions,
            "total_logs": len(logs),
            "emotion_distribution": emotion_counts,
            "last_interaction": history[-1]["timestamp"] if history else None,
        }
