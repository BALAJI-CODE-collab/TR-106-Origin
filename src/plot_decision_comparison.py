from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

import matplotlib.pyplot as plt

from src.modules.advanced_anomaly_detection import AdvancedAnomalyDetector
from src.modules.behavior_logging import BehaviorLogRecord


def _make_record(ts: datetime, emotion_label: str, reminder_missed: bool) -> BehaviorLogRecord:
    return BehaviorLogRecord(
        user_id="elder_001",
        timestamp=ts.isoformat(),
        user_text="sample",
        bot_response="sample",
        emotion_label=emotion_label,
        emotion_score=0.0,
        response_time_ms=100.0,
        activity="graph_simulation",
        reminder_missed=reminder_missed,
        session_id="graph-session",
    )


def _build_day_records(
    day: datetime,
    interaction_count: int,
    missed_count: int,
    anxious_count: int,
    sad_count: int,
    happy_count: int,
) -> list[BehaviorLogRecord]:
    records: list[BehaviorLogRecord] = []
    for i in range(interaction_count):
        ts = day + timedelta(minutes=i * 10)
        reminder_missed = i < missed_count

        if i < sad_count:
            emotion = "sad"
        elif i < sad_count + anxious_count:
            emotion = "anxious"
        elif i < sad_count + anxious_count + happy_count:
            emotion = "happy"
        else:
            emotion = "neutral"

        records.append(_make_record(ts=ts, emotion_label=emotion, reminder_missed=reminder_missed))
    return records


def _baseline_records(start_day: datetime) -> list[BehaviorLogRecord]:
    rows: list[BehaviorLogRecord] = []
    baseline_days = [
        (6, 0, 0, 0, 1),
        (5, 0, 1, 0, 0),
        (7, 1, 0, 0, 1),
        (6, 0, 1, 0, 0),
        (5, 0, 0, 0, 0),
        (7, 1, 1, 0, 0),
        (6, 0, 0, 0, 1),
        (5, 0, 1, 0, 0),
    ]
    for d, (count, missed, anxious, sad, happy) in enumerate(baseline_days):
        rows.extend(
            _build_day_records(
                day=start_day + timedelta(days=d),
                interaction_count=count,
                missed_count=missed,
                anxious_count=anxious,
                sad_count=sad,
                happy_count=happy,
            )
        )
    return rows


def _evaluate_scenario(name: str, logs: list[BehaviorLogRecord]) -> tuple[str, int, int, float, float]:
    detector = AdvancedAnomalyDetector(z_threshold=2.0)
    result = detector.evaluate(logs)

    z_only = 0
    if result.z_scores:
        if result.z_scores.get("interaction_frequency", 0.0) <= -2.0:
            z_only = 1
        if result.z_scores.get("missed_reminders", 0.0) >= 2.0:
            z_only = 1
        if result.z_scores.get("emotion_risk", 0.0) >= 2.0:
            z_only = 1

    intelligent = 1 if result.is_anomaly else 0

    # Continuous risk score for clearer graph comparison.
    z_interaction = max(0.0, -result.z_scores.get("interaction_frequency", 0.0))
    z_missed = max(0.0, result.z_scores.get("missed_reminders", 0.0))
    z_emotion = max(0.0, result.z_scores.get("emotion_risk", 0.0))
    z_risk = max(z_interaction, z_missed, z_emotion)

    # Isolation Forest score is lower for more anomalous samples.
    iforest_risk = max(0.0, -result.iforest_score)
    intelligent_risk = z_risk + iforest_risk

    return name, z_only, intelligent, z_risk, intelligent_risk


def main() -> None:
    start = datetime.now(timezone.utc) - timedelta(days=9)
    baseline = _baseline_records(start)

    scenarios = [
        (
            "Severe behavior shift",
            _build_day_records(
                day=start + timedelta(days=8),
                interaction_count=2,
                missed_count=2,
                anxious_count=2,
                sad_count=0,
                happy_count=0,
            ),
        ),
        (
            "Subtle multivariate shift",
            _build_day_records(
                day=start + timedelta(days=8),
                interaction_count=5,
                missed_count=1,
                anxious_count=1,
                sad_count=0,
                happy_count=0,
            ),
        ),
        (
            "Emotion-heavy day",
            _build_day_records(
                day=start + timedelta(days=8),
                interaction_count=6,
                missed_count=0,
                anxious_count=1,
                sad_count=1,
                happy_count=0,
            ),
        ),
    ]

    rows = [_evaluate_scenario(name, baseline + day_records) for name, day_records in scenarios]

    labels = [r[0] for r in rows]
    normal_vals = [r[1] for r in rows]
    intelligent_vals = [r[2] for r in rows]
    normal_risk_vals = [r[3] for r in rows]
    intelligent_risk_vals = [r[4] for r in rows]

    x = list(range(len(labels)))
    width = 0.35

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5))

    ax1.bar([i - width / 2 for i in x], normal_vals, width=width, label="Normal (Z-score)")
    ax1.bar([i + width / 2 for i in x], intelligent_vals, width=width, label="Intelligent (Z + IF)")
    ax1.set_title("Binary Detection")
    ax1.set_ylabel("Anomaly Detected (0/1)")
    ax1.set_ylim(0, 1.2)
    ax1.set_xticks(x)
    ax1.set_xticklabels(labels, rotation=15, ha="right")
    ax1.legend()
    ax1.grid(axis="y", alpha=0.25)

    ax2.bar([i - width / 2 for i in x], normal_risk_vals, width=width, label="Normal Risk")
    ax2.bar([i + width / 2 for i in x], intelligent_risk_vals, width=width, label="Intelligent Risk")
    ax2.set_title("Continuous Risk Score")
    ax2.set_ylabel("Relative Risk")
    ax2.set_xticks(x)
    ax2.set_xticklabels(labels, rotation=15, ha="right")
    ax2.legend()
    ax2.grid(axis="y", alpha=0.25)

    output = Path("data/decision_mechanism_comparison.png")
    output.parent.mkdir(parents=True, exist_ok=True)
    plt.tight_layout()
    plt.savefig(output, dpi=150)

    print("Saved graph:", output)
    print("\nScenario Results")
    for name, normal, intelligent, normal_risk, intelligent_risk in rows:
        print(
            f"- {name}: normal={normal}, intelligent={intelligent}, "
            f"normal_risk={normal_risk:.3f}, intelligent_risk={intelligent_risk:.3f}"
        )


if __name__ == "__main__":
    main()
