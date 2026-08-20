"""
Praxium Suite — provider secrets vault (Settings → Integrations).

Stores platform-level third-party provider credentials (OpenRouter / Groq AI,
optional Anthropic, Resend email) in Mongo, encrypted at rest with a Fernet
key derived from JWT_SECRET. Environment variables remain a fallback so
existing deploys keep working: resolution order is vault → env.

Also keeps a small in-process cache so sync call sites (email_util) can read
the current value without an event loop. Async callers refresh via motor
(get_secret); sync callers refresh lazily through a dedicated pymongo client.
Both share the same cache + TTL, so at most one Mongo read per minute.
"""
from __future__ import annotations

import base64
import hashlib
import logging
import os
import time
from typing import Any, Callable, Optional

import requests as _requests
from cryptography.fernet import Fernet, InvalidToken
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

log = logging.getLogger("praxium.providers")

# provider id → env var fallback + metadata for the settings UI
# AI default is OpenRouter free (see ai_provider.py). Anthropic is optional.
PROVIDERS: dict[str, dict] = {
    "openrouter": {
        "label": "OpenRouter (free CoCounsel + Praxa AI)",
        "env": "OPENROUTER_API_KEY",
        "secret_field": "api_key",
        "extra_fields": [],
    },
    "groq": {
        "label": "Groq (free AI fallback)",
        "env": "GROQ_API_KEY",
        "secret_field": "api_key",
        "extra_fields": [],
    },
    "anthropic": {
        "label": "Anthropic (optional — set PRAXIUM_AI_ALLOW_ANTHROPIC=1)",
        "env": "ANTHROPIC_API_KEY",
        "secret_field": "api_key",
        "extra_fields": [],
    },
    "resend": {
        "label": "Resend (transactional email)",
        "env": "RESEND_API_KEY",
        "secret_field": "api_key",
        "extra_fields": ["email_from"],  # non-secret config stored alongside
    },
}

_CACHE: dict[str, Any] = {"at": 0.0, "values": {}, "extras": {}}
_CACHE_TTL_SECONDS = 60


def _fernet() -> Fernet:
    secret = os.environ.get("JWT_SECRET", "praxium-dev-secret")
    key = base64.urlsafe_b64encode(hashlib.sha256(secret.encode()).digest())
    return Fernet(key)


def _encrypt(value: str) -> str:
    return _fernet().encrypt(value.encode()).decode()


def _decrypt(token: str) -> Optional[str]:
    try:
        return _fernet().decrypt(token.encode()).decode()
    except (InvalidToken, Exception):
        log.error("provider secret decrypt failed (JWT_SECRET changed?)")
        return None


def _mask(value: str) -> str:
    if not value:
        return ""
    return f"…{value[-4:]}" if len(value) > 8 else "…"


async def refresh_cache(db) -> None:
    """Load all provider secrets from Mongo into the in-process cache."""
    values: dict[str, str] = {}
    extras: dict[str, dict] = {}
    async for doc in db.provider_secrets.find({}, {"_id": 0}):
        pid = doc.get("provider")
        if pid not in PROVIDERS:
            continue
        enc = doc.get("secret_enc")
        if enc:
            dec = _decrypt(enc)
            if dec:
                values[pid] = dec
        extras[pid] = {k: v for k, v in doc.items() if k in ("email_from",)}
    _CACHE["values"] = values
    _CACHE["extras"] = extras
    _CACHE["at"] = time.monotonic()


async def refresh_cache_if_stale(db) -> None:
    if time.monotonic() - _CACHE["at"] > _CACHE_TTL_SECONDS:
        try:
            await refresh_cache(db)
        except Exception:
            log.exception("provider secret cache refresh failed")
            _CACHE["at"] = time.monotonic()  # back off; env fallback still works


def _sync_refresh_if_stale() -> None:
    """Refresh the cache from Mongo without an event loop (pymongo).
    Used by sync call sites (email_util) — same cache/TTL as the async path."""
    if time.monotonic() - _CACHE["at"] <= _CACHE_TTL_SECONDS:
        return
    _CACHE["at"] = time.monotonic()  # set first so a failure backs off, env fallback still works
    try:
        from pymongo import MongoClient

        mongo_url = os.environ.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME")
        if not mongo_url or not db_name:
            return
        client = MongoClient(mongo_url, serverSelectionTimeoutMS=3000)
        values: dict[str, str] = {}
        extras: dict[str, dict] = {}
        for doc in client[db_name].provider_secrets.find({}, {"_id": 0}):
            pid = doc.get("provider")
            if pid not in PROVIDERS:
                continue
            enc = doc.get("secret_enc")
            if enc:
                dec = _decrypt(enc)
                if dec:
                    values[pid] = dec
            extras[pid] = {k: v for k, v in doc.items() if k in ("email_from",)}
        client.close()
        _CACHE["values"] = values
        _CACHE["extras"] = extras
    except Exception:
        log.exception("provider secret sync cache refresh failed")


def get_secret_cached(provider: str) -> str:
    """Sync accessor for the current secret: vault (cached) → env fallback."""
    _sync_refresh_if_stale()
    val = _CACHE["values"].get(provider, "")
    if val:
        return val
    env = PROVIDERS.get(provider, {}).get("env", "")
    return os.environ.get(env, "").strip() if env else ""


def get_extra_cached(provider: str, field: str) -> str:
    _sync_refresh_if_stale()
    return str(_CACHE["extras"].get(provider, {}).get(field, "") or "")


async def get_secret(db, provider: str) -> str:
    """Async accessor — refreshes the cache if stale, then resolves vault → env."""
    await refresh_cache_if_stale(db)
    return get_secret_cached(provider)


def _source(provider: str) -> str:
    if _CACHE["values"].get(provider):
        return "vault"
    env = PROVIDERS.get(provider, {}).get("env", "")
    if env and os.environ.get(env, "").strip():
        return "env"
    return "none"


class ProviderSecretIn(BaseModel):
    api_key: Optional[str] = None
    email_from: Optional[str] = None


async def _test_anthropic(api_key: str) -> tuple[bool, str]:
    try:
        import anthropic

        client = anthropic.AsyncAnthropic(api_key=api_key)
        resp = await client.messages.create(
            model="claude-opus-4-8",
            max_tokens=32,
            messages=[{"role": "user", "content": "Reply with the single word: ok"}],
        )
        text = "".join(b.text for b in resp.content if b.type == "text")
        return True, f"Claude responded: {text.strip()[:60]}"
    except Exception as e:  # noqa: BLE001
        return False, f"{type(e).__name__}: {e}"


def _test_openai_compat(api_key: str, *, base_url: str, model: str, label: str) -> tuple[bool, str]:
    try:
        resp = _requests.post(
            f"{base_url.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": model,
                "messages": [{"role": "user", "content": "Reply with the single word: ok"}],
                "max_tokens": 8,
            },
            timeout=30,
        )
        if resp.status_code >= 400:
            return False, f"{label} returned {resp.status_code}: {resp.text[:200]}"
        content = (
            ((resp.json().get("choices") or [{}])[0].get("message") or {}).get("content") or ""
        ).strip()
        return True, f"{label} responded: {content[:60] or 'ok'}"
    except Exception as e:  # noqa: BLE001
        return False, f"{type(e).__name__}: {e}"


def _test_resend(api_key: str) -> tuple[bool, str]:
    try:
        resp = _requests.get(
            "https://api.resend.com/domains",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=15,
        )
        if resp.status_code == 200:
            names = [d.get("name") for d in resp.json().get("data", [])]
            return True, f"Key valid. Verified domains: {', '.join(names) or 'none yet'}"
        return False, f"Resend returned {resp.status_code}: {resp.text[:200]}"
    except Exception as e:  # noqa: BLE001
        return False, f"{type(e).__name__}: {e}"


def register_provider_secret_routes(
    api: APIRouter,
    db: Any,
    get_current_user: Callable,
    require_permission: Callable,
    new_id: Callable[[], str],
    now_iso: Callable[[], str],
    log_audit: Callable,
) -> None:
    manage = require_permission("integrations.manage", get_current_user)
    read = require_permission("integrations.read", get_current_user)

    @api.get("/integrations/providers")
    async def list_providers(user=Depends(read)):
        await refresh_cache_if_stale(db)
        items = []
        for pid, meta in PROVIDERS.items():
            current = get_secret_cached(pid)
            item = {
                "provider": pid,
                "label": meta["label"],
                "configured": bool(current),
                "source": _source(pid),
                "masked_key": _mask(current),
                "env_var": meta["env"],
            }
            for f in meta["extra_fields"]:
                item[f] = get_extra_cached(pid, f)
            items.append(item)
        return {"items": items}

    @api.put("/integrations/providers/{provider}")
    async def set_provider(provider: str, body: ProviderSecretIn, user=Depends(manage)):
        if provider not in PROVIDERS:
            raise HTTPException(404, "Unknown provider")
        update: dict = {"provider": provider, "updated_at": now_iso(), "updated_by": user["id"]}
        if body.api_key is not None and body.api_key.strip():
            update["secret_enc"] = _encrypt(body.api_key.strip())
        if provider == "resend" and body.email_from is not None:
            update["email_from"] = body.email_from.strip()
        if len(update) <= 3:
            raise HTTPException(400, "Nothing to save")
        await db.provider_secrets.update_one(
            {"provider": provider}, {"$set": update}, upsert=True
        )
        await refresh_cache(db)
        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user["name"],
            action="provider_secret.updated",
            resource_type="provider_secret",
            resource_id=provider,
            detail={"provider": provider, "key_changed": "secret_enc" in update},
            new_id=new_id,
            now_iso=now_iso,
        )
        return {"ok": True, "provider": provider, "masked_key": _mask(get_secret_cached(provider))}

    @api.delete("/integrations/providers/{provider}")
    async def delete_provider(provider: str, user=Depends(manage)):
        if provider not in PROVIDERS:
            raise HTTPException(404, "Unknown provider")
        await db.provider_secrets.delete_one({"provider": provider})
        await refresh_cache(db)
        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user["name"],
            action="provider_secret.removed",
            resource_type="provider_secret",
            resource_id=provider,
            detail={"provider": provider},
            new_id=new_id,
            now_iso=now_iso,
        )
        return {"ok": True}

    @api.post("/integrations/providers/{provider}/test")
    async def test_provider(provider: str, user=Depends(manage)):
        if provider not in PROVIDERS:
            raise HTTPException(404, "Unknown provider")
        await refresh_cache_if_stale(db)
        key = get_secret_cached(provider)
        if not key:
            return {"ok": False, "detail": "No key configured (vault or env)."}
        if provider == "openrouter":
            ok, detail = _test_openai_compat(
                key,
                base_url="https://openrouter.ai/api/v1",
                model=os.environ.get("PRAXIUM_AI_MODEL", "meta-llama/llama-3.3-70b-instruct:free"),
                label="OpenRouter",
            )
        elif provider == "groq":
            ok, detail = _test_openai_compat(
                key,
                base_url="https://api.groq.com/openai/v1",
                model=os.environ.get("PRAXIUM_GROQ_MODEL", "llama-3.3-70b-versatile"),
                label="Groq",
            )
        elif provider == "anthropic":
            ok, detail = await _test_anthropic(key)
        elif provider == "resend":
            ok, detail = _test_resend(key)
        else:
            ok, detail = False, "No test available"
        return {"ok": ok, "detail": detail, "source": _source(provider)}
