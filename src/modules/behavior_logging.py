from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import List

from src.security import DataProtector


@dataclass
class BehaviorLogRecord:
    """Normalized interaction log entry for analytics and anomaly checks."""

    user_id: str
    timestamp: str
    user_text: str
    bot_response: str
    emotion_label: str
    emotion_score: float
    response_time_ms: float
    activity: str
    reminder_missed: bool
    session_id: str = "default"


class BehaviorLogger:
    """Appends timestamped interaction data to a JSON lines log file."""

    def __init__(self, log_path: str = "data/behavior_logs.jsonl") -> None:
        self.log_path = Path(log_path)
        self.log_path.parent.mkdir(parents=True, exist_ok=True)
        self.log_path.touch(exist_ok=True)
        self.protector = DataProtector()

    def log_interaction(self, record: BehaviorLogRecord) -> None:
        payload = asdict(record)
        payload["user_text"] = self.protector.encrypt_text(payload["user_text"])
        payload["bot_response"] = self.protector.encrypt_text(payload["bot_response"])
        with self.log_path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(payload) + "\n")

    def read_logs(self, user_id: str | None = None) -> List[BehaviorLogRecord]:
        output: List[BehaviorLogRecord] = []
        with self.log_path.open("r", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                payload = json.loads(line)
                if user_id is not None and payload["user_id"] != user_id:
                    continue
                payload["user_text"] = self.protector.decrypt_text(payload.get("user_text", ""))
                payload["bot_response"] = self.protector.decrypt_text(payload.get("bot_response", ""))
                output.append(BehaviorLogRecord(**payload))
        return output

    @staticmethod
    def make_record(
        user_id: str,
        user_text: str,
        bot_response: str,
        emotion_label: str,
        emotion_score: float,
        response_time_ms: float,
        activity: str,
        reminder_missed: bool,
        session_id: str = "default",
        timestamp: datetime | None = None,
    ) -> BehaviorLogRecord:
        return BehaviorLogRecord(
            user_id=user_id,
            timestamp=(timestamp or datetime.now(timezone.utc)).isoformat(),
            user_text=user_text,
            bot_response=bot_response,
            emotion_label=emotion_label,
            emotion_score=emotion_score,
            response_time_ms=response_time_ms,
            activity=activity,
            reminder_missed=reminder_missed,
            session_id=session_id,
        )
