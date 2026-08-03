"""
Praxium Suite — Billing OS (case financial ledger + lien tracking + disbursement gate).

One append-only ledger per case: provider bills, adjustments, payments, liens,
subrogation, costs, fees, settlement proceeds, disbursements. Every lien moves
through a resolution state machine (asserted → verified → negotiating →
resolved → paid → release_received); release_received is terminal and a paid
lien without a written release stays open. No disbursement leaves the door
until every lien on the matter is paid or release_received — the attorney
gate is the last stop, not the only stop.
(docs/billing-os/AUTOMATION_SPEC.md flows 1, 2 & 4)
"""
from __future__ import annotations

from typing import Any, Callable, Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel

from gates import require_gate, record_gate_decision
from exceptions_queue import raise_exception
from persistence import create_outbound

LEDGER_ENTRY_TYPES = (
    "provider_bill", "adjustment", "payment", "lien", "subrogation",
    "cost", "fee", "settlement_proceeds", "disbursement",
)

# Entry types subtracted from settlement_proceeds to reach the client-net estimate.
# Kept deliberately simple per spec flow 4: proceeds − fees − costs − verified liens/bills.
DEDUCTIBLE_TYPES = ("fee", "cost", "lien", "provider_bill")

LIEN_TYPES = ("medical", "statutory", "contractual", "subrogation", "non_medical")

LIEN_STATES = ("asserted", "verified", "negotiating", "resolved", "paid", "release_received")
LIEN_TERMINAL_STATE = "release_received"
LIEN_DISBURSABLE_STATES = ("paid", "release_received")

# Only forward moves along the chain are legal; no skipping and no going backward.
_LIEN_STATE_INDEX = {state: i for i, state in enumerate(LIEN_STATES)}


class LedgerEntryIn(BaseModel):
    entry_type: str
    description: str
    amount: float
    source_doc_id: Optional[str] = None


class LienIn(BaseModel):
    lienholder: str
    lien_type: str
    claimed_amount: float
    matter_id: str


class LienPatchIn(BaseModel):
    state: Optional[str] = None
    verified_amount: Optional[float] = None
    final_amount: Optional[float] = None
    release_doc_ack: bool = False


class VerificationRequestIn(BaseModel):
    targets: list[str]


def register_billing_os_routes(
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
    disbursement_gate = require_gate("disbursement.approve", get_current_user)

    def _strip(doc: dict) -> dict:
        return {k: v for k, v in doc.items() if k != "_id"}

    def _compute_totals(entries: list[dict]) -> dict:
        by_type: dict[str, float] = {}
        for e in entries:
            by_type[e["entry_type"]] = by_type.get(e["entry_type"], 0.0) + e["amount"]
        proceeds = by_type.get("settlement_proceeds", 0.0)
        deductions = sum(by_type.get(t, 0.0) for t in DEDUCTIBLE_TYPES)
        client_net_estimate = proceeds - deductions
        return {"by_type": by_type, "client_net_estimate": client_net_estimate}

    # ---- Ledger ------------------------------------------------------

    @api.get("/matters/{matter_id}/ledger")
    async def get_ledger(matter_id: str, user=Depends(read_guard)):
        cursor = db.ledger_entries.find(
            {"firm_id": user["firm_id"], "matter_id": matter_id}, {"_id": 0}
        ).sort("created_at", 1)
        entries = [d async for d in cursor]
        return {"entries": entries, "totals": _compute_totals(entries)}

    @api.post("/matters/{matter_id}/ledger")
    async def add_ledger_entry(matter_id: str, body: LedgerEntryIn, user=Depends(write_guard)):
        entry_type = body.entry_type if body.entry_type in LEDGER_ENTRY_TYPES else None
        if entry_type is None:
            raise HTTPException(400, f"entry_type must be one of {LEDGER_ENTRY_TYPES}")
        doc = {
            "id": new_id(),
            "firm_id": user["firm_id"],
            "matter_id": matter_id,
            "entry_type": entry_type,
            "description": body.description,
            "amount": body.amount,
            "source_doc_id": body.source_doc_id,
            "created_by": user["id"],
            "created_at": now_iso(),
        }
        await db.ledger_entries.insert_one(doc)
        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user.get("name", ""),
            action="billing.ledger_entry_added",
            resource_type="ledger_entries",
            resource_id=doc["id"],
            detail={"matter_id": matter_id, "entry_type": entry_type, "amount": body.amount},
            new_id=new_id,
            now_iso=now_iso,
        )
        return _strip(doc)

    # ---- Liens ---------------------------------------------------------

    @api.get("/liens")
    async def list_liens(matter_id: Optional[str] = None, user=Depends(read_guard)):
        q: dict[str, Any] = {"firm_id": user["firm_id"]}
        if matter_id:
            q["matter_id"] = matter_id
        cursor = db.liens.find(q, {"_id": 0}).sort("created_at", 1)
        return {"liens": [d async for d in cursor]}

    @api.post("/liens")
    async def create_lien(body: LienIn, user=Depends(write_guard)):
        if body.lien_type not in LIEN_TYPES:
            raise HTTPException(400, f"lien_type must be one of {LIEN_TYPES}")
        ts = now_iso()
        doc = {
            "id": new_id(),
            "firm_id": user["firm_id"],
            "matter_id": body.matter_id,
            "lienholder": body.lienholder,
            "lien_type": body.lien_type,
            "claimed_amount": body.claimed_amount,
            "verified_amount": None,
            "final_amount": None,
            "state": "asserted",
            "created_at": ts,
            "updated_at": ts,
        }
        await db.liens.insert_one(doc)
        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user.get("name", ""),
            action="billing.lien_created",
            resource_type="liens",
            resource_id=doc["id"],
            detail={"matter_id": body.matter_id, "lienholder": body.lienholder},
            new_id=new_id,
            now_iso=now_iso,
        )
        return _strip(doc)

    @api.patch("/liens/{lien_id}")
    async def patch_lien(lien_id: str, body: LienPatchIn, user=Depends(write_guard)):
        lien = await db.liens.find_one({"id": lien_id, "firm_id": user["firm_id"]}, {"_id": 0})
        if not lien:
            raise HTTPException(404, "Lien not found")

        updates: dict[str, Any] = {}
        if body.verified_amount is not None:
            updates["verified_amount"] = body.verified_amount
        if body.final_amount is not None:
            updates["final_amount"] = body.final_amount

        if body.state is not None:
            if body.state not in LIEN_STATES:
                raise HTTPException(400, f"state must be one of {LIEN_STATES}")
            current_idx = _LIEN_STATE_INDEX[lien["state"]]
            target_idx = _LIEN_STATE_INDEX[body.state]
            if target_idx <= current_idx:
                raise HTTPException(
                    400,
                    f"Illegal lien transition: '{lien['state']}' → '{body.state}' "
                    f"(only forward moves along {LIEN_STATES} are allowed)",
                )
            if body.state == LIEN_TERMINAL_STATE and not body.release_doc_ack:
                raise HTTPException(
                    400,
                    "release_received requires release_doc_ack=true — "
                    "a paid lien without an acknowledged release stays 'paid'",
                )
            updates["state"] = body.state

        if not updates:
            raise HTTPException(400, "No fields to update")

        updates["updated_at"] = now_iso()
        await db.liens.update_one({"id": lien_id}, {"$set": updates})

        if "verified_amount" in updates and updates["verified_amount"] != lien["claimed_amount"]:
            await raise_exception(
                db,
                firm_id=user["firm_id"],
                kind="verification_mismatch",
                source="billing_os.liens",
                title=f"Verified amount differs from claimed — {lien['lienholder']}",
                detail={
                    "lien_id": lien_id,
                    "claimed_amount": lien["claimed_amount"],
                    "verified_amount": updates["verified_amount"],
                },
                matter_id=lien["matter_id"],
                new_id=new_id,
                now_iso=now_iso,
            )

        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user.get("name", ""),
            action="billing.lien_updated",
            resource_type="liens",
            resource_id=lien_id,
            detail=updates,
            new_id=new_id,
            now_iso=now_iso,
        )
        return _strip({**lien, **updates})

    # ---- Balance verifications ------------------------------------------

    @api.post("/matters/{matter_id}/verifications/request")
    async def request_verifications(matter_id: str, body: VerificationRequestIn, user=Depends(write_guard)):
        created = []
        for name in body.targets:
            doc = await create_outbound(
                db,
                firm_id=user["firm_id"],
                user_id=user["id"],
                title=f"Balance verification — {name}",
                kind="balance_verification",
                recipient=name,
                matter_id=matter_id,
                new_id=new_id,
                now_iso=now_iso,
            )
            created.append(doc)
        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user.get("name", ""),
            action="billing.verifications_requested",
            resource_type="outbound_items",
            detail={"matter_id": matter_id, "targets": body.targets},
            new_id=new_id,
            now_iso=now_iso,
        )
        return {"items": created}

    # ---- Disbursement gate ----------------------------------------------

    @api.post("/matters/{matter_id}/disbursement/approve")
    async def approve_disbursement(matter_id: str, user=Depends(disbursement_gate)):
        lien_cursor = db.liens.find({"firm_id": user["firm_id"], "matter_id": matter_id}, {"_id": 0})
        liens = [d async for d in lien_cursor]
        blocking = [l for l in liens if l["state"] not in LIEN_DISBURSABLE_STATES]
        if blocking:
            names = ", ".join(f"{l['lienholder']} ({l['state']})" for l in blocking)
            raise HTTPException(
                400,
                f"Disbursement blocked — liens not yet paid/release_received: {names}",
            )

        entry_cursor = db.ledger_entries.find(
            {"firm_id": user["firm_id"], "matter_id": matter_id}, {"_id": 0}
        )
        entries = [d async for d in entry_cursor]
        totals = _compute_totals(entries)

        draft = {
            "matter_id": matter_id,
            "by_type": totals["by_type"],
            "client_net_estimate": totals["client_net_estimate"],
            "liens_cleared": [{"id": l["id"], "lienholder": l["lienholder"], "state": l["state"]} for l in liens],
            "prepared_at": now_iso(),
            "prepared_by": user["id"],
        }

        await record_gate_decision(
            db,
            user=user,
            gate_id="disbursement.approve",
            resource_type="matters",
            resource_id=matter_id,
            decision="approved",
            note="Disbursement draft approved — all liens paid/release_received.",
            new_id=new_id,
            now_iso=now_iso,
        )
        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user.get("name", ""),
            action="billing.disbursement_approved",
            resource_type="matters",
            resource_id=matter_id,
            detail={"client_net_estimate": totals["client_net_estimate"]},
            new_id=new_id,
            now_iso=now_iso,
        )
        return draft

    # ---- Firm-wide summary ------------------------------------------------

    @api.get("/billing/summary")
    async def billing_summary(user=Depends(read_guard)):
        firm_id = user["firm_id"]

        lien_counts: dict[str, int] = {state: 0 for state in LIEN_STATES}
        cursor = db.liens.find({"firm_id": firm_id}, {"_id": 0, "state": 1})
        async for l in cursor:
            lien_counts[l["state"]] = lien_counts.get(l["state"], 0) + 1

        outstanding_verifications = await db.outbound_items.count_documents(
            {"firm_id": firm_id, "kind": "balance_verification", "status": "awaiting_response"}
        )

        open_mismatches = await db.exceptions.count_documents(
            {"firm_id": firm_id, "kind": "verification_mismatch", "status": "open"}
        )

        return {
            "liens_by_state": lien_counts,
            "outstanding_balance_verifications": outstanding_verifications,
            "open_verification_mismatches": open_mismatches,
        }
