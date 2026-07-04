"""
PI Case OS — settlement offers, calculator scenarios, attorney reduction gate.
"""
from __future__ import annotations

from typing import Any, Callable, Literal, Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field

from rbac import require_permission

APPROVER_ROLES = frozenset({"admin", "partner", "attorney"})
OFFER_DIRECTIONS = ("insurance_to_plaintiff", "plaintiff_counter", "insurance_to_plaintiff_final")
REDUCTION_TYPES = ("none", "percent", "flat")


def default_pi_settlement() -> dict[str, Any]:
    return {
        "offers": [],
        "scenarios": [],
        "active_scenario_id": None,
        "default_expenses": 0.0,
        "default_attorney_fee_pct": 33.333,
    }


def merge_pi_settlement(existing: Optional[dict]) -> dict[str, Any]:
    base = default_pi_settlement()
    if not existing:
        return base
    merged = {**base, **{k: v for k, v in existing.items() if k in base}}
    if not isinstance(merged.get("offers"), list):
        merged["offers"] = []
    if not isinstance(merged.get("scenarios"), list):
        merged["scenarios"] = []
    return merged


def _line_reduced_amount(line: dict) -> float:
    balance = float(line.get("balance") or 0)
    rtype = line.get("reduction_type") or "none"
    if rtype == "percent":
        pct = float(line.get("reduction_percent") or 0)
        return round(max(0.0, balance * (1 - pct / 100)), 2)
    if rtype == "flat":
        flat = float(line.get("reduction_flat") or 0)
        return round(max(0.0, balance - flat), 2)
    return round(balance, 2)


def compute_scenario_totals(scenario: dict, *, default_fee_pct: float = 33.333) -> dict[str, Any]:
    lines = scenario.get("line_items") or []
    gross = float(scenario.get("gross_settlement") or 0)
    expenses = float(scenario.get("expenses") or 0)
    medpay = float(scenario.get("medpay_to_client") or 0)
    fee_pct = float(scenario.get("attorney_fee_pct") if scenario.get("attorney_fee_pct") is not None else default_fee_pct)
    fee_flat = scenario.get("attorney_fee_flat")

    total_specials = round(sum(float(l.get("balance") or 0) for l in lines), 2)
    total_med_payout = round(sum(_line_reduced_amount(l) for l in lines), 2)
    total_reductions = round(total_specials - total_med_payout, 2)

    if fee_flat is not None:
        attorney_fee = round(float(fee_flat), 2)
    else:
        attorney_fee = round(gross * fee_pct / 100, 2)

    net_to_client = round(gross - attorney_fee - expenses - total_med_payout + medpay, 2)

    pending_reductions = any(
        float(l.get("balance") or 0) > 0 and (l.get("reduction_type") or "none") == "none"
        for l in lines
    )

    return {
        "total_specials": total_specials,
        "total_med_payout": total_med_payout,
        "total_reductions": total_reductions,
        "attorney_fee": attorney_fee,
        "expenses": expenses,
        "medpay_to_client": medpay,
        "gross_settlement": gross,
        "net_to_client": net_to_client,
        "pending_attorney_reductions": pending_reductions,
        "client_facing_ready": bool(scenario.get("attorney_approved")) and not pending_reductions,
    }


def enrich_scenario(scenario: dict, *, default_fee_pct: float = 33.333) -> dict[str, Any]:
    enriched = {**scenario}
    enriched["computed"] = compute_scenario_totals(enriched, default_fee_pct=default_fee_pct)
    return enriched


def build_line_items_from_ledger(rows: list[dict], *, new_id: Callable) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for row in rows:
        balance = float(row.get("balance") or 0)
        fe = row.get("futures_estimate")
        if balance <= 0 and fe:
            balance = float(fe)
        items.append(
            {
                "id": new_id(),
                "ledger_row_id": row.get("id"),
                "provider_name": row.get("provider_name") or "",
                "specialty": row.get("specialty") or "other",
                "balance": round(balance, 2),
                "reduction_type": "none",
                "reduction_percent": None,
                "reduction_flat": None,
                "reductions_set_by": None,
            }
        )
    return items


class OfferCreateIn(BaseModel):
    amount: float = Field(..., ge=0)
    offer_date: str
    direction: Literal["insurance_to_plaintiff", "plaintiff_counter", "insurance_to_plaintiff_final"] = "insurance_to_plaintiff"
    carrier: str = ""
    adjuster_notes: str = ""
    document_id: Optional[str] = None


class OfferPatchIn(BaseModel):
    amount: Optional[float] = Field(None, ge=0)
    offer_date: Optional[str] = None
    direction: Optional[Literal["insurance_to_plaintiff", "plaintiff_counter", "insurance_to_plaintiff_final"]] = None
    carrier: Optional[str] = None
    adjuster_notes: Optional[str] = None
    document_id: Optional[str] = None


class ScenarioCreateIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    offer_id: Optional[str] = None
    gross_settlement: Optional[float] = Field(None, ge=0)


class LineItemPatchIn(BaseModel):
    id: str
    reduction_type: Optional[Literal["none", "percent", "flat"]] = None
    reduction_percent: Optional[float] = Field(None, ge=0, le=100)
    reduction_flat: Optional[float] = Field(None, ge=0)


class ScenarioPatchIn(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    offer_id: Optional[str] = None
    gross_settlement: Optional[float] = Field(None, ge=0)
    expenses: Optional[float] = Field(None, ge=0)
    medpay_to_client: Optional[float] = Field(None, ge=0)
    attorney_fee_pct: Optional[float] = Field(None, ge=0, le=100)
    attorney_fee_flat: Optional[float] = Field(None, ge=0)
    line_items: Optional[list[LineItemPatchIn]] = None


def _assert_pi_matter(matter: Optional[dict]):
    if not matter:
        raise HTTPException(404, "Matter not found")
    if matter.get("practice_area") != "personal_injury":
        raise HTTPException(400, "Settlement calculator applies to personal injury matters only")


def register_pi_settlement_routes(
    api,
    db,
    get_current_user: Callable,
    new_id: Callable,
    now_iso: Callable,
    *,
    merge_ledger_row: Callable,
):
    async def _load_matter(matter_id: str, firm_id: str):
        return await db.matters.find_one(
            {"id": matter_id, "firm_id": firm_id},
            {"_id": 0, "practice_area": 1, "pi_settlement": 1},
        )

    async def _save_settlement(matter_id: str, firm_id: str, pi_settlement: dict):
        await db.matters.update_one(
            {"id": matter_id, "firm_id": firm_id},
            {"$set": {"pi_settlement": pi_settlement, "updated_at": now_iso()}},
        )

    def _response(pi_settlement: dict, user: dict) -> dict:
        merged = merge_pi_settlement(pi_settlement)
        default_fee = float(merged.get("default_attorney_fee_pct") or 33.333)
        scenarios = [enrich_scenario(s, default_fee_pct=default_fee) for s in merged.get("scenarios", [])]
        return {
            "pi_settlement": {**merged, "scenarios": scenarios},
            "can_set_reductions": user.get("role") in APPROVER_ROLES,
            "can_approve_scenario": user.get("role") in APPROVER_ROLES,
        }

    @api.get("/matters/{matter_id}/settlement")
    async def get_matter_settlement(matter_id: str, user=Depends(require_permission("settlement.read", get_current_user))):
        m = await _load_matter(matter_id, user["firm_id"])
        _assert_pi_matter(m)
        return {"matter_id": matter_id, **_response(m.get("pi_settlement"), user)}

    @api.post("/matters/{matter_id}/settlement/offers")
    async def create_offer(
        matter_id: str,
        body: OfferCreateIn,
        user=Depends(require_permission("settlement.draft", get_current_user)),
    ):
        m = await _load_matter(matter_id, user["firm_id"])
        _assert_pi_matter(m)
        pi_settlement = merge_pi_settlement(m.get("pi_settlement"))
        offer = {
            "id": new_id(),
            "amount": round(float(body.amount), 2),
            "offer_date": body.offer_date,
            "direction": body.direction,
            "carrier": body.carrier.strip(),
            "adjuster_notes": body.adjuster_notes,
            "document_id": body.document_id,
            "created_at": now_iso(),
            "created_by": user["id"],
            "created_by_name": user.get("name"),
        }
        pi_settlement["offers"].append(offer)
        await _save_settlement(matter_id, user["firm_id"], pi_settlement)
        return {"matter_id": matter_id, "offer": offer}

    @api.patch("/matters/{matter_id}/settlement/offers/{offer_id}")
    async def patch_offer(
        matter_id: str,
        offer_id: str,
        body: OfferPatchIn,
        user=Depends(require_permission("settlement.draft", get_current_user)),
    ):
        m = await _load_matter(matter_id, user["firm_id"])
        _assert_pi_matter(m)
        pi_settlement = merge_pi_settlement(m.get("pi_settlement"))
        offer = next((o for o in pi_settlement["offers"] if o.get("id") == offer_id), None)
        if not offer:
            raise HTTPException(404, "Offer not found")
        patch = body.model_dump(exclude_unset=True)
        if "amount" in patch:
            patch["amount"] = round(float(patch["amount"]), 2)
        offer.update(patch)
        await _save_settlement(matter_id, user["firm_id"], pi_settlement)
        return {"matter_id": matter_id, "offer": offer}

    @api.delete("/matters/{matter_id}/settlement/offers/{offer_id}")
    async def delete_offer(
        matter_id: str,
        offer_id: str,
        user=Depends(require_permission("settlement.draft", get_current_user)),
    ):
        m = await _load_matter(matter_id, user["firm_id"])
        _assert_pi_matter(m)
        pi_settlement = merge_pi_settlement(m.get("pi_settlement"))
        before = len(pi_settlement["offers"])
        pi_settlement["offers"] = [o for o in pi_settlement["offers"] if o.get("id") != offer_id]
        if len(pi_settlement["offers"]) == before:
            raise HTTPException(404, "Offer not found")
        await _save_settlement(matter_id, user["firm_id"], pi_settlement)
        return {"deleted": True, "id": offer_id}

    @api.post("/matters/{matter_id}/settlement/scenarios")
    async def create_scenario(
        matter_id: str,
        body: ScenarioCreateIn,
        user=Depends(require_permission("settlement.draft", get_current_user)),
    ):
        m = await _load_matter(matter_id, user["firm_id"])
        _assert_pi_matter(m)
        pi_settlement = merge_pi_settlement(m.get("pi_settlement"))

        gross = body.gross_settlement
        if body.offer_id:
            offer = next((o for o in pi_settlement["offers"] if o.get("id") == body.offer_id), None)
            if not offer:
                raise HTTPException(400, "Linked offer not found")
            gross = gross if gross is not None else offer.get("amount")

        rows = await db.med_ledger.find(
            {"firm_id": user["firm_id"], "matter_id": matter_id},
            {"_id": 0},
        ).sort("created_at", 1).to_list(500)
        line_items = build_line_items_from_ledger([merge_ledger_row(r) for r in rows], new_id=new_id)

        scenario = {
            "id": new_id(),
            "name": body.name.strip(),
            "offer_id": body.offer_id,
            "gross_settlement": round(float(gross or 0), 2),
            "expenses": float(pi_settlement.get("default_expenses") or 0),
            "medpay_to_client": 0.0,
            "attorney_fee_pct": float(pi_settlement.get("default_attorney_fee_pct") or 33.333),
            "attorney_fee_flat": None,
            "line_items": line_items,
            "attorney_approved": False,
            "attorney_approved_at": None,
            "attorney_approved_by": None,
            "created_at": now_iso(),
            "created_by": user["id"],
        }
        pi_settlement["scenarios"].append(scenario)
        pi_settlement["active_scenario_id"] = scenario["id"]
        await _save_settlement(matter_id, user["firm_id"], pi_settlement)
        default_fee = float(pi_settlement.get("default_attorney_fee_pct") or 33.333)
        return {"matter_id": matter_id, "scenario": enrich_scenario(scenario, default_fee_pct=default_fee)}

    @api.post("/matters/{matter_id}/settlement/scenarios/{scenario_id}/sync-from-meds")
    async def sync_scenario_from_meds(
        matter_id: str,
        scenario_id: str,
        user=Depends(require_permission("settlement.draft", get_current_user)),
    ):
        m = await _load_matter(matter_id, user["firm_id"])
        _assert_pi_matter(m)
        pi_settlement = merge_pi_settlement(m.get("pi_settlement"))
        scenario = next((s for s in pi_settlement["scenarios"] if s.get("id") == scenario_id), None)
        if not scenario:
            raise HTTPException(404, "Scenario not found")

        rows = await db.med_ledger.find(
            {"firm_id": user["firm_id"], "matter_id": matter_id},
            {"_id": 0},
        ).sort("created_at", 1).to_list(500)
        existing = {li.get("ledger_row_id"): li for li in scenario.get("line_items", []) if li.get("ledger_row_id")}
        new_lines = []
        for row in [merge_ledger_row(r) for r in rows]:
            rid = row.get("id")
            balance = float(row.get("balance") or 0)
            fe = row.get("futures_estimate")
            if balance <= 0 and fe:
                balance = float(fe)
            if rid in existing:
                line = {**existing[rid], "balance": round(balance, 2), "provider_name": row.get("provider_name") or ""}
            else:
                line = {
                    "id": new_id(),
                    "ledger_row_id": rid,
                    "provider_name": row.get("provider_name") or "",
                    "specialty": row.get("specialty") or "other",
                    "balance": round(balance, 2),
                    "reduction_type": "none",
                    "reduction_percent": None,
                    "reduction_flat": None,
                    "reductions_set_by": None,
                }
            new_lines.append(line)
        scenario["line_items"] = new_lines
        scenario["attorney_approved"] = False
        await _save_settlement(matter_id, user["firm_id"], pi_settlement)
        default_fee = float(pi_settlement.get("default_attorney_fee_pct") or 33.333)
        return {"matter_id": matter_id, "scenario": enrich_scenario(scenario, default_fee_pct=default_fee)}

    @api.patch("/matters/{matter_id}/settlement/scenarios/{scenario_id}")
    async def patch_scenario(
        matter_id: str,
        scenario_id: str,
        body: ScenarioPatchIn,
        user=Depends(require_permission("settlement.draft", get_current_user)),
    ):
        m = await _load_matter(matter_id, user["firm_id"])
        _assert_pi_matter(m)
        pi_settlement = merge_pi_settlement(m.get("pi_settlement"))
        scenario = next((s for s in pi_settlement["scenarios"] if s.get("id") == scenario_id), None)
        if not scenario:
            raise HTTPException(404, "Scenario not found")

        can_reduce = user.get("role") in APPROVER_ROLES

        for field in ("name", "offer_id", "gross_settlement", "expenses", "medpay_to_client"):
            val = getattr(body, field)
            if val is not None:
                if field == "gross_settlement":
                    scenario[field] = round(float(val), 2)
                elif field in ("expenses", "medpay_to_client"):
                    scenario[field] = round(float(val), 2)
                else:
                    scenario[field] = val

        if body.attorney_fee_pct is not None or body.attorney_fee_flat is not None:
            if not can_reduce:
                raise HTTPException(403, "Attorney must set fee percentage or flat amount")
            if body.attorney_fee_pct is not None:
                scenario["attorney_fee_pct"] = float(body.attorney_fee_pct)
                scenario["attorney_fee_flat"] = None
            if body.attorney_fee_flat is not None:
                scenario["attorney_fee_flat"] = round(float(body.attorney_fee_flat), 2)

        if body.line_items is not None:
            by_id = {li.id: li for li in body.line_items}
            for line in scenario.get("line_items", []):
                if line["id"] not in by_id:
                    continue
                patch = by_id[line["id"]]
                if patch.reduction_type is not None or patch.reduction_percent is not None or patch.reduction_flat is not None:
                    if not can_reduce:
                        raise HTTPException(403, "Attorney must set provider reduction percentages or flat amounts")
                    if patch.reduction_type is not None:
                        line["reduction_type"] = patch.reduction_type
                    if patch.reduction_percent is not None:
                        line["reduction_percent"] = float(patch.reduction_percent)
                        line["reduction_type"] = "percent"
                    if patch.reduction_flat is not None:
                        line["reduction_flat"] = round(float(patch.reduction_flat), 2)
                        line["reduction_type"] = "flat"
                    line["reductions_set_by"] = user["id"]
            scenario["attorney_approved"] = False

        pi_settlement["active_scenario_id"] = scenario_id
        await _save_settlement(matter_id, user["firm_id"], pi_settlement)
        default_fee = float(pi_settlement.get("default_attorney_fee_pct") or 33.333)
        return {"matter_id": matter_id, "scenario": enrich_scenario(scenario, default_fee_pct=default_fee)}

    @api.post("/matters/{matter_id}/settlement/scenarios/{scenario_id}/approve")
    async def approve_scenario(
        matter_id: str,
        scenario_id: str,
        user=Depends(require_permission("settlement.approve", get_current_user)),
    ):
        m = await _load_matter(matter_id, user["firm_id"])
        _assert_pi_matter(m)
        pi_settlement = merge_pi_settlement(m.get("pi_settlement"))
        scenario = next((s for s in pi_settlement["scenarios"] if s.get("id") == scenario_id), None)
        if not scenario:
            raise HTTPException(404, "Scenario not found")

        enriched = enrich_scenario(scenario, default_fee_pct=float(pi_settlement.get("default_attorney_fee_pct") or 33.333))
        if enriched["computed"]["pending_attorney_reductions"]:
            raise HTTPException(400, "Set reductions on all provider lines before approving client-facing scenario")

        ts = now_iso()
        scenario["attorney_approved"] = True
        scenario["attorney_approved_at"] = ts
        scenario["attorney_approved_by"] = user["id"]
        await _save_settlement(matter_id, user["firm_id"], pi_settlement)
        await db.activities.insert_one(
            {
                "id": new_id(),
                "firm_id": user["firm_id"],
                "matter_id": matter_id,
                "actor_id": user["id"],
                "actor_name": user.get("name"),
                "type": "settlement_scenario_approved",
                "description": f"Attorney approved settlement scenario: {scenario.get('name')}",
                "created_at": ts,
            }
        )
        return {"matter_id": matter_id, "scenario": enrich_scenario(scenario)}

    @api.delete("/matters/{matter_id}/settlement/scenarios/{scenario_id}")
    async def delete_scenario(
        matter_id: str,
        scenario_id: str,
        user=Depends(require_permission("settlement.draft", get_current_user)),
    ):
        m = await _load_matter(matter_id, user["firm_id"])
        _assert_pi_matter(m)
        pi_settlement = merge_pi_settlement(m.get("pi_settlement"))
        before = len(pi_settlement["scenarios"])
        pi_settlement["scenarios"] = [s for s in pi_settlement["scenarios"] if s.get("id") != scenario_id]
        if len(pi_settlement["scenarios"]) == before:
            raise HTTPException(404, "Scenario not found")
        if pi_settlement.get("active_scenario_id") == scenario_id:
            pi_settlement["active_scenario_id"] = pi_settlement["scenarios"][0]["id"] if pi_settlement["scenarios"] else None
        await _save_settlement(matter_id, user["firm_id"], pi_settlement)
        return {"deleted": True, "id": scenario_id}
