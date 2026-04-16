from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

from src.decision_engine import DecisionEngine


if __name__ == "__main__":
    # Keep demo outputs deterministic by clearing previous run artifacts.
    for file_path in [Path("data/memory_db.json"), Path("data/behavior_logs.jsonl")]:
        if file_path.exists():
            file_path.unlink()

    engine = DecisionEngine()
    user_id = "elder_001"

    # Seed long-term memory facts for retrieval in later turns.
    engine.memory.store_fact(user_id, "Your name is Lakshmi.", kind="profile")
    engine.memory.store_fact(user_id, "You enjoy evening walks with your daughter Meera.", kind="habit")

    sample_inputs = [
        {
            "time": datetime.now(timezone.utc) - timedelta(days=2),
            "user_text": "I feel great today and had a nice breakfast.",
            "bot": "Would you like to hear your schedule for today?",
            "activity": "daily_checkin",
            "missed": False,
        },
        {
            "time": datetime.now(timezone.utc) - timedelta(days=1),
            "user_text": "I am worried because I forgot my medicine yesterday.",
            "bot": "Let us review your medication plan together.",
            "activity": "medication_support",
            "missed": True,
        },
        {
            "time": datetime.now(timezone.utc),
            "user_text": "My daughter will visit me after my evening walk.",
            "bot": "That sounds wonderful. Shall I set a reminder before the visit?",
            "activity": "social_update",
            "missed": False,
        },
    ]

    print("=== Sample Test Runs ===")
    for idx, payload in enumerate(sample_inputs, start=1):
        result = engine.process_interaction(
            user_id=user_id,
            user_text=payload["user_text"],
            base_chatbot_response=payload["bot"],
            activity=payload["activity"],
            reminder_missed=payload["missed"],
            now=payload["time"],
        )
        print(f"\nTest {idx}")
        print("Input:", payload["user_text"])
        print("Emotion:", result.emotion)
        print("Memory hits:", result.memory_hits)
        print("Attention:", result.attention)
        print("Caregiver dashboard:", result.caregiver_dashboard)
        print("Response:", result.response)
        print("Anomaly alert:", result.anomaly_alert)

    future_time = datetime.now(timezone.utc) + timedelta(hours=7)
    proactive_msg = engine.run_proactive_check(user_id=user_id, now=future_time)
    print("\n=== Proactive Check (7 hours idle) ===")
    print("Message:", proactive_msg or "No proactive trigger")
