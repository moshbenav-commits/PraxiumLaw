"""
Praxium Suite — immutable audit log (saas-audit-log pattern).
"""
from __future__ import annotations

from typing import Any, Callable, Optional

from fastapi import APIRouter, Depends


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
    new_id: Callable[[], str],
    now_iso: Callable[[], str],
) -> None:
    await db.audit_events.insert_one({
        "id": new_id(),
        "firm_id": firm_id,
        "actor_id": actor_id,
        "actor_name": actor_name,
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "detail": detail or {},
        "created_at": now_iso(),
    })


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
        limit: int = 100,
        resource_type: Optional[str] = None,
        user=Depends(guard),
    ):
        q: dict = {"firm_id": user["firm_id"]}
        if resource_type:
            q["resource_type"] = resource_type
        items = await db.audit_events.find(q, {"_id": 0}).sort("created_at", -1).to_list(min(limit, 500))
        return {"items": items}
