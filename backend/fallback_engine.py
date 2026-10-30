import re
import json
from pathlib import Path
from typing import List, Dict
from backend.models import PersonaConfig
from backend.security import detect_prompt_injection, DEFENSIVE_FALLBACK_REPLY

DATA_DIR = Path(__file__).parent / "data"
ROOT_DIR = Path(__file__).parent.parent

EXAMPLES_PATHS = [
    DATA_DIR / "answer_examples.json",
    ROOT_DIR / "answer_examples.json",
]

ANSWER_EXAMPLES: List[Dict[str, str]] = []
for p in EXAMPLES_PATHS:
    if p.exists():
        try:
            with open(p, "r", encoding="utf-8") as f:
                ANSWER_EXAMPLES = json.load(f)
            break
        except Exception:
            continue


def sanitize_for_voice(text: str) -> str:
    """Strips markdown asterisks, hashes, backticks, bullet symbols, and emojis

    so that Text-to-Speech audio reads naturally without strange punctuation.
    """
    if not text:
        return ""

    # Normalize unicode spaces and dashes
    text = text.replace("\u202f", " ").replace("\u00a0", " ")
    text = text.replace("\u2011", "-").replace("\u2013", "-").replace("\u2014", "-")
    text = text.replace("\u2018", "'").replace("\u2019", "'").replace("\u201c", '"').replace("\u201d", '"')
    text = text.replace("\u2026", "...")

    # Remove markdown bold/italics
    cleaned = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    cleaned = re.sub(r"\*(.*?)\*", r"\1", cleaned)
    cleaned = re.sub(r"__(.*?)__", r"\1", cleaned)
    # Remove markdown headers (# Title)
    cleaned = re.sub(r"#+\s+", "", cleaned)
    # Remove backtick code blocks / inline code
    cleaned = re.sub(r"`{1,3}(.*?)`{1,3}", r"\1", cleaned)
    # Remove bullet list markers
    cleaned = re.sub(r"^\s*[-*+]\s+", "", cleaned, flags=re.MULTILINE)
    # Remove markdown links [title](url) -> title
    cleaned = re.sub(r"\[(.*?)\]\(.*?\)", r"\1", cleaned)
    # Remove URLs
    cleaned = re.sub(r"https?://\S+", "", cleaned)
    # Remove unusual non-spoken symbols/emojis
    cleaned = re.sub(r"[^\w\s.,?!'\"\-:;]", "", cleaned)
    # Normalize whitespaces
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


class KnowledgeRule:
    def __init__(
        self,
        keywords: List[str],
        phrases: List[str],
        answer: str,
    ):
        self.keywords = keywords
        self.phrases = phrases
        self.answer = answer


# Build rules from the answer examples
KNOWLEDGE_RULES: List[KnowledgeRule] = []

for item in ANSWER_EXAMPLES:
    category = item.get("category", "")
    question = item.get("question", "")
    answer = item.get("answer", "")

    keywords = [w.lower() for w in question.replace("?", "").replace("'", "").split() if len(w) > 3]
    if category:
        keywords.append(category.lower())

    phrases = [question.lower().replace("?", "").strip()]
    cat_lower = category.lower()

    if "superpower" in cat_lower or "superpower" in question.lower():
        phrases.extend(["what is your #1 superpower", "whats your #1 superpower", "#1 superpower", "superpower", "biggest strength", "what are you best at"])
        keywords.extend(["superpower", "strength", "super", "power", "best"])
    elif "life story" in cat_lower or "life story" in question.lower():
        phrases.extend(["life story", "tell me about your life story", "what should we know about your life story", "career journey", "upsc background", "your story"])
        keywords.extend(["story", "life", "journey", "upsc", "graduation", "2021"])
    elif "growth" in cat_lower:
        phrases.extend(["top 3 areas you'd like to grow in", "top 3 areas", "areas you want to grow", "growth areas", "three areas you want to improve"])
        keywords.extend(["growth", "improve", "areas", "grow"])
    elif "misconception" in cat_lower:
        phrases.extend(["what misconception do your coworkers have", "misconception coworkers have about you", "coworker misconception", "misconception"])
        keywords.extend(["misconception", "coworkers", "colleagues", "assume"])
    elif "limits" in cat_lower or "pushing limits" in cat_lower:
        phrases.extend(["how do you push your boundaries and limits", "push your boundaries", "push boundaries and limits", "pushing limits", "push limits"])
        keywords.extend(["boundaries", "limits", "push", "stretch"])
    elif "introduction" in cat_lower:
        phrases.extend(["tell me about yourself", "who are you", "introduce yourself", "about yourself"])
        keywords.extend(["background", "intro", "akshay", "yourself"])
    elif "evaluation" in cat_lower or "placemux evaluation" in cat_lower:
        phrases.extend(["placemux evaluation", "placemux ai evaluation system", "candidate assessment", "1-2 minutes evaluation"])
        keywords.extend(["placemux", "evaluation", "assessment", "ollama"])
    elif "rag" in cat_lower or "placemux rag" in cat_lower:
        phrases.extend(["placemux rag", "support assistant", "knowledge chat assistant", "rag assistant", "query rewriting"])
        keywords.extend(["rag", "retrieval", "groq", "transformers"])
    elif "meetmux" in cat_lower:
        phrases.extend(["meetmux", "facial verification", "face detection", "android project", "liveness"])
        keywords.extend(["meetmux", "facial", "face", "android", "tflite", "kotlin"])
    elif "talent hunt" in cat_lower or "talent" in cat_lower:
        phrases.extend(["ai talent hunt", "talent hunt", "candidate sourcing", "talent sourcing", "faiss search"])
        keywords.extend(["talent", "sourcing", "faiss", "gemini"])
    elif "pressure" in cat_lower:
        phrases.extend(["handle pressure", "tight deadlines", "under pressure"])
        keywords.extend(["pressure", "deadlines", "stress"])
    elif "hallucinations" in cat_lower:
        phrases.extend(["reduce hallucinations", "avoid hallucinations", "hallucination in rag", "guardrails"])
        keywords.extend(["hallucination", "hallucinations", "guardrails"])
    elif "metrics" in cat_lower or "evaluation" in cat_lower:
        phrases.extend(["measure rag retrieval", "rag metrics", "hit@k", "mrr", "retrieval quality"])
        keywords.extend(["metrics", "hit@k", "mrr", "retrieval"])
    elif "100x" in cat_lower or "motivation" in cat_lower:
        phrases.extend(["why 100x", "why join 100x", "why do you want to join 100x", "interested in joining 100x"])
        keywords.extend(["100x", "join", "team", "motivated"])
    elif "future" in cat_lower or "5 years" in question.lower() or "five years" in question.lower():
        phrases.extend(["where do you see yourself in next 5 years", "where do you see yourself in 5 years", "where do you see yourself in five years", "five years", "5 years", "next 5 years"])
        keywords.extend(["future", "years", "architect", "leading", "direction", "mentoring"])
    elif "career goals" in cat_lower or "goals" in cat_lower:
        phrases.extend(["what are your career goals", "career goals over the next few years", "career goals"])
        keywords.extend(["goals", "career", "trajectory", "aspirations"])

    KNOWLEDGE_RULES.append(KnowledgeRule(keywords=keywords, phrases=phrases, answer=answer))


def generate_fallback_response(query: str, persona: PersonaConfig) -> str:
    """Matches query against the authentic 25-category personal profile knowledge base."""
    normalized = query.lower().strip()

    # 0. Prompt injection / jailbreak guardrail
    is_inj, _ = detect_prompt_injection(query)
    if is_inj:
        return DEFENSIVE_FALLBACK_REPLY

    # 1. Greetings
    if any(g in normalized for g in ["hi", "hello", "hey", "greetings", "good morning", "good afternoon"]) and len(normalized.split()) <= 3:
        return sanitize_for_voice(
            f"Hey there, I'm {persona.name}! I'm an AIML Developer at Altrodav Technologies working on RAG, "
            "LLMs, and practical AI applications. Feel free to ask me anything about my life story, #1 superpower, "
            "projects, growth areas, or how I build."
        )

    # 2. Exact phrase matching across knowledge rules
    for rule in KNOWLEDGE_RULES:
        if any(phrase in normalized for phrase in rule.phrases):
            return sanitize_for_voice(rule.answer)

    # 3. Keyword density matching
    best_rule = None
    max_score = 0
    for rule in KNOWLEDGE_RULES:
        score = sum(1 for kw in rule.keywords if kw in normalized)
        if score > max_score:
            max_score = score
            best_rule = rule

    if best_rule and max_score > 0:
        return sanitize_for_voice(best_rule.answer)

    # 4. Default in-character answer grounded in personal_profile.json
    return sanitize_for_voice(
        f"I'm Akshay Nayak, an AIML Developer at Altrodav Technologies. My work focuses on practical AI systems "
        "like RAG assistants with guardrails, automated LLM evaluation pipelines, and mobile biometric verification. "
        "Feel free to ask about my life story, superpower, PlaceMux projects, growth areas, or how I push my boundaries."
    )
