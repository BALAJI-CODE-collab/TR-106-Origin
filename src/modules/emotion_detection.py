from __future__ import annotations

from dataclasses import dataclass
from typing import Dict

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer


@dataclass
class EmotionResult:
    """Represents emotion inference output used by the response pipeline."""

    label: str
    score: float
    raw_scores: Dict[str, float]


class EmotionDetector:
    """Detects emotional tone from user text using VADER sentiment signals."""

    def __init__(self) -> None:
        self.analyzer = SentimentIntensityAnalyzer()

    def detect(self, text: str) -> EmotionResult:
        scores = self.analyzer.polarity_scores(text)
        compound = scores["compound"]

        # Map continuous sentiment to required care-focused emotion categories.
        if compound >= 0.35:
            label = "happy"
        elif compound <= -0.45:
            label = "sad"
        elif -0.45 < compound <= -0.1:
            label = "anxious"
        else:
            label = "neutral"

        return EmotionResult(label=label, score=compound, raw_scores=scores)
