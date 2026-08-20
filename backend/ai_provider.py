"""
Praxium Suite — AI provider (CoCounsel + Praxa coach).

Default lane: **free** Groq chat (no Anthropic). Fallback OpenRouter `:free`
when a working OpenRouter key is set. Anthropic is opt-in only
(`PRAXIUM_AI_ALLOW_ANTHROPIC=1`).

Key resolution order:
  1. Groq — vault `groq` → `GROQ_API_KEY` (free tier)
  2. OpenRouter — vault `openrouter` → `OPENROUTER_API_KEY`
  3. Anthropic — only when PRAXIUM_AI_ALLOW_ANTHROPIC=1
     (vault `anthropic` → `ANTHROPIC_API_KEY` → legacy `EMERGENT_LLM_KEY`)

Streaming contract: async generator of text chunks — matches the frontend
streamAiChat() plain-text reader. Mid-stream failures emit "\\n\\n[Error: …]".
"""
from __future__ import annotations

import json
import logging
import os
from typing import Any, AsyncIterator, Optional

import httpx

from provider_secrets import get_secret

log = logging.getLogger("praxium.ai")

# Free default — Groq model currently available on this account's free tier.
# Override with PRAXIUM_GROQ_MODEL or GROQ_MODEL.
GROQ_FREE_MODEL = "qwen/qwen3.6-27b"
OPENROUTER_FREE_MODEL = "meta-llama/llama-3.3-70b-instruct:free"
ANTHROPIC_MODEL = os.environ.get("PRAXIUM_AI_ANTHROPIC_MODEL", "claude-sonnet-4-5-20250929")


def _allow_anthropic() -> bool:
    return os.environ.get("PRAXIUM_AI_ALLOW_ANTHROPIC", "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )


def _openrouter_model() -> str:
    return os.environ.get("PRAXIUM_AI_MODEL", OPENROUTER_FREE_MODEL).strip() or OPENROUTER_FREE_MODEL


def _groq_model() -> str:
    return (
        os.environ.get("PRAXIUM_GROQ_MODEL")
        or os.environ.get("GROQ_MODEL")
        or GROQ_FREE_MODEL
    ).strip() or GROQ_FREE_MODEL


async def resolve_ai_backend(db) -> tuple[str, str, dict[str, Any]]:
    """Returns (backend, key, opts). backend: groq | openrouter | anthropic | emergent | none."""
    groq_key = await get_secret(db, "groq") or os.environ.get("GROQ_API_KEY", "").strip()
    if groq_key:
        return (
            "groq",
            groq_key,
            {
                "model": _groq_model(),
                "base_url": "https://api.groq.com/openai/v1",
                "extra_headers": {},
            },
        )

    or_key = await get_secret(db, "openrouter") or os.environ.get("OPENROUTER_API_KEY", "").strip()
    if or_key:
        return (
            "openrouter",
            or_key,
            {
                "model": _openrouter_model(),
                "base_url": "https://openrouter.ai/api/v1",
                "extra_headers": {
                    "HTTP-Referer": os.environ.get("PRAXIUM_PUBLIC_URL", "https://www.praxiumlaw.com"),
                    "X-Title": "Praxium Suite",
                },
            },
        )

    if _allow_anthropic():
        key = await get_secret(db, "anthropic")
        if key:
            return "anthropic", key, {"model": ANTHROPIC_MODEL}
        env_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
        if env_key:
            return "anthropic", env_key, {"model": ANTHROPIC_MODEL}
        legacy = os.environ.get("EMERGENT_LLM_KEY", "").strip()
        if legacy:
            return "emergent", legacy, {}

    return "none", "", {}


async def stream_openai_compat(
    api_key: str,
    *,
    base_url: str,
    model: str,
    system: str,
    messages: list[dict],
    max_tokens: int = 2048,
    extra_headers: Optional[dict[str, str]] = None,
    extra_body: Optional[dict[str, Any]] = None,
) -> AsyncIterator[str]:
    """Stream text from an OpenAI-compatible /chat/completions endpoint."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        **(extra_headers or {}),
    }
    body = {
        "model": model,
        "messages": [{"role": "system", "content": system}, *messages],
        "stream": True,
        "max_tokens": max_tokens,
        **(extra_body or {}),
    }
    url = f"{base_url.rstrip('/')}/chat/completions"
    timeout = httpx.Timeout(60.0, connect=15.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        async with client.stream("POST", url, headers=headers, json=body) as resp:
            if resp.status_code >= 400:
                err_body = (await resp.aread()).decode("utf-8", errors="replace")[:400]
                yield f"[Error: AI provider HTTP {resp.status_code}: {err_body}]"
                return
            async for line in resp.aiter_lines():
                if not line:
                    continue
                if line.startswith("data: "):
                    data = line[6:].strip()
                elif line.startswith("data:"):
                    data = line[5:].strip()
                else:
                    continue
                if data == "[DONE]":
                    break
                try:
                    payload = json.loads(data)
                except json.JSONDecodeError:
                    continue
                choices = payload.get("choices") or []
                if not choices:
                    continue
                delta = choices[0].get("delta") or {}
                content = delta.get("content")
                if content:
                    yield content


async def stream_anthropic(
    api_key: str,
    system: str,
    messages: list[dict],
    max_tokens: int = 4096,
    model: str = ANTHROPIC_MODEL,
) -> AsyncIterator[str]:
    """Stream text from the Claude API (opt-in only)."""
    import anthropic

    client = anthropic.AsyncAnthropic(api_key=api_key)
    async with client.messages.stream(
        model=model,
        max_tokens=max_tokens,
        system=system,
        messages=messages,
    ) as stream:
        async for text in stream.text_stream:
            yield text


async def stream_emergent(
    api_key: str,
    system: str,
    message: str,
    session_id: str,
) -> AsyncIterator[str]:
    """Legacy Emergent Universal Key path (Emergent pods only)."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

    chat = LlmChat(api_key=api_key, session_id=session_id, system_message=system) \
        .with_model("anthropic", "claude-sonnet-4-5-20250929")
    async for ev in chat.stream_message(UserMessage(text=message)):
        if isinstance(ev, TextDelta):
            yield ev.content
        elif isinstance(ev, StreamDone):
            break


async def stream_ai_reply(
    db,
    *,
    system: str,
    message: str,
    history: Optional[list[dict]] = None,
    session_id: str = "",
    max_tokens: int = 2048,
) -> AsyncIterator[str]:
    """Unified streaming entry point for CoCounsel + Praxa coach."""
    backend, key, opts = await resolve_ai_backend(db)
    if backend == "none":
        yield (
            "[Error: AI is not configured. Set GROQ_API_KEY (free) on the API, "
            "or attach a Groq key under Settings → Integrations.]"
        )
        return

    msgs = [
        {"role": m["role"], "content": m["content"]}
        for m in (history or [])
        if m.get("role") in ("user", "assistant") and m.get("content")
    ]
    msgs.append({"role": "user", "content": message})

    try:
        if backend in ("openrouter", "groq"):
            async for chunk in stream_openai_compat(
                key,
                base_url=opts["base_url"],
                model=opts["model"],
                system=system,
                messages=msgs,
                max_tokens=max_tokens,
                extra_headers=opts.get("extra_headers") or {},
            ):
                yield chunk
        elif backend == "anthropic":
            async for chunk in stream_anthropic(
                key, system, msgs, max_tokens=max_tokens, model=opts.get("model", ANTHROPIC_MODEL)
            ):
                yield chunk
        else:
            async for chunk in stream_emergent(key, system, message, session_id):
                yield chunk
    except Exception as e:  # noqa: BLE001
        log.exception("AI stream failed (backend=%s)", backend)
        yield f"\n\n[Error: {e}]"
