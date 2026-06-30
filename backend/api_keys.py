"""
Praxium Suite — firm integration API keys (saas-api-keys-scopes pattern, v1 read-only scope).
"""
from __future__ import annotations

import hashlib
import secrets
from typing import Any, Callable

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel


class ApiKeyCreateIn(BaseModel):
    label: str = "Integration"


def _hash_key(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def register_api_key_routes(
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

    @api.get("/integrations/api-keys")
    async def list_api_keys(user=Depends(read)):
        items = await db.api_keys.find(
            {"firm_id": user["firm_id"]},
            {"_id": 0, "key_hash": 0},
        ).sort("created_at", -1).to_list(50)
        return {"items": items}

    @api.post("/integrations/api-keys")
    async def create_api_key(body: ApiKeyCreateIn, user=Depends(manage)):
        raw = f"px_live_{secrets.token_urlsafe(32)}"
        prefix = raw[:16]
        doc = {
            "id": new_id(),
            "firm_id": user["firm_id"],
            "label": body.label.strip() or "Integration",
            "key_prefix": prefix,
            "key_hash": _hash_key(raw),
            "scopes": ["read"],
            "active": True,
            "created_by": user["id"],
            "created_at": now_iso(),
            "last_used_at": None,
        }
        await db.api_keys.insert_one(doc)
        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user["name"],
            action="api_key.created",
            resource_type="api_key",
            resource_id=doc["id"],
            detail={"label": doc["label"], "prefix": prefix},
            new_id=new_id,
            now_iso=now_iso,
        )
        return {"id": doc["id"], "label": doc["label"], "key": raw, "prefix": prefix, "scopes": doc["scopes"]}

    @api.delete("/integrations/api-keys/{key_id}")
    async def revoke_api_key(key_id: str, user=Depends(manage)):
        res = await db.api_keys.update_one(
            {"id": key_id, "firm_id": user["firm_id"]},
            {"$set": {"active": False, "revoked_at": now_iso()}},
        )
        if res.matched_count == 0:
            raise HTTPException(404, "API key not found")
        return {"ok": True}
