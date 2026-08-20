"""
Praxium Suite — AI provider (CoCounsel + Praxa coach).

Native Anthropic API integration via the official `anthropic` SDK.
Key resolution: provider-secrets vault (Settings → Integrations) →
ANTHROPIC_API_KEY env → legacy EMERGENT_LLM_KEY (emergentintegrations,
only importable inside Emergent pods).

Streaming contract: an async generator of text chunks — matches the
frontend's streamAiChat() plain-text reader. On mid-stream failure a
"\n\n[Error: …]" chunk is emitted (existing client behavior).
"""
from __future__ import annotations

import logging
import os
from typing import AsyncIterator, Optional

from provider_secrets import get_secret

log = logging.getLogger("praxium.ai")

AI_MODEL = os.environ.get("PRAXIUM_AI_MODEL", "claude-opus-4-8")


async def resolve_ai_backend(db) -> tuple[str, str]:
    """Returns (backend, key): ("anthropic", key) | ("emergent", key) | ("none", "")."""
    key = await get_secret(db, "anthropic")
    if key:
        return "anthropic", key
    env_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if env_key:
        return "anthropic", env_key
    legacy = os.environ.get("EMERGENT_LLM_KEY", "").strip()
    if legacy:
        return "emergent", legacy
    return "none", ""


async def stream_anthropic(
    api_key: str,
    system: str,
    messages: list[dict],
    max_tokens: int = 4096,
) -> AsyncIterator[str]:
    """Stream text from the Claude API. `messages` are {role, content} dicts."""
    import anthropic

    client = anthropic.AsyncAnthropic(api_key=api_key)
    async with client.messages.stream(
        model=AI_MODEL,
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
    max_tokens: int = 4096,
) -> AsyncIterator[str]:
    """Unified streaming entry point. `history` is prior {role, content} turns
    (anthropic backend only — the legacy path is single-turn)."""
    backend, key = await resolve_ai_backend(db)
    if backend == "none":
        yield (
            "[Error: AI is not configured. An admin can attach an Anthropic API key "
            "under Settings → Integrations.]"
        )
        return

    try:
        if backend == "anthropic":
            msgs = [
                {"role": m["role"], "content": m["content"]}
                for m in (history or [])
                if m.get("role") in ("user", "assistant") and m.get("content")
            ]
            msgs.append({"role": "user", "content": message})
            async for chunk in stream_anthropic(key, system, msgs, max_tokens=max_tokens):
                yield chunk
        else:
            async for chunk in stream_emergent(key, system, message, session_id):
                yield chunk
    except Exception as e:  # noqa: BLE001
        log.exception("AI stream failed (backend=%s)", backend)
        yield f"\n\n[Error: {e}]"
