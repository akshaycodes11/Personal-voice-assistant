import re
from typing import List, Dict, Any, Optional
from backend.models import ChatMessage


class FewShotSelector:
    """Lightweight relevance and category scorer for dynamic few-shot selection.

    Selects 2-3 highly relevant examples considering both the current query
    and multi-turn conversation context, preventing prompt bloat.
    """

    def __init__(self, examples: List[Dict[str, str]]):
        self.examples = examples
        self._preprocessed = self._index_examples(examples)

    def _index_examples(self, examples: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        indexed = []
        for ex in examples:
            cat = ex.get("category", "").lower()
            q = ex.get("question", "").lower()
            ans = ex.get("answer", "").lower()

            # Extract distinct meaningful words
            words = set(re.findall(r"\b[a-z0-9_]{3,}\b", f"{cat} {q}"))
            # Include special short tokens
            for token in ["ai", "ml", "5", "rag", "mrr", "k"]:
                if token in f"{cat} {q}":
                    words.add(token)

            indexed.append({
                "raw": ex,
                "category": cat,
                "question": q,
                "answer": ans,
                "words": words,
            })
        return indexed

    def select_examples(
        self,
        current_query: str,
        history: Optional[List[ChatMessage]] = None,
        max_examples: int = 3
    ) -> List[Dict[str, str]]:
        """Selects 2 to 3 top examples matching the current turn and prior context."""
        if not self._preprocessed:
            return []

        # 1. Normalize current query
        norm_query = current_query.lower().strip()
        norm_query_expanded = (
            norm_query
            .replace("5", "five 5")
            .replace("3", "three 3")
            .replace("#1", "number one #1 biggest")
        )
        query_tokens = set(re.findall(r"\b[a-z0-9_]{2,}\b", norm_query_expanded))

        # 2. Extract conversation context from history (for follow-ups like "How did you measure that?")
        context_tokens = set()
        if history:
            # Look at up to the last 4 turns
            recent = history[-4:]
            for msg in recent:
                content_lower = msg.content.lower()
                # Prioritize technical entity keywords from previous turns
                for entity in [
                    "placemux", "rag", "meetmux", "talent hunt", "evaluation", "hit@k", "mrr",
                    "ollama", "retrieval", "superpower", "growth", "misconception", "limits", "five years"
                ]:
                    if entity in content_lower:
                        context_tokens.update(entity.split())

        # 3. Score each candidate example
        scored = []
        for idx, item in enumerate(self._preprocessed):
            score = 0.0
            q_text = item["question"]
            cat_text = item["category"]
            words = item["words"]

            # Exact or phrase containment in question
            if norm_query in q_text or q_text in norm_query:
                score += 15.0

            # Direct token match with current query (weight: 3.5 per token)
            overlap = query_tokens.intersection(words)
            score += len(overlap) * 3.5

            # Category boost if query matches category words
            for token in query_tokens:
                if token in cat_text:
                    score += 4.0

            # Multi-turn context bonus for follow-ups (weight: 2.0 per matched context token)
            context_overlap = context_tokens.intersection(words)
            score += len(context_overlap) * 2.0

            # Special semantic affinities
            if any(term in norm_query for term in ["superpower", "biggest strength", "strength", "#1"]):
                if "superpower" in cat_text or "superpower" in q_text:
                    score += 12.0

            if any(term in norm_query for term in ["story", "background", "journey", "graduation", "upsc"]):
                if "life story" in cat_text or "life story" in q_text:
                    score += 12.0

            if any(term in norm_query for term in ["grow", "improvement", "improve", "weakness"]):
                if "growth" in cat_text:
                    score += 12.0

            if any(term in norm_query for term in ["misconception", "coworker", "assume", "colleague"]):
                if "misconception" in cat_text:
                    score += 12.0

            if any(term in norm_query for term in ["boundary", "limit", "challenge", "stretch"]):
                if "limits" in cat_text or "pushing" in cat_text:
                    score += 12.0

            if any(term in norm_query for term in ["5 year", "five year", "next 5", "future", "vision"]):
                if "future" in cat_text or "5 years" in q_text:
                    score += 15.0

            if any(term in norm_query for term in ["retrieval", "hit@k", "mrr", "metric", "measure"]):
                if "rag" in cat_text or "metric" in cat_text:
                    score += 10.0

            scored.append((score, idx, item["raw"]))

        # Sort descending by relevance score
        scored.sort(key=lambda x: x[0], reverse=True)

        # Filter candidates: only pick if score >= 3.0, up to max_examples (default 2 to 3)
        selected = [item[2] for item in scored if item[0] >= 3.0][:max_examples]

        # If no strong match (e.g. simple greeting or open query), provide 2 canonical style anchors
        if not selected:
            for item in self._preprocessed:
                if "superpower" in item["category"] or "rag" in item["category"]:
                    selected.append(item["raw"])
                    if len(selected) >= 2:
                        break

        # Strictly cap between 1 and 3 examples to prevent prompt token bloat
        return selected[:max_examples]

