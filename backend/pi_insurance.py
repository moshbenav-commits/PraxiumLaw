"""
PI Case OS — matter insurance (3P/1P claims, LOR, limits).
"""
from __future__ import annotations

from typing import Any, Callable, Literal, Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field

LOR_STATUSES = ("not_sent", "sent", "acknowledged")
LIABILITY_STATUSES = ("pending", "accepted", "denied", "partial")
POLICY_TYPES = ("personal", "commercial", "unknown")


def _empty_adjuster() -> dict[str, str]:
    return {"name": "", "phone": "", "fax": "", "email": "", "mailing_address": ""}


def _empty_lor() -> dict[str, Any]:
    return {
        "status": "not_sent",
        "sent_date": None,
        "acknowledged_date": None,
        "follow_up_due": None,
        "document_saved": False,
    }


def _empty_limits() -> dict[str, Any]:
    return {
        "display": "",
        "bi_per_person": None,
        "bi_per_accident": None,
        "um_uim": "",
        "medpay_pip": "",
        "collision": "",
        "limits_source": "",
        "limits_confirmed": False,
    }


def _empty_liability() -> dict[str, Any]:
    return {
        "status": "pending",
        "target_acceptance_date": None,
        "notes": "",
    }


def _empty_medpay() -> dict[str, Any]:
    return {
        "status": "not_opened",
        "limit": None,
        "notes": "",
    }


def default_claim_side() -> dict[str, Any]:
    return {
        "opened": False,
        "opened_date": None,
        "carrier_name": "",
        "policy_type": "unknown",
        "policy_number": "",
        "claim_number": "",
        "driver_is_owner": None,
        "bi_pd_same_adjuster": True,
        "adjuster": _empty_adjuster(),
        "pd_adjuster": _empty_adjuster(),
        "lor": _empty_lor(),
        "limits": _empty_limits(),
        "liability": _empty_liability(),
        "medpay": _empty_medpay(),
        "notes": "",
    }


def default_pi_insurance() -> dict[str, Any]:
    return {
        "claimant_count": 1,
        "related_case_notes": "",
        "carrier_call_pii": {
            "withheld_client_phone": False,
            "withheld_client_address": False,
            "withheld_client_dob": False,
            "withheld_client_ssn": False,
            "withheld_accident_narrative": False,
            "shared_injuries_only": False,
            "defendant_vehicle_confirmed": False,
            "acknowledged_at": None,
        },
        "third_party": default_claim_side(),
        "first_party": default_claim_side(),
        "notes": "",
    }


def _merge_adjuster(existing: dict, patch: Optional[dict]) -> dict[str, str]:
    base = _empty_adjuster()
    if existing:
        base.update({k: existing.get(k) or "" for k in base})
    if patch:
        base.update({k: patch.get(k) if patch.get(k) is not None else base[k] for k in base})
    return base


def _merge_lor(existing: Optional[dict], patch: Optional[dict]) -> dict[str, Any]:
    base = _empty_lor()
    if existing:
        base.update({k: existing.get(k, base[k]) for k in base})
    if patch:
        for k in base:
            if k in patch and patch[k] is not None:
                base[k] = patch[k]
    if base.get("status") not in LOR_STATUSES:
        base["status"] = "not_sent"
    return base


def _merge_limits(existing: Optional[dict], patch: Optional[dict]) -> dict[str, Any]:
    base = _empty_limits()
    if existing:
        base.update({k: existing.get(k, base[k]) for k in base})
    if patch:
        for k in base:
            if k in patch and patch[k] is not None:
                base[k] = patch[k]
    return base


def _merge_liability(existing: Optional[dict], patch: Optional[dict]) -> dict[str, Any]:
    base = _empty_liability()
    if existing:
        base.update({k: existing.get(k, base[k]) for k in base})
    if patch:
        for k in base:
            if k in patch and patch[k] is not None:
                base[k] = patch[k]
    if base.get("status") not in LIABILITY_STATUSES:
        base["status"] = "pending"
    return base


def _merge_medpay(existing: Optional[dict], patch: Optional[dict]) -> dict[str, Any]:
    base = _empty_medpay()
    if existing:
        base.update({k: existing.get(k, base[k]) for k in base})
    if patch:
        for k in base:
            if k in patch and patch[k] is not None:
                base[k] = patch[k]
    return base


def _merge_claim_side(existing: Optional[dict], patch: Optional[dict]) -> dict[str, Any]:
    base = default_claim_side()
    if existing:
        base.update({k: existing.get(k, base[k]) for k in ("opened", "opened_date", "carrier_name", "policy_type", "policy_number", "claim_number", "driver_is_owner", "bi_pd_same_adjuster", "notes")})
        base["adjuster"] = _merge_adjuster(existing.get("adjuster"), None)
        base["pd_adjuster"] = _merge_adjuster(existing.get("pd_adjuster"), None)
        base["lor"] = _merge_lor(existing.get("lor"), None)
        base["limits"] = _merge_limits(existing.get("limits"), None)
        base["liability"] = _merge_liability(existing.get("liability"), None)
        base["medpay"] = _merge_medpay(existing.get("medpay"), None)
    if not patch:
        return base
    for k in ("opened", "opened_date", "carrier_name", "policy_number", "claim_number", "driver_is_owner", "bi_pd_same_adjuster", "notes"):
        if k in patch and patch[k] is not None:
            base[k] = patch[k]
    if "policy_type" in patch and patch["policy_type"] is not None:
        pt = patch["policy_type"]
        base["policy_type"] = pt if pt in POLICY_TYPES else "unknown"
    if "adjuster" in patch and patch["adjuster"] is not None:
        base["adjuster"] = _merge_adjuster(base["adjuster"], patch["adjuster"])
    if "pd_adjuster" in patch and patch["pd_adjuster"] is not None:
        base["pd_adjuster"] = _merge_adjuster(base["pd_adjuster"], patch["pd_adjuster"])
    if "lor" in patch and patch["lor"] is not None:
        base["lor"] = _merge_lor(base["lor"], patch["lor"])
    if "limits" in patch and patch["limits"] is not None:
        base["limits"] = _merge_limits(base["limits"], patch["limits"])
    if "liability" in patch and patch["liability"] is not None:
        base["liability"] = _merge_liability(base["liability"], patch["liability"])
    if "medpay" in patch and patch["medpay"] is not None:
        base["medpay"] = _merge_medpay(base["medpay"], patch["medpay"])
    return base


def merge_pi_insurance(existing: Optional[dict]) -> dict[str, Any]:
    base = default_pi_insurance()
    if not existing:
        return base
    pii = {**base["carrier_call_pii"], **(existing.get("carrier_call_pii") or {})}
    merged = {
        "claimant_count": existing.get("claimant_count", 1) or 1,
        "related_case_notes": existing.get("related_case_notes") or "",
        "carrier_call_pii": pii,
        "third_party": _merge_claim_side(existing.get("third_party"), None),
        "first_party": _merge_claim_side(existing.get("first_party"), None),
        "notes": existing.get("notes") or "",
    }
    return merged


class AdjusterIn(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    fax: Optional[str] = None
    email: Optional[str] = None
    mailing_address: Optional[str] = None


class LorIn(BaseModel):
    status: Optional[Literal["not_sent", "sent", "acknowledged"]] = None
    sent_date: Optional[str] = None
    acknowledged_date: Optional[str] = None
    follow_up_due: Optional[str] = None
    document_saved: Optional[bool] = None


class LimitsIn(BaseModel):
    display: Optional[str] = None
    bi_per_person: Optional[float] = None
    bi_per_accident: Optional[float] = None
    um_uim: Optional[str] = None
    medpay_pip: Optional[str] = None
    collision: Optional[str] = None
    limits_source: Optional[str] = None
    limits_confirmed: Optional[bool] = None


class LiabilityIn(BaseModel):
    status: Optional[Literal["pending", "accepted", "denied", "partial"]] = None
    target_acceptance_date: Optional[str] = None
    notes: Optional[str] = None


class MedpayIn(BaseModel):
    status: Optional[str] = None
    limit: Optional[float] = None
    notes: Optional[str] = None


class ClaimSideIn(BaseModel):
    opened: Optional[bool] = None
    opened_date: Optional[str] = None
    carrier_name: Optional[str] = None
    policy_type: Optional[Literal["personal", "commercial", "unknown"]] = None
    policy_number: Optional[str] = None
    claim_number: Optional[str] = None
    driver_is_owner: Optional[bool] = None
    bi_pd_same_adjuster: Optional[bool] = None
    adjuster: Optional[AdjusterIn] = None
    pd_adjuster: Optional[AdjusterIn] = None
    lor: Optional[LorIn] = None
    limits: Optional[LimitsIn] = None
    liability: Optional[LiabilityIn] = None
    medpay: Optional[MedpayIn] = None
    notes: Optional[str] = None


class CarrierCallPiiIn(BaseModel):
    withheld_client_phone: Optional[bool] = None
    withheld_client_address: Optional[bool] = None
    withheld_client_dob: Optional[bool] = None
    withheld_client_ssn: Optional[bool] = None
    withheld_accident_narrative: Optional[bool] = None
    shared_injuries_only: Optional[bool] = None
    defendant_vehicle_confirmed: Optional[bool] = None
    acknowledged_at: Optional[str] = None


class PiInsurancePatchIn(BaseModel):
    claimant_count: Optional[int] = Field(None, ge=1, le=99)
    related_case_notes: Optional[str] = None
    carrier_call_pii: Optional[CarrierCallPiiIn] = None
    third_party: Optional[ClaimSideIn] = None
    first_party: Optional[ClaimSideIn] = None
    notes: Optional[str] = None


def _side_to_dict(side: Optional[ClaimSideIn]) -> Optional[dict]:
    if side is None:
        return None
    data = side.model_dump(exclude_unset=True)
    out: dict[str, Any] = {}
    for k, v in data.items():
        if v is None:
            continue
        if k in ("adjuster", "pd_adjuster", "lor", "limits", "liability", "medpay") and isinstance(v, dict):
            out[k] = {kk: vv for kk, vv in v.items() if vv is not None}
        else:
            out[k] = v
    return out or None


def register_pi_insurance_routes(api, db, get_current_user: Callable, now_iso: Callable):
    @api.get("/matters/{matter_id}/insurance")
    async def get_matter_insurance(matter_id: str, user=Depends(get_current_user)):
        m = await db.matters.find_one({"id": matter_id, "firm_id": user["firm_id"]}, {"_id": 0, "pi_insurance": 1})
        if not m:
            raise HTTPException(404, "Matter not found")
        return {"matter_id": matter_id, "pi_insurance": merge_pi_insurance(m.get("pi_insurance"))}

    @api.patch("/matters/{matter_id}/insurance")
    async def patch_matter_insurance(matter_id: str, body: PiInsurancePatchIn, user=Depends(get_current_user)):
        m = await db.matters.find_one({"id": matter_id, "firm_id": user["firm_id"]}, {"_id": 0, "pi_insurance": 1})
        if not m:
            raise HTTPException(404, "Matter not found")

        pi = merge_pi_insurance(m.get("pi_insurance"))

        if body.claimant_count is not None:
            pi["claimant_count"] = body.claimant_count
        if body.related_case_notes is not None:
            pi["related_case_notes"] = body.related_case_notes
        if body.notes is not None:
            pi["notes"] = body.notes
        if body.carrier_call_pii is not None:
            pii_patch = body.carrier_call_pii.model_dump(exclude_unset=True)
            pi["carrier_call_pii"] = {**pi["carrier_call_pii"], **pii_patch}

        tp = _side_to_dict(body.third_party)
        if tp is not None:
            pi["third_party"] = _merge_claim_side(pi["third_party"], tp)
        fp = _side_to_dict(body.first_party)
        if fp is not None:
            pi["first_party"] = _merge_claim_side(pi["first_party"], fp)

        await db.matters.update_one(
            {"id": matter_id, "firm_id": user["firm_id"]},
            {"$set": {"pi_insurance": pi, "updated_at": now_iso()}},
        )
        return {"matter_id": matter_id, "pi_insurance": pi}
