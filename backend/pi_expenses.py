"""
PI Case OS — matter expense ledger (out-of-pocket, mileage, wage loss) → settlement recovery.
"""
from __future__ import annotations

from typing import Any, Callable, Literal, Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field

from rbac import require_permission

EXPENSE_CATEGORIES = (
    "mileage",
    "rental_car",
    "wage_loss",
    "copay_oob",
    "court_fee",
    "attorney_lien",
    "records_fee",
    "other",
)

DEFAULT_MILEAGE_RATE = 0.67


def default_expense_row(
    *,
    row_id: str,
    firm_id: str,
    matter_id: str,
    title: str,
    now_iso: str,
) -> dict[str, Any]:
    return {
        "id": row_id,
        "firm_id": firm_id,
        "matter_id": matter_id,
        "title": title,
        "category": "other",
        "amount": 0.0,
        "expense_date": None,
        "payee": "",
        "include_in_settlement": True,
        "receipt_document_id": None,
        "notes": "",
        "created_at": now_iso,
        "updated_at": now_iso,
    }


def merge_expense_row(existing: dict) -> dict:
    defaults = default_expense_row(
        row_id=existing.get("id", ""),
        firm_id=existing.get("firm_id", ""),
        matter_id=existing.get("matter_id", ""),
        title=existing.get("title", ""),
        now_iso=existing.get("created_at", ""),
    )
    merged = {**defaults, **existing}
    if merged.get("category") not in EXPENSE_CATEGORIES:
        merged["category"] = "other"
    return merged


def summarize_expenses(rows: list[dict]) -> dict[str, Any]:
    by_category: dict[str, float] = {}
    settlement_total = 0.0
    recoverable_oob = 0.0
    missing_title = 0
    for row in rows:
        cat = row.get("category") or "other"
        amt = float(row.get("amount") or 0)
        by_category[cat] = round(by_category.get(cat, 0) + amt, 2)
        if row.get("include_in_settlement", True) and amt > 0:
            settlement_total = round(settlement_total + amt, 2)
        if cat in ("copay_oob", "mileage", "rental_car") and amt > 0:
            recoverable_oob = round(recoverable_oob + amt, 2)
        if not (row.get("title") or "").strip():
            missing_title += 1
    return {
        "item_count": len(rows),
        "settlement_total": round(settlement_total, 2),
        "recoverable_oob_total": recoverable_oob,
        "by_category": by_category,
        "missing_title_count": missing_title,
        "mileage_total": round(by_category.get("mileage", 0), 2),
        "wage_loss_total": round(by_category.get("wage_loss", 0), 2),
        "rental_car_total": round(by_category.get("rental_car", 0), 2),
    }


def settlement_expenses_from_rows(rows: list[dict]) -> float:
    """Sum positive amounts flagged for settlement calculator / disbursement."""
    return summarize_expenses(rows)["settlement_total"]


class ExpenseCreateIn(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    category: Literal[
        "mileage",
        "rental_car",
        "wage_loss",
        "copay_oob",
        "court_fee",
        "attorney_lien",
        "records_fee",
        "other",
    ] = "other"
    amount: float = Field(0, ge=0)
    expense_date: Optional[str] = None
    payee: str = ""
    include_in_settlement: bool = True
    notes: str = ""


class ExpensePatchIn(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    category: Optional[
        Literal[
            "mileage",
            "rental_car",
            "wage_loss",
            "copay_oob",
            "court_fee",
            "attorney_lien",
            "records_fee",
            "other",
        ]
    ] = None
    amount: Optional[float] = Field(None, ge=0)
    expense_date: Optional[str] = None
    payee: Optional[str] = None
    include_in_settlement: Optional[bool] = None
    receipt_document_id: Optional[str] = None
    notes: Optional[str] = None


def register_pi_expenses_routes(
    api,
    db,
    get_current_user: Callable,
    new_id: Callable,
    now_iso: Callable,
    *,
    merge_pi_settlement: Callable,
):
    async def _assert_pi_matter(matter_id: str, firm_id: str):
        m = await db.matters.find_one(
            {"id": matter_id, "firm_id": firm_id},
            {"_id": 0, "id": 1, "practice_area": 1},
        )
        if not m:
            raise HTTPException(404, "Matter not found")
        if m.get("practice_area") != "personal_injury":
            raise HTTPException(400, "Expense ledger applies to personal injury matters only")
        return m

    async def _load_expense_rows(matter_id: str, firm_id: str) -> list[dict]:
        rows = await db.matter_expenses.find(
            {"firm_id": firm_id, "matter_id": matter_id},
            {"_id": 0},
        ).sort("created_at", 1).to_list(500)
        return [merge_expense_row(r) for r in rows]

    @api.get("/matters/{matter_id}/expenses")
    async def list_matter_expenses(
        matter_id: str,
        user=Depends(require_permission("expenses.read", get_current_user)),
    ):
        await _assert_pi_matter(matter_id, user["firm_id"])
        items = await _load_expense_rows(matter_id, user["firm_id"])
        return {
            "matter_id": matter_id,
            "items": items,
            "summary": summarize_expenses(items),
        }

    @api.post("/matters/{matter_id}/expenses")
    async def create_matter_expense(
        matter_id: str,
        body: ExpenseCreateIn,
        user=Depends(require_permission("expenses.draft", get_current_user)),
    ):
        await _assert_pi_matter(matter_id, user["firm_id"])
        ts = now_iso()
        doc = default_expense_row(
            row_id=new_id(),
            firm_id=user["firm_id"],
            matter_id=matter_id,
            title=body.title.strip(),
            now_iso=ts,
        )
        doc.update(
            {
                "category": body.category,
                "amount": round(float(body.amount), 2),
                "expense_date": body.expense_date,
                "payee": body.payee.strip(),
                "include_in_settlement": body.include_in_settlement,
                "notes": body.notes,
                "updated_at": ts,
            }
        )
        await db.matter_expenses.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @api.patch("/expenses/{row_id}")
    async def patch_matter_expense(
        row_id: str,
        body: ExpensePatchIn,
        user=Depends(require_permission("expenses.draft", get_current_user)),
    ):
        existing = await db.matter_expenses.find_one(
            {"id": row_id, "firm_id": user["firm_id"]},
            {"_id": 0},
        )
        if not existing:
            raise HTTPException(404, "Expense row not found")
        patch = body.model_dump(exclude_unset=True)
        if not patch:
            return merge_expense_row(existing)
        if "title" in patch and patch["title"]:
            patch["title"] = patch["title"].strip()
        if "amount" in patch:
            patch["amount"] = round(float(patch["amount"]), 2)
        patch["updated_at"] = now_iso()
        await db.matter_expenses.update_one(
            {"id": row_id, "firm_id": user["firm_id"]},
            {"$set": patch},
        )
        updated = await db.matter_expenses.find_one({"id": row_id}, {"_id": 0})
        return merge_expense_row(updated)

    @api.delete("/expenses/{row_id}")
    async def delete_matter_expense(
        row_id: str,
        user=Depends(require_permission("expenses.draft", get_current_user)),
    ):
        res = await db.matter_expenses.delete_one({"id": row_id, "firm_id": user["firm_id"]})
        if res.deleted_count == 0:
            raise HTTPException(404, "Expense row not found")
        return {"deleted": True, "id": row_id}

    @api.post("/matters/{matter_id}/expenses/sync-to-settlement")
    async def sync_expenses_to_settlement(
        matter_id: str,
        user=Depends(require_permission("settlement.draft", get_current_user)),
    ):
        await _assert_pi_matter(matter_id, user["firm_id"])
        items = await _load_expense_rows(matter_id, user["firm_id"])
        total = settlement_expenses_from_rows(items)

        matter = await db.matters.find_one(
            {"id": matter_id, "firm_id": user["firm_id"]},
            {"_id": 0, "pi_settlement": 1},
        )
        pi_settlement = merge_pi_settlement(matter.get("pi_settlement"))
        pi_settlement["default_expenses"] = total

        active_id = pi_settlement.get("active_scenario_id")
        updated_scenarios = 0
        for scenario in pi_settlement.get("scenarios", []):
            if active_id and scenario.get("id") != active_id:
                continue
            scenario["expenses"] = total
            updated_scenarios += 1

        await db.matters.update_one(
            {"id": matter_id, "firm_id": user["firm_id"]},
            {"$set": {"pi_settlement": pi_settlement, "updated_at": now_iso()}},
        )
        return {
            "matter_id": matter_id,
            "expenses_synced": total,
            "scenarios_updated": updated_scenarios,
        }
