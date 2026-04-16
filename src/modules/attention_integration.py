from __future__ import annotations

import math
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, List

from src.modules.behavior_logging import BehaviorLogRecord


EMOTION_RISK = {
    "happy": 0.1,
    "neutral": 0.3,
    "anxious": 0.7,
    "sad": 0.9,
}


@dataclass
class SelfAttentionResult:
    """Token-level salience over the current user utterance."""

    focus_terms: List[str]
    focus_score: float
    urgency_score: float
    risk_terms: List[str]


@dataclass
class TemporalAttentionResult:
    """Time-weighted behavior risk inferred from historical logs."""

    weighted_risk: float
    trend: str


@dataclass
class MultiModalAttentionResult:
    """Fused risk across emotion, speech, behavior, and memory signals."""

    fused_risk: float
    recommendation: str
    modality_scores: Dict[str, float]


class SelfAttention:
    """Computes lightweight self-attention over words to find salient terms."""

    TOKEN_RE = re.compile(r"[a-zA-Z']+")
    RISK_TERMS = {
        "help",
        "emergency",
        "fall",
        "pain",
        "dizzy",
        "chest",
        "breath",
        "fainted",
        "confused",
        "lost",
    }

    def analyze(self, text: str, emotion_label: str) -> SelfAttentionResult:
        tokens = [t.lower() for t in self.TOKEN_RE.findall(text)]
        if not tokens:
            return SelfAttentionResult(
                focus_terms=[],
                focus_score=0.0,
                urgency_score=0.0,
                risk_terms=[],
            )

        tf: Dict[str, int] = {}
        for token in tokens:
            tf[token] = tf.get(token, 0) + 1

        # Emotion risk subtly scales salience concentration for distress-heavy language.
        emotion_scale = 1.0 + (EMOTION_RISK.get(emotion_label, 0.3) - 0.3)
        scored = [(term, count * emotion_scale) for term, count in tf.items()]
        scored.sort(key=lambda item: item[1], reverse=True)

        top_terms = [term for term, _ in scored[:3]]
        max_score = scored[0][1] if scored else 0.0
        norm = max(1.0, len(tokens))
        focus_score = float(min(1.0, max_score / norm * 2.5))

        risk_terms = sorted({token for token in tokens if token in self.RISK_TERMS})
        urgency_score = min(
            1.0,
            (len(risk_terms) / 3.0)
            + (0.2 if emotion_label in {"anxious", "sad"} else 0.0),
        )

        return SelfAttentionResult(
            focus_terms=top_terms,
            focus_score=focus_score,
            urgency_score=float(urgency_score),
            risk_terms=risk_terms,
        )


class TemporalAttention:
    """Uses recency-weighted attention to track behavior changes over time."""

    def analyze(self, logs: List[BehaviorLogRecord], now: datetime | None = None) -> TemporalAttentionResult:
        if not logs:
            return TemporalAttentionResult(weighted_risk=0.0, trend="stable")

        current = now or datetime.now(timezone.utc)
        weighted_sum = 0.0
        weight_total = 0.0

        for record in logs[-120:]:
            ts = datetime.fromisoformat(record.timestamp)
            age_hours = max(0.0, (current - ts).total_seconds() / 3600.0)
            # Half-life style decay: recent behavior gets far higher attention.
            weight = math.exp(-age_hours / 24.0)

            risk = EMOTION_RISK.get(record.emotion_label, 0.3)
            if record.reminder_missed:
                risk = min(1.0, risk + 0.25)

            weighted_sum += weight * risk
            weight_total += weight

        if weight_total == 0:
            return TemporalAttentionResult(weighted_risk=0.0, trend="stable")

        weighted_risk = weighted_sum / weight_total

        trend = "stable"
        if weighted_risk >= 0.7:
            trend = "declining"
        elif weighted_risk <= 0.35:
            trend = "improving"

        return TemporalAttentionResult(weighted_risk=float(weighted_risk), trend=trend)


class MultiModalAttention:
    """Fuses modality-specific signals into a single decision-oriented risk score."""

    def fuse(
        self,
        emotion_score: float,
        temporal_risk: float,
        behavior_risk: float,
        memory_strength: float,
        speech_strength: float,
        focus_score: float = 0.0,
        urgency_score: float = 0.0,
        disease_intent: str = "none",
    ) -> MultiModalAttentionResult:
        # Weighted late fusion for explainable cross-modal decisioning.
        modality_scores = {
            "emotion": float(max(0.0, min(1.0, emotion_score))),
            "speech": float(max(0.0, min(1.0, speech_strength))),
            "behavior": float(max(0.0, min(1.0, behavior_risk))),
            "memory": float(max(0.0, min(1.0, memory_strength))),
            "temporal": float(max(0.0, min(1.0, temporal_risk))),
            "focus": float(max(0.0, min(1.0, focus_score))),
            "urgency": float(max(0.0, min(1.0, urgency_score))),
        }

        fused_risk = (
            modality_scores["emotion"] * 0.20
            + modality_scores["speech"] * 0.08
            + modality_scores["behavior"] * 0.27
            + modality_scores["memory"] * 0.11
            + modality_scores["temporal"] * 0.24
            + modality_scores["focus"] * 0.05
            + modality_scores["urgency"] * 0.05
        )

        if disease_intent in {"alzheimer", "parkinson"}:
            fused_risk = min(1.0, fused_risk + 0.04)

        recommendation = "normal_response"
        if modality_scores["urgency"] >= 0.75:
            recommendation = "alert_caregiver"
        elif fused_risk >= 0.72:
            recommendation = "alert_caregiver"
        elif fused_risk >= 0.5:
            recommendation = "supportive_followup"

        return MultiModalAttentionResult(
            fused_risk=float(fused_risk),
            recommendation=recommendation,
            modality_scores=modality_scores,
        )
