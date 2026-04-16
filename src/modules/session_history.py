from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Dict, List


@dataclass
class SessionTurn:
    """Represents one conversation turn in a specific session."""

    user_id: str
    session_id: str
    timestamp: str
    user_text: str
    assistant_text: str
    emotion_label: str


class SessionHistoryStore:
    """Stores and retrieves conversation history grouped by session."""

    def __init__(self, history_path: str = "data/session_history.json") -> None:
        self.history_path = Path(history_path)
        self.history_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.history_path.exists():
            self.history_path.write_text(json.dumps({"sessions": {}}, indent=2), encoding="utf-8")

    def _load(self) -> Dict[str, object]:
        return json.loads(self.history_path.read_text(encoding="utf-8"))

    def _save(self, payload: Dict[str, object]) -> None:
        self.history_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def append_turn(self, turn: SessionTurn) -> None:
        payload = self._load()
        sessions = payload.setdefault("sessions", {})
        if not isinstance(sessions, dict):
            payload["sessions"] = {}
            sessions = payload["sessions"]

        key = f"{turn.user_id}:{turn.session_id}"
        turns = sessions.setdefault(key, [])
        if not isinstance(turns, list):
            sessions[key] = []
            turns = sessions[key]

        turns.append(asdict(turn))
        self._save(payload)

    def get_session(self, user_id: str, session_id: str) -> List[SessionTurn]:
        payload = self._load()
        sessions = payload.get("sessions", {})
        if not isinstance(sessions, dict):
            return []

        key = f"{user_id}:{session_id}"
        turns = sessions.get(key, [])
        if not isinstance(turns, list):
            return []
        return [SessionTurn(**turn) for turn in turns if isinstance(turn, dict)]
