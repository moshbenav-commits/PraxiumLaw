"""
Praxium Suite — exception-queue framework (P1 core build).

Every automated flow writes here instead of failing silently
(docs/EXPANSION_ARCHITECTURE.md). The queue is also the VA-phase-out
instrument: queue volume per kind = the residual human work in a role
(docs/automation/VA_AUTOMATION_PLAN.md stages 2–4).
"""
from __future__ import annotations

from typing import Any, Callable, Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel

EXCEPTION_KINDS = (
    "extraction_low_confidence",   # OCR/parse below threshold — needs human keying
    "verification_mismatch",       # confirmed balance ≠ ledger, records disagree
    "reconciliation_delta",        # trust three-way recon out of balance
    "automation_failure",          # a flow errored and needs a human
    "deadline_risk",               # approaching date with no next action
    "other",
)

STATUS_OPEN = "open"
STATUS_RESOLVED = "resolved"
STATUS_DISMISSED = "dismissed"


async def raise_exception(
    db: Any,
    *,
    firm_id: str,
    kind: str,
    source: str,
    title: str,
    detail: Optional[dict] = None,
    matter_id: Optional[str] = None,
    new_id: Callable,
    now_iso: Callable,
) -> dict:
    """Import-friendly helper — automated flows call this instead of failing silently."""
    if kind not in EXCEPTION_KINDS:
        kind = "other"
    doc = {
        "id": new_id(),
        "firm_id": firm_id,
        "kind": kind,
        "source": source,
        "title": title,
        "detail": detail or {},
        "matter_id": matter_id,
        "status": STATUS_OPEN,
        "raised_at": now_iso(),
    }
    await db.exceptions.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


class ExceptionIn(BaseModel):
    kind: str = "other"
    source: str = "manual"
    title: str
    detail: Optional[dict] = None
    matter_id: Optional[str] = None


class ResolveIn(BaseModel):
    note: Optional[str] = None
    dismiss: bool = False


def register_exception_routes(
    api,
    db,
    get_current_user: Callable,
    require_permission: Callable,
    new_id: Callable,
    now_iso: Callable,
):
    tasks_guard = require_permission("tasks.write", get_current_user)

    @api.get("/exceptions")
    async def list_exceptions(
        status: str = STATUS_OPEN,
        kind: Optional[str] = None,
        matter_id: Optional[str] = None,
        limit: int = 100,
        user=Depends(get_current_user),
    ):
        q: dict[str, Any] = {"firm_id": user["firm_id"]}
        if status != "all":
            q["status"] = status
        if kind:
            q["kind"] = kind
        if matter_id:
            q["matter_id"] = matter_id
        cursor = db.exceptions.find(q, {"_id": 0}).sort("raised_at", -1).limit(min(limit, 500))
        return {"exceptions": [d async for d in cursor]}

    @api.get("/exceptions/summary")
    async def exceptions_summary(user=Depends(get_current_user)):
        """Counts by kind/status — the automation-quality dashboard feed."""
        pipeline = [
            {"$match": {"firm_id": user["firm_id"]}},
            {"$group": {"_id": {"kind": "$kind", "status": "$status"}, "count": {"$sum": 1}}},
        ]
        out: dict[str, dict[str, int]] = {}
        async for row in db.exceptions.aggregate(pipeline):
            kind = row["_id"]["kind"]
            out.setdefault(kind, {})[row["_id"]["status"]] = row["count"]
        return {"by_kind": out}

    @api.post("/exceptions")
    async def create_exception(body: ExceptionIn, user=Depends(tasks_guard)):
        return await raise_exception(
            db,
            firm_id=user["firm_id"], kind=body.kind, source=body.source,
            title=body.title, detail=body.detail, matter_id=body.matter_id,
            new_id=new_id, now_iso=now_iso,
        )

    @api.post("/exceptions/{exception_id}/resolve")
    async def resolve_exception(exception_id: str, body: ResolveIn, user=Depends(tasks_guard)):
        exc = await db.exceptions.find_one({"id": exception_id, "firm_id": user["firm_id"]}, {"_id": 0})
        if not exc:
            raise HTTPException(404, "Exception not found")
        if exc["status"] != STATUS_OPEN:
            raise HTTPException(400, "Exception is already closed")
        status = STATUS_DISMISSED if body.dismiss else STATUS_RESOLVED
        await db.exceptions.update_one(
            {"id": exception_id},
            {"$set": {"status": status, "resolved_at": now_iso(),
                      "resolved_by": user["id"], "resolution_note": body.note or ""}},
        )
        return {"status": status}
