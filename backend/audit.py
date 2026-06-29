"""
Praxium Suite — immutable audit log (saas-audit-log playbook v1).

Append-only audit_events collection with per-firm hash chain.
"""
from __future__ import annotations

import hashlib
import json
from typing import Any, Callable, Optional

from fastapi import APIRouter, Depends, Request

GENESIS_HASH = "sha256:GENESIS"


def _canonical(event: dict) -> bytes:
    """Deterministic JSON for hashing. Excludes hash and Mongo _id."""
    e = {k: v for k, v in event.items() if k not in ("_id", "hash")}
    return json.dumps(e, sort_keys=True, separators=(",", ":"), default=str).encode()


def hash_event(event: dict) -> str:
    return "sha256:" + hashlib.sha256(_canonical(event)).hexdigest()


def _client_ip(request: Optional[Request]) -> Optional[str]:
    if not request:
        return None
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


async def log_audit(
    db: Any,
    *,
    firm_id: str,
    actor_id: str,
    actor_name: str,
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    detail: Optional[dict] = None,
    outcome: str = "success",
    new_id: Callable[[], str],
    now_iso: Callable[[], str],
    request: Optional[Request] = None,
    actor_email: Optional[str] = None,
) -> None:
    """Append one audit event with hash chain (per firm_id)."""
    prev = await db.audit_events.find_one({"firm_id": firm_id}, sort=[("created_at", -1)])
    prev_hash = (prev or {}).get("hash", GENESIS_HASH)

    created_at = now_iso()
    event_id = new_id()
    meta = detail or {}

    actor = {
        "kind": "user" if actor_id not in ("_anonymous", "_system") else "system",
        "id": actor_id,
        "name": actor_name,
    }
    if actor_email:
        actor["email"] = actor_email

    subject = {
        "kind": resource_type,
        "id": resource_id,
    }

    event = {
        "id": event_id,
        "firm_id": firm_id,
        "ts": created_at,
        "created_at": created_at,
        "actor_id": actor_id,
        "actor_name": actor_name,
        "actor": actor,
        "subject": subject,
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "detail": meta,
        "meta": meta,
        "outcome": outcome,
        "ip": _client_ip(request),
        "user_agent": request.headers.get("user-agent") if request else None,
        "prev_hash": prev_hash,
    }
    event["hash"] = hash_event(event)
    await db.audit_events.insert_one(event)


async def verify_chain(db: Any, firm_id: str) -> dict:
    """Verify per-firm hash chain integrity."""
    cursor = db.audit_events.find({"firm_id": firm_id}).sort("created_at", 1)
    expected_prev = GENESIS_HASH
    broken = []
    count = 0
    async for e in cursor:
        if e.get("prev_hash") != expected_prev:
            broken.append({"id": e.get("id"), "ts": e.get("ts"), "issue": "prev_hash_mismatch"})
        recomputed = hash_event(e)
        if recomputed != e.get("hash"):
            broken.append({"id": e.get("id"), "ts": e.get("ts"), "issue": "self_hash_mismatch"})
        expected_prev = e.get("hash", GENESIS_HASH)
        count += 1
    return {"firm_id": firm_id, "verified": count, "broken": broken, "ok": len(broken) == 0}


def register_audit_routes(
    api: APIRouter,
    db: Any,
    get_current_user: Callable,
    require_permission: Callable,
    new_id: Callable[[], str],
    now_iso: Callable[[], str],
) -> None:
    guard = require_permission("audit.read", get_current_user)

    @api.get("/audit")
    async def list_audit(
        limit: int = 50,
        resource_type: Optional[str] = None,
        action: Optional[str] = None,
        user=Depends(guard),
    ):
        q: dict = {"firm_id": user["firm_id"]}
        if resource_type:
            q["resource_type"] = resource_type
        if action:
            q["action"] = action
        cap = min(max(limit, 1), 500)
        items = (
            await db.audit_events.find(q, {"_id": 0, "prev_hash": 0, "hash": 0})
            .sort("created_at", -1)
            .to_list(cap)
        )
        return {"items": items, "limit": cap}

    @api.get("/audit/verify")
    async def verify_audit_chain(user=Depends(guard)):
        return await verify_chain(db, user["firm_id"])
