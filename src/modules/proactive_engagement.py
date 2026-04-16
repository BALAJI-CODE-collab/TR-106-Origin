from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Dict


@dataclass
class ProactiveResult:
    """Captures whether a check-in should be initiated by the system."""

    should_trigger: bool
    message: str
    hours_since_last_interaction: float


class ProactiveEngagement:
    """Tracks user activity gaps and generates friendly check-in prompts."""

    def __init__(self, threshold_hours: int = 6) -> None:
        self.threshold = timedelta(hours=threshold_hours)
        self.last_seen: Dict[str, datetime] = {}

    def update_last_interaction(self, user_id: str, ts: datetime | None = None) -> None:
        self.last_seen[user_id] = ts or datetime.now(timezone.utc)

    def check(self, user_id: str, now: datetime | None = None) -> ProactiveResult:
        current = now or datetime.now(timezone.utc)
        last = self.last_seen.get(user_id)

        if last is None:
            return ProactiveResult(
                should_trigger=False,
                message="",
                hours_since_last_interaction=0.0,
            )

        delta = current - last
        hours = delta.total_seconds() / 3600
        should_trigger = delta >= self.threshold

        msg = ""
        if should_trigger:
            msg = (
                "Hi there, I noticed we have not spoken in a while. "
                "How are you feeling today?"
            )

        return ProactiveResult(
            should_trigger=should_trigger,
            message=msg,
            hours_since_last_interaction=hours,
        )
