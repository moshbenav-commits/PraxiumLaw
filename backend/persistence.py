"""
Praxium Suite — letter-persistence engine (P1 core build).

Every outbound item (letter, filing, records request, balance verification,
reduction ask) carries an expected-response timer. Silence triggers follow-up
work; exhausted follow-ups escalate. Nothing waits quietly.
(docs/citation-os/PIPELINE_SPEC.md §3, docs/billing-os/AUTOMATION_SPEC.md flow 1)

The sweep creates follow-up TASKS (it never auto-sends) until outbound send
adapters exist; the state model already matches the eventual auto-send flow.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Callable, Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field

OUTBOUND_KINDS = (
    "letter", "filing", "records_request", "balance_verification",
    "reduction_ask", "status_inquiry", "other",
)
DEFAULT_FOLLOWUP_DAYS = (14, 30)

STATUS_AWAITING = "awaiting_response"
STATUS_RESPONDED = "responded"
STATUS_ESCALATED = "escalated"
STATUS_CLOSED = "closed"


async def create_outbound(
    db: Any,
    *,
    firm_id: str,
    user_id: str,
    title: str,
    kind: str,
    recipient: str,
    matter_id: Optional[str] = None,
    sent_at: Optional[str] = None,
    followup_days: Optional[list[int]] = None,
    new_id: Callable,
    now_iso: Callable,
) -> dict:
    """Record an outbound item and start its response timer. Import-friendly for other modules."""
    if kind not in OUTBOUND_KINDS:
        kind = "other"
    ts = sent_at or now_iso()
    days = list(followup_days or DEFAULT_FOLLOWUP_DAYS)
    first_wait = days[0] if days else DEFAULT_FOLLOWUP_DAYS[0]
    doc = {
        "id": new_id(),
        "firm_id": firm_id,
        "matter_id": matter_id,
        "title": title,
        "kind": kind,
        "recipient": recipient,
        "sent_at": ts,
        "followup_days": days,
        "followups_sent": 0,
        "expected_response_by": (datetime.fromisoformat(ts) + timedelta(days=first_wait)).isoformat(),
        "status": STATUS_AWAITING,
        "created_by": user_id,
        "created_at": now_iso(),
    }
    await db.outbound_items.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


class OutboundIn(BaseModel):
    title: str
    kind: str = "letter"
    recipient: str
    matter_id: Optional[str] = None
    sent_at: Optional[str] = None
    followup_days: Optional[list[int]] = Field(default=None, description="Waits between follow-ups, e.g. [14, 30]")


class ResponseIn(BaseModel):
    note: Optional[str] = None


def register_persistence_routes(
    api,
    db,
    get_current_user: Callable,
    require_permission: Callable,
    new_id: Callable,
    now_iso: Callable,
    log_audit: Callable,
):
    tasks_guard = require_permission("tasks.write", get_current_user)

    @api.post("/persistence/outbound")
    async def record_outbound(body: OutboundIn, user=Depends(tasks_guard)):
        doc = await create_outbound(
            db,
            firm_id=user["firm_id"], user_id=user["id"],
            title=body.title, kind=body.kind, recipient=body.recipient,
            matter_id=body.matter_id, sent_at=body.sent_at,
            followup_days=body.followup_days,
            new_id=new_id, now_iso=now_iso,
        )
        return doc

    @api.get("/persistence/outbound")
    async def list_outbound(
        status: Optional[str] = None,
        matter_id: Optional[str] = None,
        overdue: bool = False,
        limit: int = 100,
        user=Depends(get_current_user),
    ):
        q: dict[str, Any] = {"firm_id": user["firm_id"]}
        if status:
            q["status"] = status
        if matter_id:
            q["matter_id"] = matter_id
        if overdue:
            q["status"] = STATUS_AWAITING
            q["expected_response_by"] = {"$lt": now_iso()}
        cursor = db.outbound_items.find(q, {"_id": 0}).sort("expected_response_by", 1).limit(min(limit, 500))
        return {"items": [d async for d in cursor]}

    @api.post("/persistence/outbound/{item_id}/response")
    async def mark_responded(item_id: str, body: ResponseIn, user=Depends(tasks_guard)):
        item = await db.outbound_items.find_one({"id": item_id, "firm_id": user["firm_id"]}, {"_id": 0})
        if not item:
            raise HTTPException(404, "Outbound item not found")
        await db.outbound_items.update_one(
            {"id": item_id},
            {"$set": {"status": STATUS_RESPONDED, "responded_at": now_iso(),
                      "response_note": body.note or "", "responded_by": user["id"]}},
        )
        return {"status": STATUS_RESPONDED}

    @api.post("/persistence/sweep")
    async def run_followup_sweep(user=Depends(tasks_guard)):
        """Find awaiting items past their expected-response date; spawn follow-up
        or escalation tasks and advance timers. Idempotent per follow-up round."""
        ts = now_iso()
        followups: list[dict] = []
        escalations: list[dict] = []
        cursor = db.outbound_items.find(
            {"firm_id": user["firm_id"], "status": STATUS_AWAITING,
             "expected_response_by": {"$lt": ts}},
            {"_id": 0},
        )
        async for item in cursor:
            days = item.get("followup_days") or list(DEFAULT_FOLLOWUP_DAYS)
            sent = item.get("followups_sent", 0)
            next_round = sent + 1
            if sent < len(days):
                title = f"Follow up ({next_round}) — {item['title']} → {item['recipient']}"
                wait = days[sent]
                await db.outbound_items.update_one(
                    {"id": item["id"]},
                    {"$set": {
                        "followups_sent": next_round,
                        "expected_response_by": (datetime.fromisoformat(ts) + timedelta(days=wait)).isoformat(),
                    }},
                )
                priority = "high"
                followups.append({"item_id": item["id"], "task_title": title})
            else:
                title = f"ESCALATE — no response after {sent} follow-ups: {item['title']} → {item['recipient']}"
                await db.outbound_items.update_one(
                    {"id": item["id"]},
                    {"$set": {"status": STATUS_ESCALATED, "escalated_at": ts}},
                )
                priority = "urgent"
                escalations.append({"item_id": item["id"], "task_title": title})
            existing = await db.tasks.find_one(
                {"firm_id": user["firm_id"], "title": title, "status": {"$ne": "done"}}
            )
            if not existing:
                await db.tasks.insert_one({
                    "id": new_id(),
                    "firm_id": user["firm_id"],
                    "matter_id": item.get("matter_id"),
                    "title": title,
                    "description": "Auto-created by the letter-persistence sweep — silence is never a state.",
                    "priority": priority,
                    "status": "open",
                    "assignee_id": item.get("created_by") or user["id"],
                    "created_by": user["id"],
                    "created_at": ts,
                    "due_date": (datetime.fromisoformat(ts) + timedelta(days=2)).isoformat(),
                })
        if followups or escalations:
            await log_audit(
                db,
                firm_id=user["firm_id"],
                actor_id=user["id"],
                actor_name=user.get("name", ""),
                action="persistence.sweep",
                resource_type="outbound_items",
                detail={"followups": len(followups), "escalations": len(escalations)},
                new_id=new_id,
                now_iso=now_iso,
            )
        return {"followups": followups, "escalations": escalations}
