from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Dict, List

from src.modules.behavior_logging import BehaviorLogRecord
from src.modules.health_schedule import HealthScheduleManager
from src.modules.session_history import SessionHistoryStore


@dataclass
class CaregiverWeeklySummary:
    """Weekly summary metrics for caregivers and dashboard cards."""

    user_id: str
    total_interactions: int
    missed_reminders: int
    silence_period_hours: float
    frequent_emotions: Dict[str, int]
    top_concerns: List[str]


class CaregiverReportBuilder:
    """Builds daily nudges, weekly summaries, and dashboard-ready anomaly flags."""

    def __init__(
        self,
        schedule_manager: HealthScheduleManager,
        history_store: SessionHistoryStore,
    ) -> None:
        self.schedule_manager = schedule_manager
        self.history_store = history_store

    def build_daily_nudges(self, user_id: str, now: datetime | None = None) -> List[str]:
        current = now or datetime.now(timezone.utc)
        upcoming = self.schedule_manager.get_upcoming_items(user_id=user_id, now=current, within_hours=6)
        nudges: List[str] = []
        for item in upcoming:
            if item.category == "medications":
                nudges.append(f"Reminder: {item.title} is scheduled at {item.time}. Please stay on track.")
            elif item.category == "meals":
                nudges.append(f"Meal nudge: {item.title} comes up at {item.time}. Eat well and stay hydrated.")
            else:
                nudges.append(f"Activity nudge: {item.title} is planned for {item.time}. A gentle routine helps.")
        return nudges

    def build_weekly_summary(
        self,
        user_id: str,
        logs: List[BehaviorLogRecord],
        now: datetime | None = None,
    ) -> CaregiverWeeklySummary:
        current = now or datetime.now(timezone.utc)
        week_start = current - timedelta(days=7)
        week_logs = [log for log in logs if datetime.fromisoformat(log.timestamp) >= week_start]

        total_interactions = len(week_logs)
        missed_reminders = sum(1 for log in week_logs if log.reminder_missed)
        emotions = Counter(log.emotion_label for log in week_logs)

        silence_hours = self._longest_silence_hours(week_logs, current)
        concerns = self._top_concerns(week_logs, silence_hours, missed_reminders)

        return CaregiverWeeklySummary(
            user_id=user_id,
            total_interactions=total_interactions,
            missed_reminders=missed_reminders,
            silence_period_hours=round(silence_hours, 2),
            frequent_emotions=dict(emotions.most_common()),
            top_concerns=concerns,
        )

    def build_dashboard_flags(
        self,
        user_id: str,
        logs: List[BehaviorLogRecord],
        now: datetime | None = None,
    ) -> Dict[str, object]:
        current = now or datetime.now(timezone.utc)
        summary = self.build_weekly_summary(user_id=user_id, logs=logs, now=current)
        daily_nudges = self.build_daily_nudges(user_id=user_id, now=current)

        flags = {
            "user_id": user_id,
            "missed_medications": summary.missed_reminders,
            "unusual_silence_hours": summary.silence_period_hours,
            "frequent_emotions": summary.frequent_emotions,
            "nudges": daily_nudges,
            "alerts": [],
        }

        if summary.missed_reminders > 0:
            flags["alerts"].append("Missed medication or reminder detected")
        if summary.silence_period_hours >= 12:
            flags["alerts"].append("Unusual silence period detected")
        if any(emotion in summary.frequent_emotions for emotion in ("sad", "anxious")):
            flags["alerts"].append("Negative emotion trend detected")

        return flags

    def _longest_silence_hours(
        self,
        logs: List[BehaviorLogRecord],
        current: datetime,
    ) -> float:
        if not logs:
            return 0.0

        timestamps = sorted(datetime.fromisoformat(log.timestamp) for log in logs)
        max_gap = max((timestamps[i] - timestamps[i - 1]).total_seconds() / 3600 for i in range(1, len(timestamps))) if len(timestamps) > 1 else 0.0
        end_gap = (current - timestamps[-1]).total_seconds() / 3600
        return max(max_gap, end_gap)

    @staticmethod
    def _top_concerns(logs: List[BehaviorLogRecord], silence_hours: float, missed_reminders: int) -> List[str]:
        concerns: List[str] = []
        if missed_reminders:
            concerns.append(f"{missed_reminders} missed reminder(s) this week")
        if silence_hours >= 12:
            concerns.append(f"Longest silence period was {silence_hours:.1f} hours")
        if logs and logs[-1].emotion_label in {"sad", "anxious"}:
            concerns.append(f"Latest interaction shows {logs[-1].emotion_label} mood")
        return concerns
