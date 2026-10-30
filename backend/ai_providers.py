import os
import time
import httpx
from typing import List
from backend.models import ChatRequest, ChatResponse, ChatMessage
from backend.persona import build_system_prompt, DEFAULT_PERSONA
from backend.fallback_engine import generate_fallback_response, sanitize_for_voice
from backend.security import (
    detect_prompt_injection,
    sanitize_untrusted_input,
    sanitize_llm_output,
    DEFENSIVE_FALLBACK_REPLY
)


def format_groq_messages(system_prompt: str, messages: List[ChatMessage]) -> List[dict]:
    """Formats full conversation history for Groq/OpenAI completions with delimiter isolation."""
    payload = [{"role": "system", "content": system_prompt}]
    for m in messages[-10:]:
        if m.role == "assistant":
            payload.append({"role": "assistant", "content": m.content})
        else:
            safe_user_text = sanitize_untrusted_input(m.content)
            # Wrap in untrusted tags to isolate from system instructions
            payload.append({
                "role": "user",
                "content": f"<untrusted_user_input>\n{safe_user_text}\n</untrusted_user_input>"
            })
    return payload


async def call_groq(api_key: str, system_prompt: str, messages: List[ChatMessage]) -> str:
    """Call Groq Cloud completions API with conversation history and fallback models."""
    configured_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b").strip()
    candidate_models = [configured_model, "openai/gpt-oss-20b", "openai/gpt-oss-120b", "llama-3.3-70b-versatile"]
    url = "https://api.groq.com/openai/v1/chat/completions"

    seen = set()
    models_to_try = [m for m in candidate_models if not (m in seen or seen.add(m))]
    formatted_messages = format_groq_messages(system_prompt, messages)

    last_error = None
    for model in models_to_try:
        payload = {
            "model": model,
            "messages": formatted_messages,
            "temperature": 0.7,
            "max_tokens": 400,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    url,
                    headers={
                        "Authorization": f"Bearer {api_key.strip()}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
                if res.status_code == 200:
                    data = res.json()
                    raw_text = data["choices"][0]["message"]["content"]
                    return sanitize_for_voice(raw_text)
                else:
                    last_error = f"{model} returned {res.status_code}: {res.text}"
        except Exception as e:
            last_error = str(e)

    raise RuntimeError(f"All Groq models failed. Last error: {last_error}")


async def call_gemini(api_key: str, system_prompt: str, messages: List[ChatMessage]) -> str:
    """Call Google Gemini REST API with conversation history."""
    configured_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
    candidate_models = [configured_model, "gemini-2.5-flash", "gemini-1.5-flash"]

    seen = set()
    models_to_try = [m for m in candidate_models if not (m in seen or seen.add(m))]

    # Format multi-turn conversation history for Gemini
    history_contents = []
    recent_messages = messages[-10:] if messages else []

    # If first turn in Gemini history, ensure system prompt is included
    for idx, m in enumerate(recent_messages):
        role = "model" if m.role == "assistant" else "user"
        if role == "assistant":
            text = m.content
        else:
            safe_user_text = sanitize_untrusted_input(m.content)
            text = f"<untrusted_user_input>\n{safe_user_text}\n</untrusted_user_input>"

        if idx == 0 and role == "user":
            text = f"{system_prompt}\n\n{text}"

        history_contents.append({
            "role": role,
            "parts": [{"text": text}]
        })

    if not history_contents:
        history_contents = [{
            "role": "user",
            "parts": [{"text": f"{system_prompt}\n\nHello!"}]
        }]

    last_error = None
    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key.strip()}"
        payload = {
            "contents": history_contents,
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 400,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                    return sanitize_for_voice(raw_text)
                else:
                    last_error = f"{model} returned {res.status_code}: {res.text}"
        except Exception as e:
            last_error = str(e)

    raise RuntimeError(f"All Gemini models failed. Last error: {last_error}")


async def call_openai(api_key: str, system_prompt: str, messages: List[ChatMessage]) -> str:
    """Call OpenAI ChatGPT completions API with conversation history."""
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()
    url = "https://api.openai.com/v1/chat/completions"
    formatted_messages = format_groq_messages(system_prompt, messages)

    payload = {
        "model": model,
        "messages": formatted_messages,
        "temperature": 0.7,
        "max_tokens": 400,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.post(
            url,
            headers={
                "Authorization": f"Bearer {api_key.strip()}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        res.raise_for_status()
        data = res.json()
        raw_text = data["choices"][0]["message"]["content"]
        return sanitize_for_voice(raw_text)


async def get_voicebot_reply(request: ChatRequest) -> ChatResponse:
    """Dispatches chat request across available providers with full conversation history."""
    start_time = time.time()
    persona = request.persona or DEFAULT_PERSONA

    # Extract latest user query
    user_messages = [m for m in request.messages if m.role == "user"]
    last_query = user_messages[-1].content if user_messages else "hello"

    # Multi-layer Prompt Injection Guardrail:
    # Treat user input as strictly untrusted and verify before dispatch
    is_injection, reason = detect_prompt_injection(last_query)
    if is_injection:
        return ChatResponse(
            reply=DEFENSIVE_FALLBACK_REPLY,
            providerUsed="Security Guardrail",
            latencyMs=round((time.time() - start_time) * 1000, 2),
            note=f"Adversarial defense triggered: {reason}",
        )

    # Build system prompt with isolated trusted knowledge and dynamic few-shot selection (2-3 max)
    system_prompt = build_system_prompt(persona, query=last_query, history=request.messages)

    # API keys
    groq_key = (os.getenv("GROQ_API_KEY") or "").strip()
    gemini_key = (os.getenv("GEMINI_API_KEY") or "").strip()
    openai_key = (request.customApiKey or os.getenv("OPENAI_API_KEY") or "").strip()

    # 1. Try Groq (Fastest inference ~300ms) with full conversation history
    if groq_key:
        try:
            reply = await call_groq(groq_key, system_prompt, request.messages)
            if reply:
                reply = sanitize_llm_output(reply)
                return ChatResponse(
                    reply=reply,
                    providerUsed="Groq (" + os.getenv("GROQ_MODEL", "openai/gpt-oss-20b").strip() + ")",
                    latencyMs=round((time.time() - start_time) * 1000, 2),
                )
        except Exception as e:
            print(f"[FastAPI] Groq error, falling back to Gemini/OpenAI: {e}")

    # 2. Try Gemini with conversation history
    if gemini_key:
        try:
            reply = await call_gemini(gemini_key, system_prompt, request.messages)
            if reply:
                reply = sanitize_llm_output(reply)
                return ChatResponse(
                    reply=reply,
                    providerUsed="Google Gemini (" + os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip() + ")",
                    latencyMs=round((time.time() - start_time) * 1000, 2),
                )
        except Exception as e:
            print(f"[FastAPI] Gemini error, falling back to OpenAI/Local: {e}")

    # 3. Try OpenAI with conversation history
    if openai_key:
        try:
            reply = await call_openai(openai_key, system_prompt, request.messages)
            if reply:
                reply = sanitize_llm_output(reply)
                return ChatResponse(
                    reply=reply,
                    providerUsed="OpenAI (" + os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip() + ")",
                    latencyMs=round((time.time() - start_time) * 1000, 2),
                )
        except Exception as e:
            print(f"[FastAPI] OpenAI error, falling back to Local Heuristic: {e}")

    # 4. Built-in Semantic Fallback Engine (Answers all questions accurately using answer_examples.json)
    fallback_text = generate_fallback_response(last_query, persona)
    fallback_text = sanitize_llm_output(fallback_text)
    return ChatResponse(
        reply=fallback_text,
        providerUsed="Local Knowledge Base Engine",
        latencyMs=round((time.time() - start_time) * 1000, 2),
        note="Served via persistent knowledge base fallback",
    )
