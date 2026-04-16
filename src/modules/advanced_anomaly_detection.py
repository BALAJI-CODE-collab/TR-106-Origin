from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from statistics import mean, pstdev
from typing import Dict, List

import numpy as np
from sklearn.ensemble import IsolationForest

from src.modules.behavior_logging import BehaviorLogRecord


EMOTION_TO_RISK = {
    "happy": -0.5,
    "neutral": 0.0,
    "anxious": 0.7,
    "sad": 1.0,
}


@dataclass
class AnomalyResult:
    """Result of behavior anomaly scoring for dashboard alerting."""

    is_anomaly: bool
    z_scores: Dict[str, float]
    iforest_outlier: bool
    iforest_score: float
    reasons: List[str]


class AdvancedAnomalyDetector:
    """Builds daily behavior metrics and flags statistically unusual patterns."""

    def __init__(self, z_threshold: float = 2.0) -> None:
        self.z_threshold = z_threshold

    @staticmethod
    def _z_score(values: List[float]) -> float:
        if len(values) < 2:
            return 0.0

        mu = mean(values[:-1])
        sigma = pstdev(values[:-1])
        if sigma == 0:
            return 0.0
        return (values[-1] - mu) / sigma

    def evaluate(self, logs: List[BehaviorLogRecord]) -> AnomalyResult:
        if len(logs) < 2:
            return AnomalyResult(
                is_anomaly=False,
                z_scores={},
                iforest_outlier=False,
                iforest_score=0.0,
                reasons=[],
            )

        by_day: Dict[str, Dict[str, float]] = defaultdict(
            lambda: {
                "interaction_frequency": 0.0,
                "missed_reminders": 0.0,
                "emotion_risk": 0.0,
            }
        )

        for record in logs:
            day = datetime.fromisoformat(record.timestamp).date().isoformat()
            by_day[day]["interaction_frequency"] += 1.0
            by_day[day]["missed_reminders"] += 1.0 if record.reminder_missed else 0.0
            by_day[day]["emotion_risk"] += EMOTION_TO_RISK.get(record.emotion_label, 0.0)

        ordered_days = sorted(by_day.keys())
        if len(ordered_days) < 2:
            return AnomalyResult(
                is_anomaly=False,
                z_scores={},
                iforest_outlier=False,
                iforest_score=0.0,
                reasons=[],
            )

        metrics = {
            "interaction_frequency": [],
            "missed_reminders": [],
            "emotion_risk": [],
        }
        for day in ordered_days:
            for metric in metrics:
                metrics[metric].append(float(by_day[day][metric]))

        z_scores = {metric: self._z_score(series) for metric, series in metrics.items()}
        feature_rows = [
            [
                by_day[day]["interaction_frequency"],
                by_day[day]["missed_reminders"],
                by_day[day]["emotion_risk"],
            ]
            for day in ordered_days
        ]

        reasons: List[str] = []
        # Lower-than-normal interaction frequency is risky, so invert sign test.
        if z_scores["interaction_frequency"] <= -self.z_threshold:
            reasons.append("Interaction frequency dropped significantly")
        if z_scores["missed_reminders"] >= self.z_threshold:
            reasons.append("Missed reminders increased significantly")
        if z_scores["emotion_risk"] >= self.z_threshold:
            reasons.append("Negative emotion trend increased significantly")

        # Isolation Forest complements z-scores by detecting multivariate behavior shifts.
        iforest_outlier = False
        iforest_score = 0.0
        if len(feature_rows) >= 5:
            baseline = np.array(feature_rows[:-1], dtype=float)
            current = np.array(feature_rows[-1], dtype=float).reshape(1, -1)
            model = IsolationForest(
                n_estimators=200,
                contamination="auto",
                random_state=42,
            )
            model.fit(baseline)
            iforest_score = float(model.decision_function(current)[0])
            iforest_outlier = int(model.predict(current)[0]) == -1
            if iforest_outlier:
                reasons.append("Isolation Forest detected multivariate behavior anomaly")

        return AnomalyResult(
            is_anomaly=len(reasons) > 0,
            z_scores=z_scores,
            iforest_outlier=iforest_outlier,
            iforest_score=iforest_score,
            reasons=reasons,
        )
