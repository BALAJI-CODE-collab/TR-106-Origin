from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List


@dataclass
class ScheduleItem:
    """Single caregiver-configured health task."""

    category: str
    title: str
    time: str


class HealthScheduleManager:
    """Loads caregiver-entered schedule and returns upcoming items."""

    def __init__(self, schedule_path: str = "data/health_schedule.json") -> None:
        self.schedule_path = Path(schedule_path)
        self.schedule_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.schedule_path.exists():
            self.schedule_path.write_text(json.dumps({"users": {}}, indent=2), encoding="utf-8")

    def _load(self) -> Dict[str, object]:
        return json.loads(self.schedule_path.read_text(encoding="utf-8"))

    def get_user_schedule(self, user_id: str) -> Dict[str, List[Dict[str, str]]]:
        payload = self._load()
        users = payload.get("users", {})
        user_schedule = users.get(user_id, {}) if isinstance(users, dict) else {}
        return user_schedule if isinstance(user_schedule, dict) else {}

    def get_upcoming_items(
        self,
        user_id: str,
        now: datetime,
        within_hours: int = 4,
    ) -> List[ScheduleItem]:
        schedule = self.get_user_schedule(user_id)
        if not schedule:
            return []

        current = now
        end = now + timedelta(hours=within_hours)
        current_minutes = current.hour * 60 + current.minute
        end_minutes = end.hour * 60 + end.minute

        results: List[ScheduleItem] = []
        for category in ["medications", "meals", "exercises"]:
            entries = schedule.get(category, [])
            if not isinstance(entries, list):
                continue

            for entry in entries:
                if not isinstance(entry, dict):
                    continue
                time_str = str(entry.get("time", "")).strip()
                title = str(entry.get("title", "")).strip()
                if not time_str or not title:
                    continue
                try:
                    hour, minute = [int(part) for part in time_str.split(":", maxsplit=1)]
                except ValueError:
                    continue

                item_minutes = hour * 60 + minute
                in_window = current_minutes <= item_minutes <= end_minutes
                if end_minutes < current_minutes:
                    in_window = item_minutes >= current_minutes or item_minutes <= end_minutes

                if in_window:
                    results.append(ScheduleItem(category=category, title=title, time=time_str))

        return sorted(results, key=lambda item: item.time)
