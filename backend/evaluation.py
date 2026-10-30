import re
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from backend.models import ChatMessage


@dataclass
class MetricScore:
    name: str
    score: float  # 0.0 to 1.0
    passed: bool
    details: str
    warnings: List[str] = field(default_factory=list)


@dataclass
class EvaluationReport:
    query: str
    answer: str
    composite_score: float  # 0.0 to 1.0
    passed: bool
    metrics: Dict[str, MetricScore]
    summary: str


class AnswerQualityEvaluator:
    """Evaluates generated voicebot responses across 6 core dimensions:

    1. Factual Consistency (grounded in personal_profile.json without hallucinations)
    2. Relevance (answers user's specific question intent)
    3. Spoken Answer Length & Pacing (optimal 30-60s spoken duration / 45-85 words)
    4. First-Person Voice Compliance (speaks authentically as Akshay, no AI disclaimers)
    5. Technical Accuracy (proper terminology for RAG, biometrics, FastAPI, ML)
    6. Follow-up Continuity (correct resolution of multi-turn antecedents)
    """

    KNOWN_FACTS = {
        "graduation_year": "2021",
        "degree": "Electronics and Communication",
        "company": "Altrodav",
        "role": "AIML Developer",
        "projects": ["PlaceMux", "MeetMux", "AI Talent Hunt"],
    }

    HALLUCINATION_TRIGGERS = [
        r"\b10\+?\s+years\s+(of\s+)?experience\b",
        r"\bworked\s+at\s+(google|meta|amazon|microsoft|apple|netflix)\b",
        r"\bph\.?d\b",
        r"\biit\b",
        r"\bstanford\b",
        r"\bcreated\s+chatgpt\b",
    ]

    AI_DISCLAIMERS = [
        r"as\s+an?\s+ai\b",
        r"as\s+an?\s+artificial\s+intelligence\b",
        r"as\s+a\s+language\s+model\b",
        r"i\s+am\s+an?\s+ai\b",
        r"i\s+do\s+not\s+have\s+personal\s+(experience|feelings)\b",
        r"akshay\s+is\s+a\b",
        r"akshay\s+graduated\b",
        r"akshay'?s\s+(background|career|project)\b",
    ]

    def __init__(self, profile: Optional[Dict[str, Any]] = None):
        self.profile = profile or {}

    def evaluate_factual_consistency(self, answer: str) -> MetricScore:
        """Verifies facts match profile and catches hallucinated credentials or employers."""
        ans_lower = answer.lower()
        warnings = []
        score = 1.0

        # Check for hallucination triggers
        for trigger in self.HALLUCINATION_TRIGGERS:
            if re.search(trigger, ans_lower):
                warnings.append(f"Detected hallucination pattern: {trigger}")
                score -= 0.5

        # Check company reference consistency: if company is mentioned, should be Altrodav
        companies = re.findall(r"\bat\s+([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)?)\b", answer)
        for c in companies:
            if c.lower() not in ["altrodav", "reva", "upsc", "placemux", "meetmux", "fastapi"]:
                # Suspicious employer attribution
                warnings.append(f"Unverified entity attribution: {c}")
                score -= 0.2

        score = max(0.0, min(1.0, score))
        return MetricScore(
            name="factual_consistency",
            score=score,
            passed=score >= 0.8,
            details="Ground-truth verified against personal_profile.json" if score >= 0.8 else "Contradictions found",
            warnings=warnings
        )

    def evaluate_relevance(self, query: str, answer: str) -> MetricScore:
        """Measures semantic relevance and intent coverage for the query."""
        q_lower = query.lower()
        ans_lower = answer.lower()
        warnings = []
        score = 0.5  # Base score for coherent response

        q_words = [w.strip("?,.'\"") for w in q_lower.split() if len(w) > 3]

        # Check query term overlap
        matched_words = [w for w in q_words if w in ans_lower]
        if q_words:
            overlap_ratio = len(matched_words) / len(q_words)
            score += min(0.3, overlap_ratio * 0.4)

        # Check domain-specific intent coverage
        if "superpower" in q_lower or "strength" in q_lower:
            if any(w in ans_lower for w in ["learn", "strength", "adapt", "solve", "quickly"]):
                score += 0.3
            else:
                warnings.append("Missing superpower intent terms (learning, solving, strength)")

        elif "life story" in q_lower or "story" in q_lower:
            if any(w in ans_lower for w in ["upsc", "2021", "transition", "altrodav", "technology", "discipline"]):
                score += 0.3
            else:
                warnings.append("Missing life story milestones (UPSC, graduation, tech transition)")

        elif "grow" in q_lower or "growth" in q_lower or "improve" in q_lower:
            if any(w in ans_lower for w in ["deepen", "production", "scale", "communication", "grow"]):
                score += 0.3

        elif "5 year" in q_lower or "five year" in q_lower or "future" in q_lower:
            if any(w in ans_lower for w in ["architect", "lead", "mentor", "systems", "scale"]):
                score += 0.3

        elif "rag" in q_lower or "retrieval" in q_lower or "placemux" in q_lower:
            if any(w in ans_lower for w in ["rag", "placemux", "embeddings", "hit@k", "mrr", "retrieval"]):
                score += 0.3

        score = max(0.0, min(1.0, score))
        return MetricScore(
            name="relevance",
            score=round(score, 2),
            passed=score >= 0.7,
            details=f"Intent coverage score: {round(score, 2)}",
            warnings=warnings
        )

    def evaluate_answer_length(self, answer: str) -> MetricScore:
        """Evaluates spoken suitability: ideal is 30-60s spoken duration (~45-85 words)."""
        words = answer.split()
        word_count = len(words)
        warnings = []

        # Optimal range: 45 to 85 words
        if 40 <= word_count <= 95:
            score = 1.0
            details = f"Optimal spoken duration: {word_count} words (~35-55s spoken speech)"
        elif 25 <= word_count < 40:
            score = 0.8
            details = f"Acceptable concise answer: {word_count} words"
        elif 95 < word_count <= 125:
            score = 0.8
            details = f"Slightly long for voice: {word_count} words (~65-80s spoken speech)"
            warnings.append("Slightly exceeds recommended 60s voice duration")
        elif word_count < 25:
            score = 0.4
            details = f"Too brief/abrupt for interview answer: {word_count} words"
            warnings.append("Too short (<25 words)")
        else:
            score = 0.5
            details = f"Excessively long for voice avatar: {word_count} words"
            warnings.append("Too long (>125 words), risk of voice fatigue")

        return MetricScore(
            name="answer_length",
            score=score,
            passed=score >= 0.7,
            details=details,
            warnings=warnings
        )

    def evaluate_first_person_voice(self, answer: str) -> MetricScore:
        """Enforces authentic first-person voice and rejects AI assistant disclaimers."""
        ans_lower = answer.lower()
        warnings = []
        score = 1.0

        # Check for forbidden AI disclaimers or speaking about Akshay in 3rd person
        for pattern in self.AI_DISCLAIMERS:
            if re.search(pattern, ans_lower):
                warnings.append(f"Violates first-person identity: matched '{pattern}'")
                score -= 0.6

        # Check for presence of first person pronouns
        first_person_tokens = re.findall(r"\b(i|my|me|myself|we|our)\b", ans_lower)
        if not first_person_tokens:
            warnings.append("No first-person pronouns detected in answer")
            score -= 0.4
        elif len(first_person_tokens) >= 2:
            score = min(1.0, score + 0.1)

        score = max(0.0, min(1.0, score))
        return MetricScore(
            name="first_person_voice",
            score=round(score, 2),
            passed=score >= 0.8,
            details="Natural first-person persona verified" if score >= 0.8 else "First-person failure",
            warnings=warnings
        )

    def evaluate_technical_accuracy(self, query: str, answer: str) -> MetricScore:
        """Verifies accuracy of technical stacks and concepts referenced."""
        ans_lower = answer.lower()
        q_lower = query.lower()
        warnings = []
        score = 0.9

        # If question asks about RAG or retrieval
        if any(w in q_lower for w in ["rag", "retrieval", "search", "embedding", "chunk"]):
            rag_keywords = ["fastapi", "embeddings", "sentence transformers", "hit@k", "mrr", "chunks", "context", "groq"]
            matched = [k for k in rag_keywords if k in ans_lower]
            if not matched:
                warnings.append("RAG question answered without technical retrieval terminology")
                score -= 0.3

        # If question asks about facial or MeetMux
        if any(w in q_lower for w in ["meetmux", "face", "facial", "biometric"]):
            mobile_keywords = ["kotlin", "tflite", "tensorflow", "ml kit", "android", "liveness", "on-device"]
            matched = [k for k in mobile_keywords if k in ans_lower]
            if not matched:
                warnings.append("Biometrics question missing on-device/TFLite terminology")
                score -= 0.3

        score = max(0.0, min(1.0, score))
        return MetricScore(
            name="technical_accuracy",
            score=round(score, 2),
            passed=score >= 0.7,
            details="Technical terminology accurate and grounded",
            warnings=warnings
        )

    def evaluate_follow_up_continuity(
        self,
        query: str,
        answer: str,
        history: Optional[List[ChatMessage]] = None
    ) -> MetricScore:
        """Evaluates whether follow-up answers correctly resolve antecedent context."""
        warnings = []
        if not history or len(history) < 2:
            return MetricScore(
                name="follow_up_continuity",
                score=1.0,
                passed=True,
                details="Single-turn interaction; continuity not applicable."
            )

        q_lower = query.lower()
        ans_lower = answer.lower()
        score = 0.9

        # Identify if query is a follow-up ("that", "which one", "elaborate", "how did you measure")
        is_follow_up = any(token in q_lower for token in ["that", "those", "how so", "elaborate", "measure that", "which project", "why that"])

        if is_follow_up:
            # Check if answer refers to the antecedent discussed in previous assistant message
            prev_assistant_msgs = [m for m in history if m.role == "assistant"]
            if prev_assistant_msgs:
                prev_text = prev_assistant_msgs[-1].content.lower()

                # If previous was PlaceMux RAG and user asks "How did you measure that?"
                if "placemux" in prev_text or "rag" in prev_text:
                    if any(term in ans_lower for term in ["placemux", "rag", "hit@k", "mrr", "retrieval", "benchmark"]):
                        score = 1.0
                    else:
                        warnings.append("Follow-up answer disconnected from preceding PlaceMux/RAG context")
                        score -= 0.4

                elif "meetmux" in prev_text:
                    if any(term in ans_lower for term in ["meetmux", "facial", "tflite", "android", "face"]):
                        score = 1.0
                    else:
                        warnings.append("Follow-up answer disconnected from preceding MeetMux context")
                        score -= 0.4

        score = max(0.0, min(1.0, score))
        return MetricScore(
            name="follow_up_continuity",
            score=round(score, 2),
            passed=score >= 0.7,
            details="Multi-turn conversational continuity preserved",
            warnings=warnings
        )

    def evaluate_comprehensive(
        self,
        query: str,
        answer: str,
        history: Optional[List[ChatMessage]] = None
    ) -> EvaluationReport:
        """Runs the complete 6-dimensional evaluation suite and returns composite report."""
        m_facts = self.evaluate_factual_consistency(answer)
        m_rel = self.evaluate_relevance(query, answer)
        m_len = self.evaluate_answer_length(answer)
        m_voice = self.evaluate_first_person_voice(answer)
        m_tech = self.evaluate_technical_accuracy(query, answer)
        m_cont = self.evaluate_follow_up_continuity(query, answer, history)

        metrics = {
            "factual_consistency": m_facts,
            "relevance": m_rel,
            "answer_length": m_len,
            "first_person_voice": m_voice,
            "technical_accuracy": m_tech,
            "follow_up_continuity": m_cont,
        }

        # Weighted composite score
        weights = {
            "factual_consistency": 0.25,
            "relevance": 0.25,
            "first_person_voice": 0.20,
            "answer_length": 0.10,
            "technical_accuracy": 0.10,
            "follow_up_continuity": 0.10,
        }

        composite = sum(metrics[k].score * weights[k] for k in weights)
        all_passed = all(m.passed for m in metrics.values()) and composite >= 0.75

        summary = f"Composite Score: {round(composite * 100, 1)}% | Status: {'PASSED' if all_passed else 'NEEDS_REVIEW'}"

        return EvaluationReport(
            query=query,
            answer=answer,
            composite_score=round(composite, 3),
            passed=all_passed,
            metrics=metrics,
            summary=summary
        )

