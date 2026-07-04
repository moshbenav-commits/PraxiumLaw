"""
PI Case OS — Meds ledger (providers, balances, COR, FE) + treatment compliance alerts.
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any, Callable, Literal, Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field

COR_STATUSES = ("missing", "received", "na_still_treating")
RECORDS_STATUSES = ("not_requested", "lien_verify", "requested", "partial", "complete")
LOR_STATUSES = ("not_sent", "sent", "complete")
SPECIALTIES = (
    "chiro",
    "pt",
    "pain_management",
    "hospital",
    "er_physician",
    "radiology",
    "ambulance",
    "pharmacy",
    "imaging",
    "primary_care",
    "orthopedics",
    "other",
)

ACTIVE_TREATMENT_SPECIALTIES = frozenset({"chiro", "pt", "pain_management"})
IMAGING_SPECIALTIES = frozenset({"imaging", "radiology"})
GAP_DAYS_THRESHOLD = 21
MRI_WEEKS_THRESHOLD = 8
MRI_DAYS_THRESHOLD = MRI_WEEKS_THRESHOLD * 7


def parse_iso_date(value: Optional[str]) -> Optional[date]:
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def today_utc() -> date:
    return datetime.now(timezone.utc).date()


def _has_imaging_pathway(rows: list[dict]) -> bool:
    for row in rows:
        if row.get("specialty") not in IMAGING_SPECIALTIES:
            continue
        if parse_iso_date(row.get("first_treatment_date")):
            return True
        if row.get("records_status") in ("requested", "partial", "complete"):
            return True
    return False


def _earliest_treatment_anchor(rows: list[dict], incident_date: Optional[str]) -> Optional[date]:
    candidates: list[date] = []
    inc = parse_iso_date(incident_date)
    if inc:
        candidates.append(inc)
    for row in rows:
        for key in ("first_treatment_date", "last_treatment_date"):
            d = parse_iso_date(row.get(key))
            if d:
                candidates.append(d)
    return min(candidates) if candidates else None


def compute_row_compliance(row: dict, *, today: Optional[date] = None) -> dict[str, Any]:
    """Per-provider compliance status aligned with chiro follow-up color codes (article 12)."""
    today = today or today_utc()
    specialty = row.get("specialty", "other")
    still = bool(row.get("still_treating"))
    ltd = parse_iso_date(row.get("last_treatment_date"))
    ntd = parse_iso_date(row.get("next_treatment_date"))
    alerts: list[dict[str, str]] = []

    if not still:
        return {"compliance_status": "completed", "alerts": alerts}

    status = "active"

    if ntd and ntd < today and (not ltd or ltd < ntd):
        status = "no_show"
        alerts.append(
            {
                "code": "no_show",
                "severity": "high",
                "message": f"Possible no-show — NTD {ntd.isoformat()} passed without updated LTD",
            }
        )
    elif specialty in ACTIVE_TREATMENT_SPECIALTIES and not ntd:
        status = "not_confirmed"
        alerts.append(
            {
                "code": "missing_ntd",
                "severity": "medium",
                "message": "Still treating but no next treatment date (NTD) on file",
            }
        )
    elif (
        specialty in ACTIVE_TREATMENT_SPECIALTIES
        and ltd
        and (today - ltd).days >= GAP_DAYS_THRESHOLD
        and (not ntd or ntd < today)
    ):
        status = "treatment_gap"
        gap_days = (today - ltd).days
        alerts.append(
            {
                "code": "treatment_gap",
                "severity": "high",
                "message": f"Treatment gap — {gap_days} days since last treatment (insurance will argue injury healed)",
            }
        )

    return {"compliance_status": status, "alerts": alerts}


def compute_matter_treatment_alerts(
    rows: list[dict],
    *,
    incident_date: Optional[str] = None,
    today: Optional[date] = None,
) -> list[dict[str, Any]]:
    """Matter-level + row-level treatment compliance alerts (UX-008)."""
    today = today or today_utc()
    alerts: list[dict[str, Any]] = []

    for row in rows:
        comp = compute_row_compliance(row, today=today)
        row_id = row.get("id")
        provider = row.get("provider_name") or "Provider"
        for a in comp["alerts"]:
            alerts.append(
                {
                    **a,
                    "row_id": row_id,
                    "provider_name": provider,
                    "specialty": row.get("specialty"),
                    "compliance_status": comp["compliance_status"],
                }
            )

    anchor = _earliest_treatment_anchor(rows, incident_date)
    conservative_active = any(
        r.get("still_treating") and r.get("specialty") in ACTIVE_TREATMENT_SPECIALTIES for r in rows
    )
    if anchor and conservative_active and not _has_imaging_pathway(rows):
        days_since = (today - anchor).days
        if days_since >= MRI_DAYS_THRESHOLD:
            alerts.append(
                {
                    "code": "mri_overdue",
                    "severity": "high",
                    "message": (
                        f"No MRI/imaging pathway after {days_since} days "
                        f"(training target: ~{MRI_WEEKS_THRESHOLD} weeks) — settlement value at risk"
                    ),
                    "row_id": None,
                    "provider_name": None,
                    "specialty": None,
                    "compliance_status": "mri_overdue",
                    "days_since_anchor": days_since,
                }
            )

    return alerts


def enrich_ledger_items(rows: list[dict], *, incident_date: Optional[str] = None) -> list[dict]:
    today = today_utc()
    enriched = []
    for row in rows:
        merged = merge_ledger_row(row)
        comp = compute_row_compliance(merged, today=today)
        enriched.append({**merged, **comp})
    return enriched


def default_ledger_row(
    *,
    row_id: str,
    firm_id: str,
    matter_id: str,
    provider_name: str = "",
    now_iso: str,
) -> dict:
    return {
        "id": row_id,
        "firm_id": firm_id,
        "matter_id": matter_id,
        "provider_name": provider_name,
        "specialty": "other",
        "provider_id": None,
        "first_treatment_date": None,
        "last_treatment_date": None,
        "next_treatment_date": None,
        "still_treating": True,
        "balance": 0.0,
        "lien_holder": "",
        "lien_amount": 0.0,
        "futures_estimate": None,
        "futures_estimate_date": None,
        "staff_initials": "",
        "cor_status": "na_still_treating",
        "records_status": "not_requested",
        "lor_status": "not_sent",
        "portal_notes": "",
        "notes": "",
        "created_at": now_iso,
        "updated_at": now_iso,
    }


def merge_ledger_row(existing: dict) -> dict:
    defaults = default_ledger_row(
        row_id=existing.get("id", ""),
        firm_id=existing.get("firm_id", ""),
        matter_id=existing.get("matter_id", ""),
        provider_name=existing.get("provider_name", ""),
        now_iso=existing.get("created_at", ""),
    )
    merged = {**defaults, **existing}
    if merged.get("cor_status") not in COR_STATUSES:
        merged["cor_status"] = "missing" if not merged.get("still_treating") else "na_still_treating"
    if merged.get("records_status") not in RECORDS_STATUSES:
        merged["records_status"] = "not_requested"
    if merged.get("lor_status") not in LOR_STATUSES:
        merged["lor_status"] = "not_sent"
    if merged.get("specialty") not in SPECIALTIES:
        merged["specialty"] = "other"
    return merged


def summarize_ledger(rows: list[dict], *, alerts: Optional[list[dict]] = None) -> dict:
    total_balance = sum(float(r.get("balance") or 0) for r in rows)
    total_lien = sum(float(r.get("lien_amount") or 0) for r in rows)
    total_fe = sum(float(r.get("futures_estimate") or 0) for r in rows if r.get("futures_estimate"))
    missing_cor = sum(
        1
        for r in rows
        if not r.get("still_treating") and r.get("cor_status") == "missing"
    )
    still_treating = sum(1 for r in rows if r.get("still_treating"))
    alert_list = alerts or []
    by_code: dict[str, int] = {}
    for a in alert_list:
        code = a.get("code", "unknown")
        by_code[code] = by_code.get(code, 0) + 1
    return {
        "provider_count": len(rows),
        "total_balance": round(total_balance, 2),
        "total_lien": round(total_lien, 2),
        "total_futures_estimate": round(total_fe, 2),
        "missing_cor_count": missing_cor,
        "still_treating_count": still_treating,
        "alert_count": len(alert_list),
        "alerts_by_code": by_code,
    }


class MedLedgerCreateIn(BaseModel):
    provider_name: str = Field(..., min_length=1, max_length=200)
    specialty: Literal[
        "chiro",
        "pt",
        "pain_management",
        "hospital",
        "er_physician",
        "radiology",
        "ambulance",
        "pharmacy",
        "imaging",
        "primary_care",
        "orthopedics",
        "other",
    ] = "other"


class MedLedgerPatchIn(BaseModel):
    provider_name: Optional[str] = Field(None, min_length=1, max_length=200)
    specialty: Optional[
        Literal[
            "chiro",
            "pt",
            "pain_management",
            "hospital",
            "er_physician",
            "radiology",
            "ambulance",
            "pharmacy",
            "imaging",
            "primary_care",
            "orthopedics",
            "other",
        ]
    ] = None
    provider_id: Optional[str] = None
    first_treatment_date: Optional[str] = None
    last_treatment_date: Optional[str] = None
    next_treatment_date: Optional[str] = None
    still_treating: Optional[bool] = None
    balance: Optional[float] = None
    lien_holder: Optional[str] = None
    lien_amount: Optional[float] = None
    futures_estimate: Optional[float] = None
    futures_estimate_date: Optional[str] = None
    staff_initials: Optional[str] = Field(None, max_length=8)
    cor_status: Optional[Literal["missing", "received", "na_still_treating"]] = None
    records_status: Optional[
        Literal["not_requested", "lien_verify", "requested", "partial", "complete"]
    ] = None
    lor_status: Optional[Literal["not_sent", "sent", "complete"]] = None
    portal_notes: Optional[str] = None
    notes: Optional[str] = None


def register_pi_meds_routes(api, db, get_current_user: Callable, new_id: Callable, now_iso: Callable):
    async def _assert_matter(matter_id: str, firm_id: str):
        m = await db.matters.find_one({"id": matter_id, "firm_id": firm_id}, {"_id": 0, "id": 1})
        if not m:
            raise HTTPException(404, "Matter not found")

    @api.get("/matters/{matter_id}/meds-ledger")
    async def list_meds_ledger(matter_id: str, user=Depends(get_current_user)):
        matter = await db.matters.find_one(
            {"id": matter_id, "firm_id": user["firm_id"]},
            {"_id": 0, "id": 1, "incident_date": 1},
        )
        if not matter:
            raise HTTPException(404, "Matter not found")
        rows = await db.med_ledger.find(
            {"firm_id": user["firm_id"], "matter_id": matter_id},
            {"_id": 0},
        ).sort("created_at", 1).to_list(500)
        items = enrich_ledger_items(rows, incident_date=matter.get("incident_date"))
        alerts = compute_matter_treatment_alerts(items, incident_date=matter.get("incident_date"))
        return {
            "matter_id": matter_id,
            "items": items,
            "alerts": alerts,
            "summary": summarize_ledger(items, alerts=alerts),
        }

    @api.post("/matters/{matter_id}/meds-ledger")
    async def create_meds_ledger_row(matter_id: str, body: MedLedgerCreateIn, user=Depends(get_current_user)):
        await _assert_matter(matter_id, user["firm_id"])
        ts = now_iso()
        doc = default_ledger_row(
            row_id=new_id(),
            firm_id=user["firm_id"],
            matter_id=matter_id,
            provider_name=body.provider_name.strip(),
            now_iso=ts,
        )
        doc["specialty"] = body.specialty
        doc["updated_at"] = ts
        await db.med_ledger.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @api.patch("/meds-ledger/{row_id}")
    async def patch_meds_ledger_row(row_id: str, body: MedLedgerPatchIn, user=Depends(get_current_user)):
        existing = await db.med_ledger.find_one({"id": row_id, "firm_id": user["firm_id"]}, {"_id": 0})
        if not existing:
            raise HTTPException(404, "Meds ledger row not found")
        patch = body.model_dump(exclude_unset=True)
        if not patch:
            return merge_ledger_row(existing)
        patch["updated_at"] = now_iso()
        if "still_treating" in patch:
            if patch["still_treating"] and patch.get("cor_status") is None:
                if existing.get("cor_status") == "missing":
                    patch["cor_status"] = "na_still_treating"
            elif patch["still_treating"] is False and patch.get("cor_status") is None:
                if existing.get("cor_status") == "na_still_treating":
                    patch["cor_status"] = "missing"
        await db.med_ledger.update_one({"id": row_id, "firm_id": user["firm_id"]}, {"$set": patch})
        updated = await db.med_ledger.find_one({"id": row_id}, {"_id": 0})
        return merge_ledger_row(updated)

    @api.delete("/meds-ledger/{row_id}")
    async def delete_meds_ledger_row(row_id: str, user=Depends(get_current_user)):
        res = await db.med_ledger.delete_one({"id": row_id, "firm_id": user["firm_id"]})
        if res.deleted_count == 0:
            raise HTTPException(404, "Meds ledger row not found")
        return {"deleted": True, "id": row_id}
