from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List


class EscalationNotificationService:
    def __init__(self, event_log_path: str = "data/escalation_events.jsonl") -> None:
        self.event_log_path = Path(event_log_path)
        self.event_log_path.parent.mkdir(parents=True, exist_ok=True)
        self.event_log_path.touch(exist_ok=True)

    def send_escalation(
        self,
        resident_id: str,
        reason: str,
        symptoms: List[str],
        children_emails: List[str],
        guardian_emails: List[str],
    ) -> Dict[str, object]:
        recipients = sorted(set(children_emails + guardian_emails))
        payload = {
            "resident_id": resident_id,
            "reason": reason,
            "symptoms": symptoms,
            "recipients": recipients,
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "status": "sent",
        }
        with self.event_log_path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(payload) + "\n")
        return payload
