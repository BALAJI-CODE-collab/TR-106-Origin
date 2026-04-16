from __future__ import annotations

import json
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import List

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


@dataclass
class MemoryItem:
    """A user-scoped memory record that can be retrieved by semantic similarity."""

    user_id: str
    text: str
    kind: str = "conversation"


class LongTermMemory:
    """JSON-backed vector memory with cosine similarity retrieval."""

    def __init__(self, db_path: str = "data/memory_db.json") -> None:
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.db_path.exists():
            self.db_path.write_text("[]", encoding="utf-8")

    def _load(self) -> List[MemoryItem]:
        payload = json.loads(self.db_path.read_text(encoding="utf-8"))
        return [MemoryItem(**item) for item in payload]

    def _save(self, items: List[MemoryItem]) -> None:
        serialized = [asdict(item) for item in items]
        self.db_path.write_text(json.dumps(serialized, indent=2), encoding="utf-8")

    def store_fact(self, user_id: str, text: str, kind: str = "fact") -> None:
        items = self._load()
        items.append(MemoryItem(user_id=user_id, text=text, kind=kind))
        self._save(items)

    def store_conversation(self, user_id: str, text: str) -> None:
        self.store_fact(user_id=user_id, text=text, kind="conversation")

    def retrieve_relevant(self, user_id: str, query: str, top_k: int = 3) -> List[MemoryItem]:
        candidates = [item for item in self._load() if item.user_id == user_id]
        if not candidates:
            return []

        corpus = [item.text for item in candidates]
        vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words="english")
        matrix = vectorizer.fit_transform(corpus + [query])
        query_vec = matrix[-1]
        memory_vecs = matrix[:-1]

        similarities = cosine_similarity(memory_vecs, query_vec).reshape(-1)
        ranked = sorted(
            zip(candidates, similarities), key=lambda pair: float(pair[1]), reverse=True
        )

        return [item for item, score in ranked[:top_k] if float(score) > 0.0]
