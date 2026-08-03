"""
Praxium Suite — lien reduction-request tracking (Billing OS extension).

Every lien reduction ask moves through its own short state machine
(drafted → sent → countered → accepted | rejected | withdrawn) that is
independent of — but feeds back into — the lien's own resolution chain
in billing_os.py (asserted → verified → negotiating → resolved → paid →
release_received). Accepting a reduction is an attorney-judgment call:
it both closes the reduction and advances the underlying lien toward
"resolved", so the accept route is guarded by the "reductions.approve"
rbac permission (see gates.py — "reductions.approve" is the permission
that opens the catalogued "reduction.offer" / "reduction.accept" gates,
but is not itself a GATE_CATALOG id, so it is enforced here directly via
require_permission rather than require_gate).
"""
from __future__ import annotations

from typing import Any, Callable, Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel

from billing_os import LIEN_STATES
from persistence import create_outbound

REDUCTION_STATES = ("drafted", "sent", "countered", "accepted", "rejected", "withdrawn")
REDUCTION_TERMINAL_STATES = ("accepted", "rejected", "withdrawn")

# Legal manual transitions via PATCH. "accepted" is deliberately absent here —
# it is only reachable through the gated /accept route.
_REDUCTION_TRANSITIONS: dict[str, set[str]] = {
    "drafted": {"sent", "withdrawn"},
    "sent": {"countered", "rejected", "withdrawn"},
    "countered": {"sent", "rejected", "withdrawn"},
}

# Lien resolution chain — reused to advance a lien no further than "resolved"
# and never backward, mirroring billing_os.py's forward-only chain rule.
_LIEN_STATE_INDEX = {state: i for i, state in enumerate(LIEN_STATES)}
_LIEN_RESOLVED_TARGET = "resolved"


class ReductionRequestIn(BaseModel):
    requested_pct: Optional[float] = None
    requested_amount: Optional[float] = None
    rationale: Optional[str] = None


class ReductionPatchIn(BaseModel):
    state: Optional[str] = None
    counter_amount: Optional[float] = None
    note: Optional[str] = None


class ReductionAcceptIn(BaseModel):
    final_amount: float
    note: Optional[str] = None


def register_reduction_routes(
    api,
    db,
    get_current_user: Callable,
    require_permission: Callable,
    new_id: Callable,
    now_iso: Callable,
    log_audit: Callable,
):
    read_guard = require_permission("billing.read", get_current_user)
    write_guard = require_permission("billing.write", get_current_user)
    # "reductions.approve" is an rbac PERMISSION (backend/rbac.py PERMISSIONS),
    # not a GATE_CATALOG id in gates.py — the catalogued gates that use this
    # permission are "reduction.offer" / "reduction.accept". require_gate()
    # would raise ValueError on an unknown gate id, so accepting a reduction
    # is guarded directly with require_permission.
    accept_guard = require_permission("reductions.approve", get_current_user)

    def _strip(doc: dict) -> dict:
        return {k: v for k, v in doc.items() if k != "_id"}

    # ---- Create ----------------------------------------------------------

    @api.post("/liens/{lien_id}/reductions")
    async def create_reduction(lien_id: str, body: ReductionRequestIn, user=Depends(write_guard)):
        lien = await db.liens.find_one({"id": lien_id, "firm_id": user["firm_id"]}, {"_id": 0})
        if not lien:
            raise HTTPException(404, "Lien not found")

        ts = now_iso()
        doc = {
            "id": new_id(),
            "firm_id": user["firm_id"],
            "matter_id": lien["matter_id"],
            "lien_id": lien_id,
            "requested_pct": body.requested_pct,
            "requested_amount": body.requested_amount,
            "rationale": body.rationale or "",
            "state": "drafted",
            "offers": [],
            "outbound_id": None,
            "final_amount": None,
            "created_by": user["id"],
            "created_at": ts,
            "updated_at": ts,
        }

        outbound = await create_outbound(
            db,
            firm_id=user["firm_id"],
            user_id=user["id"],
            title=f"Lien reduction request — {lien['lienholder']}",
            kind="reduction_ask",
            recipient=lien["lienholder"],
            matter_id=lien["matter_id"],
            new_id=new_id,
            now_iso=now_iso,
        )
        doc["outbound_id"] = outbound["id"]

        await db.reductions.insert_one(doc)
        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user.get("name", ""),
            action="reductions.created",
            resource_type="reductions",
            resource_id=doc["id"],
            detail={"lien_id": lien_id, "matter_id": lien["matter_id"], "outbound_id": outbound["id"]},
            new_id=new_id,
            now_iso=now_iso,
        )
        return _strip(doc)

    # ---- Read --------------------------------------------------------------

    @api.get("/liens/{lien_id}/reductions")
    async def list_lien_reductions(lien_id: str, user=Depends(read_guard)):
        cursor = db.reductions.find(
            {"firm_id": user["firm_id"], "lien_id": lien_id}, {"_id": 0}
        ).sort("created_at", 1)
        return {"reductions": [d async for d in cursor]}

    @api.get("/reductions")
    async def list_reductions(
        matter_id: Optional[str] = None,
        state: Optional[str] = None,
        user=Depends(read_guard),
    ):
        q: dict[str, Any] = {"firm_id": user["firm_id"]}
        if matter_id:
            q["matter_id"] = matter_id
        if state:
            q["state"] = state
        cursor = db.reductions.find(q, {"_id": 0}).sort("created_at", 1)
        return {"reductions": [d async for d in cursor]}

    # ---- Update (manual, pre-acceptance) ------------------------------------

    @api.patch("/reductions/{reduction_id}")
    async def patch_reduction(reduction_id: str, body: ReductionPatchIn, user=Depends(write_guard)):
        reduction = await db.reductions.find_one(
            {"id": reduction_id, "firm_id": user["firm_id"]}, {"_id": 0}
        )
        if not reduction:
            raise HTTPException(404, "Reduction not found")
        if reduction["state"] in REDUCTION_TERMINAL_STATES:
            raise HTTPException(400, f"Reduction is already terminal ('{reduction['state']}')")

        updates: dict[str, Any] = {}
        push_offer: Optional[dict] = None

        if body.counter_amount is not None:
            push_offer = {
                "amount": body.counter_amount,
                "note": body.note or "",
                "by": user["id"],
                "at": now_iso(),
            }

        if body.state is not None:
            if body.state == "accepted":
                raise HTTPException(
                    400,
                    "Reductions can only be accepted via POST /reductions/{id}/accept "
                    "(requires the reductions.approve permission)",
                )
            if body.state not in REDUCTION_STATES:
                raise HTTPException(400, f"state must be one of {REDUCTION_STATES}")
            legal = _REDUCTION_TRANSITIONS.get(reduction["state"], set())
            if body.state not in legal:
                raise HTTPException(
                    400,
                    f"Illegal reduction transition: '{reduction['state']}' → '{body.state}' "
                    f"(allowed from '{reduction['state']}': {sorted(legal) or 'none'})",
                )
            updates["state"] = body.state

        if not updates and push_offer is None:
            raise HTTPException(400, "No fields to update")

        updates["updated_at"] = now_iso()
        mongo_update: dict[str, Any] = {"$set": updates}
        if push_offer is not None:
            mongo_update["$push"] = {"offers": push_offer}

        await db.reductions.update_one({"id": reduction_id}, mongo_update)

        merged = {**reduction, **updates}
        if push_offer is not None:
            merged["offers"] = [*reduction.get("offers", []), push_offer]

        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user.get("name", ""),
            action="reductions.updated",
            resource_type="reductions",
            resource_id=reduction_id,
            detail={"updates": updates, "offer_pushed": push_offer},
            new_id=new_id,
            now_iso=now_iso,
        )
        return _strip(merged)

    # ---- Accept (attorney-gated) --------------------------------------------

    @api.post("/reductions/{reduction_id}/accept")
    async def accept_reduction(reduction_id: str, body: ReductionAcceptIn, user=Depends(accept_guard)):
        reduction = await db.reductions.find_one(
            {"id": reduction_id, "firm_id": user["firm_id"]}, {"_id": 0}
        )
        if not reduction:
            raise HTTPException(404, "Reduction not found")
        if reduction["state"] in REDUCTION_TERMINAL_STATES:
            raise HTTPException(400, f"Reduction is already terminal ('{reduction['state']}')")
        if reduction["state"] not in ("sent", "countered"):
            raise HTTPException(
                400,
                f"Reduction must be 'sent' or 'countered' before it can be accepted "
                f"(currently '{reduction['state']}')",
            )

        lien = await db.liens.find_one(
            {"id": reduction["lien_id"], "firm_id": user["firm_id"]}, {"_id": 0}
        )
        if not lien:
            raise HTTPException(404, "Linked lien not found")

        ts = now_iso()
        reduction_updates = {
            "state": "accepted",
            "final_amount": body.final_amount,
            "updated_at": ts,
        }
        await db.reductions.update_one({"id": reduction_id}, {"$set": reduction_updates})

        lien_updates: dict[str, Any] = {"final_amount": body.final_amount, "updated_at": ts}
        if _LIEN_STATE_INDEX[lien["state"]] < _LIEN_STATE_INDEX[_LIEN_RESOLVED_TARGET]:
            lien_updates["state"] = _LIEN_RESOLVED_TARGET
        await db.liens.update_one({"id": lien["id"]}, {"$set": lien_updates})

        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user.get("name", ""),
            action="reductions.accepted",
            resource_type="reductions",
            resource_id=reduction_id,
            detail={
                "lien_id": lien["id"],
                "final_amount": body.final_amount,
                "note": body.note or "",
                "lien_state": lien_updates.get("state", lien["state"]),
            },
            new_id=new_id,
            now_iso=now_iso,
        )

        return {
            "reduction": _strip({**reduction, **reduction_updates}),
            "lien": _strip({**lien, **lien_updates}),
        }
