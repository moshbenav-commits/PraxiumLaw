"""
Praxium Suite — Trust account three-way reconciliation (P1 core build).

IOLTA/trust accounting requires the firm to reconcile three numbers that
should always agree: the book balance (sum of trust activity across every
matter's ledger), the sum of client ledgers (per-matter trust-held, which
should equal the book balance by construction here), and the bank balance
(the trust account statement, entered by a human). Any gap between bank and
book, or any matter sitting at a negative trust balance, is a compliance
red flag and gets raised into the exceptions queue instead of silently
sitting on a report no one reads.

Trust balance held for a matter = sum(settlement_proceeds) − sum(disbursement)
for that matter's ledger_entries (docs/billing-os — same ledger as Billing OS,
read-only here).
"""
from __future__ import annotations

from typing import Any, Callable, Optional

from fastapi import Depends
from pydantic import BaseModel

from exceptions_queue import raise_exception

NEG_MATTER_EPS = 0.005
DELTA_EPS = 0.005


class BankReconIn(BaseModel):
    bank_balance: float
    statement_date: str


def register_trust_recon_routes(
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

    async def _compute_state(firm_id: str) -> dict:
        """Book balance + per-matter trust-held, computed from ledger_entries."""
        cursor = db.ledger_entries.find(
            {"firm_id": firm_id, "entry_type": {"$in": ["settlement_proceeds", "disbursement"]}},
            {"_id": 0, "matter_id": 1, "entry_type": 1, "amount": 1},
        )
        per_matter: dict[str, float] = {}
        async for e in cursor:
            sign = 1.0 if e["entry_type"] == "settlement_proceeds" else -1.0
            per_matter[e["matter_id"]] = per_matter.get(e["matter_id"], 0.0) + sign * e["amount"]

        non_zero = {m: v for m, v in per_matter.items() if abs(v) > NEG_MATTER_EPS}
        book_balance = sum(non_zero.values())
        negative_matters = [m for m, v in non_zero.items() if v < -NEG_MATTER_EPS]
        per_matter_list = [{"matter_id": m, "trust_held": v} for m, v in non_zero.items()]
        return {
            "book_balance": book_balance,
            "per_matter": per_matter_list,
            "negative_matters": negative_matters,
        }

    # ---- Three-way reconciliation view ----------------------------------

    @api.get("/trust/reconciliation")
    async def get_reconciliation(user=Depends(read_guard)):
        firm_id = user["firm_id"]
        state = await _compute_state(firm_id)
        book_balance = state["book_balance"]

        last_bank = await db.trust_reconciliations.find_one(
            {"firm_id": firm_id}, {"_id": 0}, sort=[("created_at", -1)]
        )
        delta = (last_bank["bank_balance"] - book_balance) if last_bank else None

        return {
            "as_of": now_iso(),
            "book_balance": book_balance,
            "sum_client_ledgers": book_balance,
            "per_matter": state["per_matter"],
            "negative_matters": state["negative_matters"],
            "last_bank": last_bank,
            "delta": delta,
        }

    # ---- Record a bank statement reconciliation --------------------------

    @api.post("/trust/reconciliation/bank")
    async def record_bank_reconciliation(body: BankReconIn, user=Depends(write_guard)):
        firm_id = user["firm_id"]
        state = await _compute_state(firm_id)
        book_balance = state["book_balance"]
        delta = body.bank_balance - book_balance

        doc = {
            "id": new_id(),
            "firm_id": firm_id,
            "bank_balance": body.bank_balance,
            "statement_date": body.statement_date,
            "book_balance": book_balance,
            "delta": delta,
            "created_by": user["id"],
            "created_at": now_iso(),
        }
        await db.trust_reconciliations.insert_one(doc)

        exceptions_raised = 0

        if abs(delta) > DELTA_EPS:
            await raise_exception(
                db,
                firm_id=firm_id,
                kind="reconciliation_delta",
                source="trust_recon",
                title=f"Trust reconciliation off by {delta:.2f}",
                detail={
                    "bank_balance": body.bank_balance,
                    "book_balance": book_balance,
                    "delta": delta,
                },
                matter_id=None,
                new_id=new_id,
                now_iso=now_iso,
            )
            exceptions_raised += 1

        if state["negative_matters"]:
            await raise_exception(
                db,
                firm_id=firm_id,
                kind="reconciliation_delta",
                source="trust_recon",
                title=f"{len(state['negative_matters'])} matter(s) with negative trust balance",
                detail={"matter_ids": state["negative_matters"]},
                matter_id=None,
                new_id=new_id,
                now_iso=now_iso,
            )
            exceptions_raised += 1

        await log_audit(
            db,
            firm_id=firm_id,
            actor_id=user["id"],
            actor_name=user.get("name", ""),
            action="trust_recon.bank_reconciliation_recorded",
            resource_type="trust_reconciliations",
            resource_id=doc["id"],
            detail={
                "bank_balance": body.bank_balance,
                "book_balance": book_balance,
                "delta": delta,
                "exceptions_raised": exceptions_raised,
            },
            new_id=new_id,
            now_iso=now_iso,
        )

        return {
            "book_balance": book_balance,
            "bank_balance": body.bank_balance,
            "delta": delta,
            "exceptions_raised": exceptions_raised,
        }
