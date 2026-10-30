import os
import time
from pathlib import Path
from collections import defaultdict
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables from .env or .env.local or .env.example
ROOT_DIR = Path(__file__).parent.parent
env_local_path = ROOT_DIR / ".env.local"
env_path = ROOT_DIR / ".env"
env_example_path = ROOT_DIR / ".env.example"

if env_local_path.exists():
    load_dotenv(dotenv_path=env_local_path)
elif env_path.exists():
    load_dotenv(dotenv_path=env_path)
elif env_example_path.exists():
    load_dotenv(dotenv_path=env_example_path)

from backend.models import ChatRequest, ChatResponse, PersonaConfig
from backend.persona import DEFAULT_PERSONA
from backend.ai_providers import get_voicebot_reply
from backend.security import hash_client_ip

app = FastAPI(
    title="Akshay's AI Voicebot API",
    description="Python FastAPI backend powering the interactive AI voice avatar for the 100x assessment.",
    version="1.0.0",
)

# Enable CORS for local Vite frontend (port 5173/3000) and any deployed domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

START_TIME = time.time()

# In-memory sliding window rate limiter with cryptographic IP hashing
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX_REQUESTS = 40  # requests per window
client_request_history = defaultdict(list)


@app.middleware("http")
async def security_and_rate_limit_middleware(request: Request, call_next):
    # 1. Privacy-first rate limiting: Hash client IP with process salt so raw IP is never held
    if request.url.path.startswith("/api/chat"):
        raw_ip = request.client.host if request.client else "127.0.0.1"
        client_hash = hash_client_ip(raw_ip)
        now = time.time()

        # Clean older entries and purge expired hashes from memory
        history = [t for t in client_request_history[client_hash] if now - t < RATE_LIMIT_WINDOW]
        if history:
            client_request_history[client_hash] = history
        else:
            client_request_history.pop(client_hash, None)

        if len(history) >= RATE_LIMIT_MAX_REQUESTS:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please slow down to preserve API quotas."}
            )
        client_request_history[client_hash].append(now)

    # 2. Process request
    response = await call_next(request)

    # 3. Inject standard security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


@app.get("/api/health")
async def health_check():
    has_openai = bool(os.getenv("OPENAI_API_KEY", "").strip())
    has_groq = bool(os.getenv("GROQ_API_KEY", "").strip())
    has_gemini = bool(os.getenv("GEMINI_API_KEY", "").strip())

    groq_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b").strip()
    gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()

    active_provider = (
        f"Groq ({groq_model})"
        if has_groq
        else f"Google Gemini ({gemini_model})"
        if has_gemini
        else "OpenAI GPT"
        if has_openai
        else "Local FastAPI Heuristic Engine (No key needed)"
    )

    return {
        "status": "ok",
        "uptime": round(time.time() - START_TIME, 2),
        "framework": "FastAPI (Python 3.11)",
        "activeProvider": active_provider,
        "capabilities": {
            "hasOpenAI": has_openai,
            "hasGroq": has_groq,
            "hasGemini": has_gemini,
            "hasFallback": True,
            "zeroSetup": True,
        },
    }


@app.get("/api/persona", response_model=PersonaConfig)
async def get_persona():
    """Returns the candidate's default persona profile and knowledge base."""
    return DEFAULT_PERSONA


@app.get("/api/privacy")
async def get_privacy_policy():
    """Returns the system's privacy policy, data retention bounds, and abuse controls."""
    return {
        "policy": "Ephemeral Zero-Storage Privacy Policy",
        "audioPersistence": "None. Speech-to-text (STT) and text-to-speech (TTS) occur entirely on-device inside the user's browser via the Web Speech API. Zero audio streams or audio files are recorded or uploaded to the server.",
        "transcriptPersistence": "None. Transcripts are evaluated in-memory during the duration of the HTTP request and are never written to any persistent database, logfile, or third-party tracking platform.",
        "ipAnonymization": "All rate limiting identifiers are cryptographically hashed using SHA-256 with rotating salts. Raw IP addresses are never saved.",
        "retentionLimit": "60 seconds in-memory TTL for rate-limiting bucket; 0 seconds for voice audio/chat transcripts.",
        "abuseControls": "40 requests/minute per hashed client bucket, max 2000 characters per message, max 40 history turns.",
    }


@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """Processes conversational messages and returns spoken-ready responses."""
    if not request.messages:
        raise HTTPException(status_code=400, detail="No messages provided in request")

    response = await get_voicebot_reply(request)
    return response


# Mount compiled React frontend from dist/ if it exists (enables 1-click single-port cloud deployment)
dist_dir = ROOT_DIR / "dist"
if dist_dir.exists():
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=dist_dir, html=True), name="frontend")
else:
    @app.get("/")
    async def root():
        return {
            "status": "online",
            "service": "AI Voicebot FastAPI Backend",
            "candidate": DEFAULT_PERSONA.name,
            "assessment": "100x Engineers",
            "docs": "/docs",
        }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    print(f"Starting FastAPI Voicebot server on http://127.0.0.1:{port}")
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True)
