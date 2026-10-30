# 🎙️ AI Voicebot Portfolio & Assessment (React + Vite + Tailwind CSS + FastAPI)

An interactive, voice-first digital persona web application built for the **100x Engineers Assessment**. This application serves as an authentic conversational avatar that answers interview and technical questions in real-time using natural speech as **Akshay Nayak**.

---

## 🏗️ Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│             React 18 + Vite + Tailwind CSS             │
│   (3D Voice Orb, STT / TTS, Hands-Free Auto-Listen)    │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP JSON (Proxied /api or Unified Static)
                            ▼
┌────────────────────────────────────────────────────────┐
│             Python FastAPI Backend Service             │
│  (Uvicorn, Rate Limiter, Prompt Guardrails, Pydantic)  │
├────────────────────────────────────────────────────────┤
│  ⚡ Groq API (openai/gpt-oss-20b - sub-second latency)  │
│  ✨ Google Gemini API (gemini-2.5-flash)               │
│  🧠 OpenAI API (gpt-4o-mini)                           │
│  🛡️ Local Knowledge Base Fallback Engine              │
└────────────────────────────────────────────────────────┘
```

---

## 🌟 Key Features & Engineering Highlights

1. **Modern Frontend (React 18 + Vite + Tailwind CSS)**:
   - Ultra-fast development with sub-50ms Hot Module Replacement (HMR).
   - Clean dark aesthetic, glowing 3D voice orb, and reactive audio waveforms.
   - Built-in Vite proxy automatically forwarding `/api` calls to the FastAPI backend.

2. **Python FastAPI Backend**:
   - Asynchronous Python web service with **FastAPI**, **Uvicorn**, and **Pydantic v2**.
   - Automatic interactive Swagger API docs at `/docs`.
   - Dedicated persona models, input length bounds, and voice-text sanitization.

3. **Universal Zero-Setup (Evaluator Friendly)**:
   - **No API keys required from evaluators**: Works 100% out-of-the-box on first launch.
   - Pre-loaded with `personal_profile.json` and 25 comprehensive Q&A interview pairs in `answer_examples.json`.
   - Resilient multi-tier fallback: Groq &rarr; Gemini &rarr; OpenAI &rarr; Local Semantic Engine.

4. **Robustness & Security**:
   - **Prompt Injection Defense**: Explicit adversarial guardrails preventing system prompt or credential leaks.
   - **Sliding-Window Rate Limiting**: In-memory rate limiting (max 40 requests/min per IP) to prevent API quota exhaustion.
   - **HTTP Security Headers**: Injected `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and `Referrer-Policy`.
   - **Payload Bounds**: Bounded message lengths (`Field(max_length=2000)`) and conversation history bounds to prevent buffer/context window attacks.

5. **Conversational Multi-Turn Memory**:
   - Maintains conversation history across follow-up questions (e.g., asking about retrieval quality after discussing the PlaceMux RAG assistant).
   - Future-looking vision questions answered from a personal and professional architectural leadership perspective.

6. **Full Two-Way Voice Interaction**:
   - **Speech-to-Text (STT)**: Web Speech recognition with dual silence detection (1.2s inactivity timer + browser completion handling).
   - **Text-to-Speech (TTS)**: Web Speech synthesis with automatic sentence chunking to prevent browser cutoff bugs.
   - **Hands-Free Auto-Listen**: Seamless conversational mode that automatically resumes listening after the bot answers.

7. **1-Click Assessment Prompts**:
   Instant prompt cards on the main screen to test core assessment questions:
   - 🌟 *What should we know about your life story in a few sentences?*
   - ⚡ *What's your #1 superpower?*
   - 📈 *What are the top 3 areas you'd like to grow in?*
   - 🎭 *What misconception do your coworkers have about you?*
   - 🚀 *How do you push your boundaries and limits?*
   - 🏆 *Where do you see yourself in next 5 years?*
   - 🛠️ *What did you build for the PlaceMux AI Evaluation System?*
   - 🛡️ *How did you architect the PlaceMux Support & Knowledge Chat Assistant?*

---

## 🚀 Quick Start (Local Development)

### 1. Start the FastAPI Backend
```bash
python run_backend.py
```
Backend runs on `http://127.0.0.1:8000` (Swagger docs at `http://127.0.0.1:8000/docs`).

### 2. Start the React Frontend
```bash
npm run dev
```
Open `http://localhost:5173` to test the voicebot.

### 3. Run Automated Test Suite
```bash
python -m backend.test_api
```

---

## 🌐 1-Click Cloud Deployment (Single URL)

The application supports unified static hosting: when `dist/` is built, FastAPI automatically serves the React UI and the API from the **same single port**, eliminating CORS and multi-domain configuration.

### Deploy to Render / Railway / Fly.io:
1. Push repository to GitHub.
2. In Render or Railway, create a new **Web Service**.
3. Set:
   - **Build Command**: `npm ci && npm run build && pip install -r requirements.txt`
   - **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
4. Set Environment Variables (in platform dashboard):
   - `GROQ_API_KEY`: your Groq API key
   - `GEMINI_API_KEY`: your Gemini API key
5. Once deployed, submit the generated URL.
