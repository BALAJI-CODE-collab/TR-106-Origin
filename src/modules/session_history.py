from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Dict, List

from src.security import DataProtector


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
        self.protector = DataProtector()
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

        encoded_turn = asdict(turn)
        encoded_turn["user_text"] = self.protector.encrypt_text(encoded_turn["user_text"])
        encoded_turn["assistant_text"] = self.protector.encrypt_text(encoded_turn["assistant_text"])
        turns.append(encoded_turn)
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
        output: List[SessionTurn] = []
        for turn in turns:
            if not isinstance(turn, dict):
                continue
            decoded = dict(turn)
            decoded["user_text"] = self.protector.decrypt_text(decoded.get("user_text", ""))
            decoded["assistant_text"] = self.protector.decrypt_text(decoded.get("assistant_text", ""))
            output.append(SessionTurn(**decoded))
        return output

    def get_session_history(self, user_id: str) -> List[SessionTurn]:
        """Return all turns for a user across all sessions in chronological order."""
        payload = self._load()
        sessions = payload.get("sessions", {})
        if not isinstance(sessions, dict):
            return []

        output: List[SessionTurn] = []
        prefix = f"{user_id}:"
        for key, turns in sessions.items():
            if not isinstance(key, str) or not key.startswith(prefix):
                continue
            if not isinstance(turns, list):
                continue

            for turn in turns:
                if not isinstance(turn, dict):
                    continue
                decoded = dict(turn)
                decoded["user_text"] = self.protector.decrypt_text(decoded.get("user_text", ""))
                decoded["assistant_text"] = self.protector.decrypt_text(decoded.get("assistant_text", ""))
                try:
                    output.append(SessionTurn(**decoded))
                except TypeError:
                    continue

        output.sort(key=lambda item: item.timestamp)
        return output
