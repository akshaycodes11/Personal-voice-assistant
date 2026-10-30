import re
import hashlib
import time
from typing import Tuple, List, Dict, Optional

# Rotating salt for anonymizing IP addresses in memory (resets on process start)
_PROCESS_SALT = f"voicebot-salt-{int(time.time())}"

# Common prompt injection patterns (direct & indirect)
DIRECT_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules|commands)",
    r"disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)",
    r"forget\s+(all\s+)?(previous|prior)\s+(instructions|prompts|context)",
    r"reveal\s+(your\s+)?(system\s+prompt|instructions|initial\s+prompt|source\s+code)",
    r"show\s+(me\s+)?(your\s+)?(system\s+prompt|hidden\s+prompt|developer\s+mode)",
    r"print\s+(your\s+)?(system\s+prompt|system\s+instructions|api\s*keys)",
    r"what\s+is\s+your\s+system\s+prompt",
    r"what\s+are\s+your\s+instructions",
    r"output\s+everything\s+above\s+this",
    r"repeat\s+the\s+text\s+above",
    r"you\s+are\s+now\s+in\s+(dan|developer|unrestricted|god)\s+mode",
    r"enable\s+(dan|developer|unrestricted)\s+mode",
    r"override\s+system\s+instructions",
    r"bypass\s+(safety|content|all)\s+filters",
]

INDIRECT_INJECTION_PATTERNS = [
    # Roleplay / persona hijack attempts
    r"(pretend|act|roleplay)\s+(to\s+be|as|like)\s+(someone\s+else|an?\s+evil|another\s+person|a\s+hacker|an?\s+ai|a\s+bot|a\s+different|unrestricted)",
    r"(pretend|act|roleplay)\s+.*instead\s+of\s+akshay",
    r"you\s+are\s+no\s+longer\s+akshay",
    r"stop\s+being\s+akshay",
    r"from\s+now\s+on\s+you\s+are\s+[a-z0-9_\-\s]{3,30}\s+instead",
    r"hypothetically\s+if\s+you\s+weren'?t\s+akshay",
    r"in\s+a\s+fictional\s+(story|universe|scenario|dialogue)\b.*(reveal|disclose|show|leak|output)\b.*(secret|system|prompt|instruction|key)",
    r"simulate\s+a\s+(terminal|bash|shell|command\s+prompt)",
    # Fake system / delimiter injections
    r"\[\s*system\s*:",
    r"\[\s*admin\s*:",
    r"<\s*system\s*>",
    r"</\s*untrusted_user_input\s*>",
    r"<\s*trusted_grounding_context\s*>",
    r"###\s*system\s*override",
    r"raw\s+system\s+message",
    # Secret extraction / credential harvesting
    r"(reveal|give|show|list)\s+(all\s+)?(api[_\s-]?keys?|secrets?|tokens?|passwords?)",
    r"what\s+is\s+the\s+(groq|gemini|openai)[_\s-]?api[_\s-]?key",
]

# Compile patterns for fast runtime matching
_COMPILED_DIRECT = [re.compile(p, re.IGNORECASE) for p in DIRECT_INJECTION_PATTERNS]
_COMPILED_INDIRECT = [re.compile(p, re.IGNORECASE) for p in INDIRECT_INJECTION_PATTERNS]

DEFENSIVE_FALLBACK_REPLY = (
    "I'm here as Akshay to discuss my background, AI systems, and engineering projects. "
    "Let's keep our conversation focused on that."
)


def hash_client_ip(ip_address: str, salt: Optional[str] = None) -> str:
    """Cryptographically anonymizes client IP addresses using SHA-256 and process salt.

    Never stores raw IP addresses in memory or logs.
    """
    effective_salt = salt or _PROCESS_SALT
    raw = f"{ip_address}::{effective_salt}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


def sanitize_untrusted_input(text: str, max_chars: int = 1500) -> str:
    """Sanitizes user input by stripping delimiter injection tokens and bounding length."""
    if not text:
        return ""

    # Truncate to maximum allowable characters to prevent prompt bloat / denial-of-service
    clean = text[:max_chars].strip()

    # Strip malicious delimiter breakout attempts
    clean = re.sub(r"<\s*/?\s*untrusted_user_input\s*>", " ", clean, flags=re.IGNORECASE)
    clean = re.sub(r"<\s*/?\s*trusted_grounding_context\s*>", " ", clean, flags=re.IGNORECASE)
    clean = re.sub(r"<\s*/?\s*system\s*>", " ", clean, flags=re.IGNORECASE)

    # Normalize excessive control characters
    clean = re.sub(r"[\r\t]+", " ", clean)
    clean = re.sub(r"\n{3,}", "\n\n", clean)

    return clean.strip()


def detect_prompt_injection(text: str) -> Tuple[bool, str]:
    """Detects both direct and indirect prompt injection attempts.

    Returns:
        (is_injection, reason)
    """
    if not text:
        return False, "ok"

    normalized = text.lower().strip()

    # 1. Direct instruction overrides
    for pattern in _COMPILED_DIRECT:
        if pattern.search(normalized):
            return True, "direct_instruction_override"

    # 2. Indirect injection / persona hijacking / delimiter spoofing
    for pattern in _COMPILED_INDIRECT:
        if pattern.search(normalized):
            return True, "indirect_persona_hijack"

    # 3. Delimiter evasion checks (e.g. attempting to close markdown tags or inject fake turns)
    if "system:" in normalized and any(kw in normalized for kw in ["instructions", "override", "developer mode"]):
        return True, "fake_system_delimiter"

    return False, "ok"


def sanitize_llm_output(output: str) -> str:
    """Guards against accidental secret leakage (API keys, tokens, or system schema)

    in the LLM completion before it is sent to the client.
    """
    if not output:
        return ""

    # Redact OpenAI, Groq, Gemini, and generic API keys if generated by accident
    sanitized = re.sub(r"sk-[a-zA-Z0-9_\-]{20,}", "[REDACTED_KEY]", output)
    sanitized = re.sub(r"gsk_[a-zA-Z0-9_\-]{20,}", "[REDACTED_KEY]", sanitized)
    sanitized = re.sub(r"AIzaSy[a-zA-Z0-9_\-]{20,}", "[REDACTED_KEY]", sanitized)

    # If the LLM leaked system meta-instructions, replace with defensive fallback
    leak_markers = [
        "you are the personal ai representation",
        "<trusted_grounding_context>",
        "rules: 1. speak naturally",
    ]
    if any(marker in sanitized.lower() for marker in leak_markers):
        return DEFENSIVE_FALLBACK_REPLY

    return sanitized

