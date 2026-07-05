"""
PI Case OS — demand builder (yellow-sheet exhibits) + attorney approval gate.
"""
from __future__ import annotations

from typing import Any, Callable, Literal, Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field

from rbac import require_permission

# Yellow-sheet priority: large / hospital items first, pharmacy last (training).
YELLOW_SHEET_RANK: dict[str, int] = {
    "hospital": 10,
    "er_physician": 20,
    "radiology": 30,
    "ambulance": 40,
    "imaging": 50,
    "pain_management": 60,
    "orthopedics": 70,
    "primary_care": 80,
    "chiro": 90,
    "pt": 100,
    "pharmacy": 110,
    "other": 999,
}

PREP_CHECKLIST_DEFAULTS: tuple[dict[str, str], ...] = (
    {"id": "meds_reconciled", "label": "Every Meds provider has matching bills/records or documented FE"},
    {"id": "er_stack", "label": "Hospital, ER physician, radiology, ambulance complete when ER occurred"},
    {"id": "mri_attached", "label": "MRI reports attached and summarized"},
    {"id": "fe_reconciled", "label": "Injection/surgical notices and FE amounts reconciled"},
    {"id": "lien_verify", "label": "Lien verifications sent where balances uncertain"},
    {"id": "loans_entered", "label": "Loans and other liens entered for disbursement"},
    {"id": "expenses", "label": "Out-of-pocket expenses captured"},
    {"id": "police_report", "label": "Police report in file (if exists)"},
    {"id": "adjuster_current", "label": "Adjuster / claim numbers current from acknowledgments"},
    {"id": "prior_records", "label": "Prior accident records requested when priors exist (5 years)"},
)

DEMAND_STATUSES = ("draft", "pending_attorney_review", "approved", "rejected", "sent")
DEMAND_TYPES = ("third_party", "medpay", "um_uim")
APPROVER_ROLES = frozenset({"admin", "partner", "attorney"})


def default_prep_checklist() -> list[dict[str, Any]]:
    return [{"id": i["id"], "label": i["label"], "complete": False, "notes": ""} for i in PREP_CHECKLIST_DEFAULTS]


DEFAULT_MILEAGE_RATE = 0.67


def default_economic_damages() -> dict[str, Any]:
    return {
        "wage_loss_hours": None,
        "wage_loss_hourly_rate": None,
        "wage_loss_total": 0.0,
        "mileage_miles": None,
        "mileage_rate": DEFAULT_MILEAGE_RATE,
        "mileage_total": 0.0,
        "rental_car_total": 0.0,
        "other_expenses_total": 0.0,
        "notes": "",
    }


def merge_economic_damages(existing: Optional[dict]) -> dict[str, Any]:
    base = default_economic_damages()
    if not existing:
        return base
    return {**base, **{k: v for k, v in existing.items() if k in base}}


def compute_economic_total(economic: Optional[dict]) -> float:
    econ = merge_economic_damages(economic)
    return round(
        float(econ.get("wage_loss_total") or 0)
        + float(econ.get("mileage_total") or 0)
        + float(econ.get("rental_car_total") or 0)
        + float(econ.get("other_expenses_total") or 0),
        2,
    )


def apply_economic_auto_totals(economic: dict) -> dict[str, Any]:
    econ = merge_economic_damages(economic)
    hours = econ.get("wage_loss_hours")
    rate = econ.get("wage_loss_hourly_rate")
    if hours is not None and rate is not None:
        econ["wage_loss_total"] = round(float(hours) * float(rate), 2)
    miles = econ.get("mileage_miles")
    mrate = econ.get("mileage_rate") if econ.get("mileage_rate") is not None else DEFAULT_MILEAGE_RATE
    if miles is not None:
        econ["mileage_total"] = round(float(miles) * float(mrate), 2)
    return econ


def default_pi_demand() -> dict[str, Any]:
    return {
        "status": "draft",
        "demand_type": "third_party",
        "prep_checklist": default_prep_checklist(),
        "exhibits": [],
        "specials_total": 0.0,
        "economic_damages": default_economic_damages(),
        "general_damages_notes": "",
        "letter_draft_notes": "",
        "response_due_date": None,
        "sent_at": None,
        "approval": {
            "requested_at": None,
            "requested_by": None,
            "requested_by_name": None,
            "approved_at": None,
            "approved_by": None,
            "approved_by_name": None,
            "rejected_at": None,
            "rejected_by": None,
            "rejected_by_name": None,
            "attorney_notes": "",
        },
    }


def merge_pi_demand(existing: Optional[dict]) -> dict[str, Any]:
    base = default_pi_demand()
    if not existing:
        return base
    merged = {**base, **{k: v for k, v in existing.items() if k in base}}
    approval = {**base["approval"], **(existing.get("approval") or {})}
    merged["approval"] = approval
    if existing.get("prep_checklist"):
        by_id = {i["id"]: i for i in existing["prep_checklist"] if isinstance(i, dict) and i.get("id")}
        merged["prep_checklist"] = []
        for default in default_prep_checklist():
            saved = by_id.get(default["id"], {})
            merged["prep_checklist"].append(
                {
                    "id": default["id"],
                    "label": default.get("label") or saved.get("label", ""),
                    "complete": bool(saved.get("complete", False)),
                    "notes": saved.get("notes") or "",
                }
            )
    if merged.get("status") not in DEMAND_STATUSES:
        merged["status"] = "draft"
    if merged.get("demand_type") not in DEMAND_TYPES:
        merged["demand_type"] = "third_party"
    if not isinstance(merged.get("exhibits"), list):
        merged["exhibits"] = []
    merged["economic_damages"] = merge_economic_damages(existing.get("economic_damages"))
    return merged


def _yellow_rank(specialty: str) -> int:
    return YELLOW_SHEET_RANK.get(specialty or "other", 999)


def build_exhibits_from_ledger(rows: list[dict], *, new_id: Callable) -> list[dict[str, Any]]:
    sorted_rows = sorted(
        rows,
        key=lambda r: (
            _yellow_rank(r.get("specialty", "other")),
            r.get("first_treatment_date") or "9999",
            r.get("provider_name") or "",
        ),
    )
    exhibits: list[dict[str, Any]] = []
    for idx, row in enumerate(sorted_rows, start=1):
        balance = float(row.get("balance") or 0)
        fe = row.get("futures_estimate")
        amount = balance if balance > 0 else (float(fe) if fe else 0.0)
        exhibits.append(
            {
                "id": new_id(),
                "sort_order": idx,
                "ledger_row_id": row.get("id"),
                "document_id": None,
                "provider_name": row.get("provider_name") or "",
                "specialty": row.get("specialty") or "other",
                "label": f"{row.get('provider_name') or 'Provider'} — {row.get('specialty', 'other')}",
                "amount": round(amount, 2),
                "included": amount > 0 or bool(row.get("still_treating")),
                "notes": "",
            }
        )
    return exhibits


def compute_specials_total(exhibits: list[dict]) -> float:
    return round(sum(float(e.get("amount") or 0) for e in exhibits if e.get("included")), 2)


def compute_demand_validation(
    *,
    exhibits: list[dict],
    ledger_rows: list[dict],
    expense_summary: Optional[dict],
    economic: Optional[dict],
) -> dict[str, Any]:
    exhibit_specials = compute_specials_total(exhibits)
    ledger_specials = round(
        sum(
            float(r.get("balance") or 0) or float(r.get("futures_estimate") or 0)
            for r in ledger_rows
        ),
        2,
    )
    economic_total = compute_economic_total(economic)
    expense_ledger_total = float((expense_summary or {}).get("settlement_total") or 0)
    expense_categories = (expense_summary or {}).get("by_category") or {}

    warnings: list[str] = []
    if abs(exhibit_specials - ledger_specials) > 0.01:
        warnings.append(
            f"Exhibit specials ({exhibit_specials}) differ from meds ledger ({ledger_specials}) — rebuild exhibits"
        )
    if expense_ledger_total > 0 and economic_total > 0:
        ledger_econ_proxy = round(
            float(expense_categories.get("wage_loss", 0))
            + float(expense_categories.get("mileage", 0))
            + float(expense_categories.get("rental_car", 0))
            + float(expense_categories.get("copay_oob", 0))
            + float(expense_categories.get("other", 0)),
            2,
        )
        if abs(ledger_econ_proxy - economic_total) > 1.0:
            warnings.append("Economic damages section may not match Expenses tab totals")

    return {
        "exhibit_specials": exhibit_specials,
        "meds_ledger_total": ledger_specials,
        "specials_match": abs(exhibit_specials - ledger_specials) <= 0.01,
        "economic_damages_total": economic_total,
        "expense_ledger_total": expense_ledger_total,
        "grand_demand_total": round(exhibit_specials + economic_total, 2),
        "warnings": warnings,
    }


def compute_limits_hint(pi_insurance: Optional[dict], specials_total: float) -> Optional[dict[str, Any]]:
    if not pi_insurance:
        return None
    tp = pi_insurance.get("third_party") or {}
    limits = tp.get("limits") or {}
    bi = limits.get("bi_per_person")
    if not bi:
        return None
    try:
        bi_val = float(bi)
    except (TypeError, ValueError):
        return None
    pct = round((specials_total / bi_val) * 100, 1) if bi_val > 0 else None
    heuristic_low = round(bi_val * 0.6, 2)
    heuristic_high = round(bi_val * 0.8, 2)
    return {
        "bi_per_person": bi_val,
        "specials_total": specials_total,
        "pct_of_limits": pct,
        "training_heuristic_low": heuristic_low,
        "training_heuristic_high": heuristic_high,
        "within_heuristic_band": heuristic_low <= specials_total <= heuristic_high if pct else None,
    }


class PrepChecklistItemIn(BaseModel):
    id: str
    complete: bool = False
    notes: str = ""


class ExhibitIn(BaseModel):
    id: Optional[str] = None
    sort_order: int = 0
    ledger_row_id: Optional[str] = None
    document_id: Optional[str] = None
    provider_name: str = ""
    specialty: str = "other"
    label: str = ""
    amount: float = 0.0
    included: bool = True
    notes: str = ""


class EconomicDamagesIn(BaseModel):
    wage_loss_hours: Optional[float] = Field(None, ge=0)
    wage_loss_hourly_rate: Optional[float] = Field(None, ge=0)
    wage_loss_total: Optional[float] = Field(None, ge=0)
    mileage_miles: Optional[float] = Field(None, ge=0)
    mileage_rate: Optional[float] = Field(None, ge=0)
    mileage_total: Optional[float] = Field(None, ge=0)
    rental_car_total: Optional[float] = Field(None, ge=0)
    other_expenses_total: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = Field(None, max_length=4000)


class PiDemandPatchIn(BaseModel):
    demand_type: Optional[Literal["third_party", "medpay", "um_uim"]] = None
    prep_checklist: Optional[list[PrepChecklistItemIn]] = None
    exhibits: Optional[list[ExhibitIn]] = None
    economic_damages: Optional[EconomicDamagesIn] = None
    general_damages_notes: Optional[str] = None
    letter_draft_notes: Optional[str] = None
    response_due_date: Optional[str] = None


class DemandReviewIn(BaseModel):
    attorney_notes: Optional[str] = Field(None, max_length=4000)


class DemandSendIn(BaseModel):
    response_due_date: Optional[str] = None
    attorney_notes: Optional[str] = Field(None, max_length=2000)


def _assert_pi_matter(matter: Optional[dict]):
    if not matter:
        raise HTTPException(404, "Matter not found")
    if matter.get("practice_area") != "personal_injury":
        raise HTTPException(400, "Demand builder applies to personal injury matters only")


def register_pi_demand_routes(
    api,
    db,
    get_current_user: Callable,
    new_id: Callable,
    now_iso: Callable,
    *,
    merge_pi_insurance: Callable,
    merge_ledger_row: Callable,
    summarize_expenses: Optional[Callable] = None,
):
    async def _load_matter(matter_id: str, firm_id: str, fields: Optional[dict] = None):
        projection = {"_id": 0, "id": 1, "practice_area": 1, "pi_demand": 1, "pi_insurance": 1, **(fields or {})}
        return await db.matters.find_one({"id": matter_id, "firm_id": firm_id}, projection)

    @api.get("/pi/demand/review-queue")
    async def demand_review_queue(user=Depends(get_current_user)):
        if user.get("role") not in APPROVER_ROLES:
            raise HTTPException(403, "Attorney approval queue requires attorney, partner, or admin role")
        matters = await db.matters.find(
            {
                "firm_id": user["firm_id"],
                "practice_area": "personal_injury",
                "pi_demand.status": "pending_attorney_review",
            },
            {"_id": 0, "id": 1, "title": 1, "case_number": 1, "pi_demand": 1},
        ).sort("pi_demand.approval.requested_at", 1).to_list(100)
        items = []
        for m in matters:
            d = merge_pi_demand(m.get("pi_demand"))
            items.append(
                {
                    "matter_id": m["id"],
                    "case_number": m.get("case_number"),
                    "title": m.get("title"),
                    "demand_type": d.get("demand_type"),
                    "specials_total": d.get("specials_total"),
                    "requested_at": d.get("approval", {}).get("requested_at"),
                    "requested_by_name": d.get("approval", {}).get("requested_by_name"),
                }
            )
        return {"items": items, "count": len(items)}

    @api.get("/matters/{matter_id}/demand")
    async def get_matter_demand(matter_id: str, user=Depends(require_permission("demand.read", get_current_user))):
        m = await _load_matter(matter_id, user["firm_id"])
        _assert_pi_matter(m)
        pi_demand = merge_pi_demand(m.get("pi_demand"))
        insurance = merge_pi_insurance(m.get("pi_insurance"))
        limits_hint = compute_limits_hint(insurance, pi_demand.get("specials_total") or 0)
        incomplete_prep = sum(1 for i in pi_demand.get("prep_checklist", []) if not i.get("complete"))
        ledger_rows = await db.med_ledger.find(
            {"firm_id": user["firm_id"], "matter_id": matter_id},
            {"_id": 0},
        ).to_list(500)
        ledger_items = [merge_ledger_row(r) for r in ledger_rows]
        expense_summary = None
        if summarize_expenses:
            exp_rows = await db.matter_expenses.find(
                {"firm_id": user["firm_id"], "matter_id": matter_id},
                {"_id": 0},
            ).to_list(500)
            expense_summary = summarize_expenses(exp_rows)
        validation = compute_demand_validation(
            exhibits=pi_demand.get("exhibits") or [],
            ledger_rows=ledger_items,
            expense_summary=expense_summary,
            economic=pi_demand.get("economic_damages"),
        )
        return {
            "matter_id": matter_id,
            "pi_demand": pi_demand,
            "limits_hint": limits_hint,
            "prep_incomplete_count": incomplete_prep,
            "validation": validation,
            "expense_summary": expense_summary,
            "can_approve": user.get("role") in APPROVER_ROLES,
            "can_send": user.get("role") in APPROVER_ROLES and pi_demand.get("status") == "approved",
        }

    @api.patch("/matters/{matter_id}/demand")
    async def patch_matter_demand(
        matter_id: str,
        body: PiDemandPatchIn,
        user=Depends(require_permission("demand.draft", get_current_user)),
    ):
        m = await _load_matter(matter_id, user["firm_id"])
        _assert_pi_matter(m)
        pi_demand = merge_pi_demand(m.get("pi_demand"))
        if pi_demand["status"] in ("pending_attorney_review", "sent"):
            raise HTTPException(400, "Cannot edit demand while pending review or after send")

        if body.demand_type is not None:
            pi_demand["demand_type"] = body.demand_type
        if body.general_damages_notes is not None:
            pi_demand["general_damages_notes"] = body.general_damages_notes
        if body.letter_draft_notes is not None:
            pi_demand["letter_draft_notes"] = body.letter_draft_notes
        if body.response_due_date is not None:
            pi_demand["response_due_date"] = body.response_due_date or None

        if body.prep_checklist is not None:
            by_id = {item.id: item for item in body.prep_checklist}
            for row in pi_demand["prep_checklist"]:
                if row["id"] in by_id:
                    patch = by_id[row["id"]]
                    row["complete"] = patch.complete
                    row["notes"] = patch.notes

        if body.economic_damages is not None:
            econ_patch = body.economic_damages.model_dump(exclude_unset=True)
            pi_demand["economic_damages"] = apply_economic_auto_totals(
                {**pi_demand["economic_damages"], **econ_patch}
            )

        if body.exhibits is not None:
            pi_demand["exhibits"] = []
            for idx, ex in enumerate(body.exhibits, start=1):
                pi_demand["exhibits"].append(
                    {
                        "id": ex.id or new_id(),
                        "sort_order": ex.sort_order or idx,
                        "ledger_row_id": ex.ledger_row_id,
                        "document_id": ex.document_id,
                        "provider_name": ex.provider_name,
                        "specialty": ex.specialty,
                        "label": ex.label or ex.provider_name,
                        "amount": round(float(ex.amount or 0), 2),
                        "included": ex.included,
                        "notes": ex.notes,
                    }
                )
            pi_demand["specials_total"] = compute_specials_total(pi_demand["exhibits"])

        await db.matters.update_one(
            {"id": matter_id, "firm_id": user["firm_id"]},
            {"$set": {"pi_demand": pi_demand, "updated_at": now_iso()}},
        )
        return {"matter_id": matter_id, "pi_demand": pi_demand}

    @api.post("/matters/{matter_id}/demand/rebuild-exhibits")
    async def rebuild_demand_exhibits(
        matter_id: str,
        user=Depends(require_permission("demand.draft", get_current_user)),
    ):
        m = await _load_matter(matter_id, user["firm_id"])
        _assert_pi_matter(m)
        pi_demand = merge_pi_demand(m.get("pi_demand"))
        if pi_demand["status"] in ("pending_attorney_review", "sent"):
            raise HTTPException(400, "Cannot rebuild exhibits while pending review or after send")

        rows = await db.med_ledger.find(
            {"firm_id": user["firm_id"], "matter_id": matter_id},
            {"_id": 0},
        ).sort("created_at", 1).to_list(500)
        items = [merge_ledger_row(r) for r in rows]
        pi_demand["exhibits"] = build_exhibits_from_ledger(items, new_id=new_id)
        pi_demand["specials_total"] = compute_specials_total(pi_demand["exhibits"])

        await db.matters.update_one(
            {"id": matter_id, "firm_id": user["firm_id"]},
            {"$set": {"pi_demand": pi_demand, "updated_at": now_iso()}},
        )
        return {"matter_id": matter_id, "pi_demand": pi_demand, "exhibit_count": len(pi_demand["exhibits"])}

    @api.post("/matters/{matter_id}/demand/sync-economic-from-expenses")
    async def sync_economic_from_expenses(
        matter_id: str,
        user=Depends(require_permission("demand.draft", get_current_user)),
    ):
        m = await _load_matter(matter_id, user["firm_id"])
        _assert_pi_matter(m)
        pi_demand = merge_pi_demand(m.get("pi_demand"))
        if pi_demand["status"] in ("pending_attorney_review", "sent"):
            raise HTTPException(400, "Cannot sync economic damages while pending review or after send")
        if not summarize_expenses:
            raise HTTPException(501, "Expense sync not configured")

        exp_rows = await db.matter_expenses.find(
            {"firm_id": user["firm_id"], "matter_id": matter_id},
            {"_id": 0},
        ).to_list(500)
        summary = summarize_expenses(exp_rows)
        by_cat = summary.get("by_category") or {}
        econ = pi_demand["economic_damages"]
        econ["wage_loss_total"] = round(float(by_cat.get("wage_loss", 0)), 2)
        econ["mileage_total"] = round(float(by_cat.get("mileage", 0)), 2)
        econ["rental_car_total"] = round(float(by_cat.get("rental_car", 0)), 2)
        econ["other_expenses_total"] = round(
            float(by_cat.get("copay_oob", 0))
            + float(by_cat.get("court_fee", 0))
            + float(by_cat.get("records_fee", 0))
            + float(by_cat.get("other", 0)),
            2,
        )
        pi_demand["economic_damages"] = econ

        await db.matters.update_one(
            {"id": matter_id, "firm_id": user["firm_id"]},
            {"$set": {"pi_demand": pi_demand, "updated_at": now_iso()}},
        )
        return {"matter_id": matter_id, "pi_demand": pi_demand, "expense_summary": summary}

    @api.post("/matters/{matter_id}/demand/submit-for-review")
    async def submit_demand_for_review(
        matter_id: str,
        user=Depends(require_permission("demand.draft", get_current_user)),
    ):
        m = await _load_matter(matter_id, user["firm_id"])
        _assert_pi_matter(m)
        pi_demand = merge_pi_demand(m.get("pi_demand"))
        if pi_demand["status"] not in ("draft", "rejected"):
            raise HTTPException(400, f"Cannot submit from status '{pi_demand['status']}'")
        if not pi_demand.get("exhibits"):
            raise HTTPException(400, "Add exhibits before submitting — use Rebuild from Meds ledger")
        incomplete = [i for i in pi_demand.get("prep_checklist", []) if not i.get("complete")]
        if len(incomplete) > 3:
            raise HTTPException(
                400,
                f"Complete demand prep checklist first ({len(incomplete)} items open)",
            )

        ts = now_iso()
        pi_demand["status"] = "pending_attorney_review"
        pi_demand["approval"]["requested_at"] = ts
        pi_demand["approval"]["requested_by"] = user["id"]
        pi_demand["approval"]["requested_by_name"] = user.get("name")
        pi_demand["approval"]["rejected_at"] = None
        pi_demand["approval"]["rejected_by"] = None
        pi_demand["approval"]["rejected_by_name"] = None

        await db.matters.update_one(
            {"id": matter_id, "firm_id": user["firm_id"]},
            {"$set": {"pi_demand": pi_demand, "updated_at": ts}},
        )
        await db.activities.insert_one(
            {
                "id": new_id(),
                "firm_id": user["firm_id"],
                "matter_id": matter_id,
                "actor_id": user["id"],
                "actor_name": user.get("name"),
                "type": "demand_submitted_for_review",
                "description": "Demand package submitted for attorney review",
                "created_at": ts,
            }
        )
        return {"matter_id": matter_id, "pi_demand": pi_demand}

    @api.post("/matters/{matter_id}/demand/approve")
    async def approve_demand(
        matter_id: str,
        body: DemandReviewIn,
        user=Depends(require_permission("demand.approve", get_current_user)),
    ):
        m = await _load_matter(matter_id, user["firm_id"])
        _assert_pi_matter(m)
        pi_demand = merge_pi_demand(m.get("pi_demand"))
        if pi_demand["status"] != "pending_attorney_review":
            raise HTTPException(400, "Demand is not pending attorney review")

        ts = now_iso()
        pi_demand["status"] = "approved"
        pi_demand["approval"]["approved_at"] = ts
        pi_demand["approval"]["approved_by"] = user["id"]
        pi_demand["approval"]["approved_by_name"] = user.get("name")
        if body.attorney_notes:
            pi_demand["approval"]["attorney_notes"] = body.attorney_notes

        await db.matters.update_one(
            {"id": matter_id, "firm_id": user["firm_id"]},
            {"$set": {"pi_demand": pi_demand, "updated_at": ts}},
        )
        await db.activities.insert_one(
            {
                "id": new_id(),
                "firm_id": user["firm_id"],
                "matter_id": matter_id,
                "actor_id": user["id"],
                "actor_name": user.get("name"),
                "type": "demand_approved",
                "description": "Attorney approved demand package",
                "created_at": ts,
            }
        )
        return {"matter_id": matter_id, "pi_demand": pi_demand}

    @api.post("/matters/{matter_id}/demand/reject")
    async def reject_demand(
        matter_id: str,
        body: DemandReviewIn,
        user=Depends(require_permission("demand.approve", get_current_user)),
    ):
        m = await _load_matter(matter_id, user["firm_id"])
        _assert_pi_matter(m)
        pi_demand = merge_pi_demand(m.get("pi_demand"))
        if pi_demand["status"] != "pending_attorney_review":
            raise HTTPException(400, "Demand is not pending attorney review")
        if not (body.attorney_notes or "").strip():
            raise HTTPException(400, "Attorney notes required when rejecting demand")

        ts = now_iso()
        pi_demand["status"] = "rejected"
        pi_demand["approval"]["rejected_at"] = ts
        pi_demand["approval"]["rejected_by"] = user["id"]
        pi_demand["approval"]["rejected_by_name"] = user.get("name")
        pi_demand["approval"]["attorney_notes"] = body.attorney_notes

        await db.matters.update_one(
            {"id": matter_id, "firm_id": user["firm_id"]},
            {"$set": {"pi_demand": pi_demand, "updated_at": ts}},
        )
        return {"matter_id": matter_id, "pi_demand": pi_demand}

    @api.post("/matters/{matter_id}/demand/mark-sent")
    async def mark_demand_sent(
        matter_id: str,
        body: DemandSendIn,
        user=Depends(require_permission("demand.send", get_current_user)),
    ):
        m = await _load_matter(matter_id, user["firm_id"])
        _assert_pi_matter(m)
        pi_demand = merge_pi_demand(m.get("pi_demand"))
        if pi_demand["status"] != "approved":
            raise HTTPException(
                403,
                "Demand must be attorney-approved before send — submit for review first",
            )

        ts = now_iso()
        pi_demand["status"] = "sent"
        pi_demand["sent_at"] = ts
        if body.response_due_date:
            pi_demand["response_due_date"] = body.response_due_date

        patch: dict[str, Any] = {"pi_demand": pi_demand, "updated_at": ts}
        await db.matters.update_one({"id": matter_id, "firm_id": user["firm_id"]}, {"$set": patch})

        await db.activities.insert_one(
            {
                "id": new_id(),
                "firm_id": user["firm_id"],
                "matter_id": matter_id,
                "actor_id": user["id"],
                "actor_name": user.get("name"),
                "type": "demand_sent",
                "description": "Demand package marked sent",
                "created_at": ts,
            }
        )
        return {"matter_id": matter_id, "pi_demand": pi_demand}
