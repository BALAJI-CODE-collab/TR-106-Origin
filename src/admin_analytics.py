from __future__ import annotations

import json
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List

from src.modules.behavior_logging import BehaviorLogRecord


class AdminAnalyticsService:
    def __init__(self, base_dir: str = "data/admin_reports") -> None:
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self.snapshots_dir = self.base_dir / "resident_snapshots"
        self.snapshots_dir.mkdir(parents=True, exist_ok=True)
        self.alert_state_path = self.base_dir / "low_happiness_alert_state.json"
        if not self.alert_state_path.exists():
            self.alert_state_path.write_text("{}", encoding="utf-8")

    def _happiness_score(self, log: BehaviorLogRecord) -> float:
        label = (getattr(log, "emotion_label", "unknown") or "unknown").lower()
        base = {
            "happy": 85.0,
            "neutral": 55.0,
            "sad": 25.0,
            "anxious": 30.0,
            "angry": 20.0,
            "fear": 28.0,
            "unknown": 50.0,
        }.get(label, 50.0)
        raw_score = float(getattr(log, "emotion_score", 0.0) or 0.0)
        adjustment = max(-12.0, min(12.0, raw_score * 20.0))
        return round(max(0.0, min(100.0, base + adjustment)), 2)

    def _snapshot_path(self, resident_id: str) -> Path:
        safe_id = resident_id.replace("/", "_").replace("\\", "_")
        return self.snapshots_dir / f"{safe_id}.json"

    def _load_alert_state(self) -> Dict[str, str]:
        try:
            payload = json.loads(self.alert_state_path.read_text(encoding="utf-8"))
            if isinstance(payload, dict):
                return {str(k): str(v) for k, v in payload.items()}
        except Exception:
            pass
        return {}

    def _save_alert_state(self, state: Dict[str, str]) -> None:
        self.alert_state_path.write_text(json.dumps(state, indent=2), encoding="utf-8")

    def should_send_low_happiness_alert(self, resident_id: str, average_happiness: float) -> bool:
        if average_happiness >= 50.0:
            return False
        state = self._load_alert_state()
        today = datetime.now(timezone.utc).date().isoformat()
        if state.get(resident_id) == today:
            return False
        state[resident_id] = today
        self._save_alert_state(state)
        return True

    def build_resident_report(self, resident_id: str, logs: List[BehaviorLogRecord]) -> Dict[str, Any]:
        timeline: List[Dict[str, Any]] = []
        happy_times: List[str] = []
        unhappy_times: List[str] = []

        for log in logs:
            score = self._happiness_score(log)
            timestamp = str(getattr(log, "timestamp", ""))
            emotion = str(getattr(log, "emotion_label", "unknown") or "unknown")
            is_happy = score >= 50.0

            timeline.append(
                {
                    "timestamp": timestamp,
                    "emotion": emotion,
                    "happiness_score": score,
                    "is_happy": is_happy,
                }
            )
            if is_happy:
                happy_times.append(timestamp)
            else:
                unhappy_times.append(timestamp)

        avg_happiness = round(
            sum(item["happiness_score"] for item in timeline) / len(timeline), 2
        ) if timeline else 50.0

        report = {
            "resident_id": resident_id,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "total_interactions": len(timeline),
            "average_happiness": avg_happiness,
            "threshold": 50.0,
            "happy_times": happy_times[-50:],
            "unhappy_times": unhappy_times[-50:],
            "timeline": timeline[-200:],
            "status": "below_threshold" if avg_happiness < 50.0 else "stable",
        }

        snapshot_path = self._snapshot_path(resident_id)
        snapshot_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
        report["json_path"] = str(snapshot_path)
        return report

    def get_snapshot_path(self, resident_id: str) -> Path:
        return self._snapshot_path(resident_id)

    def build_pdf_bytes(self, report: Dict[str, Any]) -> bytes:
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.pdfgen import canvas
        except Exception:
            return self._build_fallback_pdf(report)

        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        y = height - 40

        pdf.setFont("Helvetica-Bold", 14)
        pdf.drawString(40, y, "Resident Mood Report")
        y -= 24

        pdf.setFont("Helvetica", 10)
        lines = [
            f"Resident ID: {report.get('resident_id', '')}",
            f"Generated At: {report.get('generated_at', '')}",
            f"Total Interactions: {report.get('total_interactions', 0)}",
            f"Average Happiness: {report.get('average_happiness', 0)}",
            f"Threshold: {report.get('threshold', 50)}",
            f"Status: {report.get('status', '')}",
            "",
            "Recent Timeline:",
        ]
        for line in lines:
            pdf.drawString(40, y, line)
            y -= 16

        for item in (report.get("timeline", [])[-25:]):
            row = (
                f"{item.get('timestamp', '')} | {item.get('emotion', '')} | "
                f"happiness={item.get('happiness_score', '')}"
            )
            if y < 50:
                pdf.showPage()
                pdf.setFont("Helvetica", 10)
                y = height - 40
            pdf.drawString(40, y, row[:115])
            y -= 14

        pdf.save()
        return buffer.getvalue()

    def _build_fallback_pdf(self, report: Dict[str, Any]) -> bytes:
        lines = [
            "Resident Mood Report",
            f"Resident ID: {report.get('resident_id', '')}",
            f"Generated At: {report.get('generated_at', '')}",
            f"Total Interactions: {report.get('total_interactions', 0)}",
            f"Average Happiness: {report.get('average_happiness', 0)}",
            f"Threshold: {report.get('threshold', 50)}",
            f"Status: {report.get('status', '')}",
            "",
            "Recent Timeline:",
        ]

        for item in (report.get("timeline", [])[-20:]):
            lines.append(
                f"{item.get('timestamp', '')} | {item.get('emotion', '')} | happiness={item.get('happiness_score', '')}"
            )

        def esc(text: str) -> str:
            return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

        stream_lines = ["BT", "/F1 10 Tf", "40 800 Td", "14 TL"]
        for line in lines:
            stream_lines.append(f"({esc(str(line))}) Tj")
            stream_lines.append("T*")
        stream_lines.append("ET")
        content_stream = "\n".join(stream_lines).encode("latin-1", errors="replace")

        objects: List[bytes] = []
        objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")
        objects.append(b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
        objects.append(
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>"
        )
        objects.append(
            b"<< /Length " + str(len(content_stream)).encode("ascii") + b" >>\nstream\n" + content_stream + b"\nendstream"
        )
        objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

        pdf = bytearray(b"%PDF-1.4\n")
        offsets = [0]
        for index, obj in enumerate(objects, start=1):
            offsets.append(len(pdf))
            pdf.extend(f"{index} 0 obj\n".encode("ascii"))
            pdf.extend(obj)
            pdf.extend(b"\nendobj\n")

        xref_start = len(pdf)
        pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
        pdf.extend(b"0000000000 65535 f \n")
        for off in offsets[1:]:
            pdf.extend(f"{off:010d} 00000 n \n".encode("ascii"))

        pdf.extend(
            f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_start}\n%%EOF\n".encode("ascii")
        )
        return bytes(pdf)