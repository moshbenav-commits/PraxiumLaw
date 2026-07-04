"""
PI Case OS — property damage (PD) sub-module: rental, estimates, total loss, daily follow-up.
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any, Callable, Literal, Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field

PD_STATUSES = ("active", "resolved", "total_loss", "not_applicable")
CLAIM_TRACKS = ("undecided", "third_party", "first_party", "both")
LIABILITY_PD_STATUSES = ("pending", "accepted", "denied", "partial")
RENTAL_AUTH = ("none", "pending", "approved", "denied")
ESTIMATE_SOURCES = ("insurer", "body_shop", "independent", "other")
TOTAL_LOSS_THRESHOLD_PCT = 60.0


def default_pi_property_damage() -> dict[str, Any]:
    return {
        "status": "active",
        "claim_track": "undecided",
        "liability_pd_status": "pending",
        "police_report_ordered": False,
        "police_report_received": False,
        "vehicle": {
            "year": "",
            "make": "",
            "model": "",
            "vin": "",
            "market_value": None,
            "location_notes": "",
        },
        "estimates": [],
        "total_loss": {
            "is_total_loss": None,
            "acv": None,
            "primary_repair_estimate": None,
            "threshold_pct": TOTAL_LOSS_THRESHOLD_PCT,
        },
        "rental": {
            "in_rental": False,
            "daily_rate": None,
            "start_date": None,
            "end_date": None,
            "provider": "",
            "authorization_status": "none",
        },
        "loss_of_use": {
            "days_without_vehicle": 0,
            "daily_rate": None,
        },
        "daily_follow_up_required": True,
        "last_follow_up_date": None,
        "next_follow_up_date": None,
        "follow_up_notes": "",
        "client_coaching_done": False,
        "blockers": "",
    }


def merge_pi_property_damage(existing: Optional[dict]) -> dict[str, Any]:
    base = default_pi_property_damage()
    if not existing:
        return base
    merged = {**base, **{k: v for k, v in existing.items() if k in base and k not in ("vehicle", "total_loss", "rental", "loss_of_use", "estimates")}}
    merged["vehicle"] = {**base["vehicle"], **(existing.get("vehicle") or {})}
    merged["total_loss"] = {**base["total_loss"], **(existing.get("total_loss") or {})}
    merged["rental"] = {**base["rental"], **(existing.get("rental") or {})}
    merged["loss_of_use"] = {**base["loss_of_use"], **(existing.get("loss_of_use") or {})}
    if not isinstance(merged.get("estimates"), list):
        merged["estimates"] = []
    if merged.get("status") not in PD_STATUSES:
        merged["status"] = "active"
    return merged


def _parse_date(value: Optional[str]) -> Optional[date]:
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def _primary_estimate_amount(estimates: list[dict]) -> Optional[float]:
    primary = next((e for e in estimates if e.get("is_primary")), None)
    if primary and primary.get("amount") is not None:
        return float(primary["amount"])
    amounts = [float(e["amount"]) for e in estimates if e.get("amount") is not None]
    return max(amounts) if amounts else None


def compute_pd_summary(pd: dict, *, incident_date: Optional[str] = None) -> dict[str, Any]:
    estimates = pd.get("estimates") or []
    acv = pd.get("total_loss", {}).get("acv")
    repair = pd.get("total_loss", {}).get("primary_repair_estimate")
    if repair is None:
        repair = _primary_estimate_amount(estimates)
    threshold = float(pd.get("total_loss", {}).get("threshold_pct") or TOTAL_LOSS_THRESHOLD_PCT)

    total_loss_likely = None
    if acv and repair and float(acv) > 0:
        total_loss_likely = (float(repair) / float(acv)) * 100 >= threshold

    lou = pd.get("loss_of_use") or {}
    days = int(lou.get("days_without_vehicle") or 0)
    lou_rate = lou.get("daily_rate")
    loss_of_use_amount = round(days * float(lou_rate), 2) if lou_rate else None

    rental = pd.get("rental") or {}
    alerts: list[dict[str, str]] = []

    if pd.get("status") == "active" and pd.get("daily_follow_up_required"):
        last = _parse_date(pd.get("last_follow_up_date"))
        today = datetime.now(timezone.utc).date()
        if last is None or (today - last).days >= 1:
            alerts.append(
                {
                    "code": "daily_follow_up_due",
                    "severity": "high",
                    "message": "PD daily follow-up due — rental/repair delays are a top client-retention risk",
                }
            )

    if pd.get("liability_pd_status") == "pending" and incident_date:
        inc = _parse_date(incident_date)
        if inc and (datetime.now(timezone.utc).date() - inc).days > 30:
            alerts.append(
                {
                    "code": "liability_pd_stale",
                    "severity": "medium",
                    "message": "3P liability still pending after 30 days — PD may remain blocked",
                }
            )

    if total_loss_likely is True and not pd.get("total_loss", {}).get("is_total_loss"):
        alerts.append(
            {
                "code": "total_loss_threshold",
                "severity": "medium",
                "message": f"Repair estimate ≥ {threshold:.0f}% of ACV — expect total-loss analysis",
            }
        )

    insurer_est = next((e for e in estimates if e.get("source") == "insurer"), None)
    shop_est = next((e for e in estimates if e.get("source") in ("body_shop", "independent")), None)
    if insurer_est and shop_est and float(insurer_est.get("amount") or 0) > 0:
        ratio = float(shop_est.get("amount") or 0) / float(insurer_est["amount"])
        if ratio >= 2:
            alerts.append(
                {
                    "code": "estimate_gap",
                    "severity": "medium",
                    "message": "Independent/body-shop estimate much higher than insurer — low PD used against BI",
                }
            )

    if rental.get("in_rental") and rental.get("authorization_status") in ("none", "pending", "denied"):
        alerts.append(
            {
                "code": "rental_blocked",
                "severity": "high",
                "message": "Client in rental but authorization not approved — follow up daily",
            }
        )

    return {
        "primary_repair_estimate": repair,
        "total_loss_likely": total_loss_likely,
        "loss_of_use_amount": loss_of_use_amount,
        "estimate_count": len(estimates),
        "alerts": alerts,
        "alert_count": len(alerts),
    }


class VehicleIn(BaseModel):
    year: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    vin: Optional[str] = None
    market_value: Optional[float] = Field(None, ge=0)
    location_notes: Optional[str] = None


class EstimateIn(BaseModel):
    id: Optional[str] = None
    source: Literal["insurer", "body_shop", "independent", "other"] = "body_shop"
    amount: float = Field(..., ge=0)
    estimate_date: Optional[str] = None
    shop_name: str = ""
    document_id: Optional[str] = None
    notes: str = ""
    is_primary: bool = False


class TotalLossIn(BaseModel):
    is_total_loss: Optional[bool] = None
    acv: Optional[float] = Field(None, ge=0)
    primary_repair_estimate: Optional[float] = Field(None, ge=0)
    threshold_pct: Optional[float] = Field(None, ge=0, le=100)


class RentalIn(BaseModel):
    in_rental: Optional[bool] = None
    daily_rate: Optional[float] = Field(None, ge=0)
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    provider: Optional[str] = None
    authorization_status: Optional[Literal["none", "pending", "approved", "denied"]] = None


class LossOfUseIn(BaseModel):
    days_without_vehicle: Optional[int] = Field(None, ge=0)
    daily_rate: Optional[float] = Field(None, ge=0)


class PiPropertyDamagePatchIn(BaseModel):
    status: Optional[Literal["active", "resolved", "total_loss", "not_applicable"]] = None
    claim_track: Optional[Literal["undecided", "third_party", "first_party", "both"]] = None
    liability_pd_status: Optional[Literal["pending", "accepted", "denied", "partial"]] = None
    police_report_ordered: Optional[bool] = None
    police_report_received: Optional[bool] = None
    vehicle: Optional[VehicleIn] = None
    estimates: Optional[list[EstimateIn]] = None
    total_loss: Optional[TotalLossIn] = None
    rental: Optional[RentalIn] = None
    loss_of_use: Optional[LossOfUseIn] = None
    daily_follow_up_required: Optional[bool] = None
    last_follow_up_date: Optional[str] = None
    next_follow_up_date: Optional[str] = None
    follow_up_notes: Optional[str] = None
    client_coaching_done: Optional[bool] = None
    blockers: Optional[str] = None


def _assert_pi_matter(matter: Optional[dict]):
    if not matter:
        raise HTTPException(404, "Matter not found")
    if matter.get("practice_area") != "personal_injury":
        raise HTTPException(400, "Property damage module applies to personal injury matters only")


def register_pi_property_damage_routes(api, db, get_current_user: Callable, new_id: Callable, now_iso: Callable):
    @api.get("/matters/{matter_id}/property-damage")
    async def get_property_damage(matter_id: str, user=Depends(get_current_user)):
        m = await db.matters.find_one(
            {"id": matter_id, "firm_id": user["firm_id"]},
            {"_id": 0, "practice_area": 1, "pi_property_damage": 1, "incident_date": 1},
        )
        _assert_pi_matter(m)
        pd = merge_pi_property_damage(m.get("pi_property_damage"))
        summary = compute_pd_summary(pd, incident_date=m.get("incident_date"))
        return {"matter_id": matter_id, "pi_property_damage": pd, "summary": summary}

    @api.patch("/matters/{matter_id}/property-damage")
    async def patch_property_damage(
        matter_id: str,
        body: PiPropertyDamagePatchIn,
        user=Depends(get_current_user),
    ):
        m = await db.matters.find_one(
            {"id": matter_id, "firm_id": user["firm_id"]},
            {"_id": 0, "practice_area": 1, "pi_property_damage": 1, "incident_date": 1},
        )
        _assert_pi_matter(m)
        pd = merge_pi_property_damage(m.get("pi_property_damage"))

        for field in (
            "status",
            "claim_track",
            "liability_pd_status",
            "police_report_ordered",
            "police_report_received",
            "daily_follow_up_required",
            "last_follow_up_date",
            "next_follow_up_date",
            "follow_up_notes",
            "client_coaching_done",
            "blockers",
        ):
            val = getattr(body, field)
            if val is not None:
                pd[field] = val

        if body.vehicle is not None:
            pd["vehicle"].update(body.vehicle.model_dump(exclude_unset=True))
            if body.vehicle.market_value is not None:
                pd["total_loss"]["acv"] = body.vehicle.market_value

        if body.total_loss is not None:
            pd["total_loss"].update(body.total_loss.model_dump(exclude_unset=True))

        if body.rental is not None:
            pd["rental"].update(body.rental.model_dump(exclude_unset=True))

        if body.loss_of_use is not None:
            pd["loss_of_use"].update(body.loss_of_use.model_dump(exclude_unset=True))

        if body.estimates is not None:
            pd["estimates"] = []
            for idx, est in enumerate(body.estimates):
                pd["estimates"].append(
                    {
                        "id": est.id or new_id(),
                        "source": est.source,
                        "amount": round(float(est.amount), 2),
                        "estimate_date": est.estimate_date,
                        "shop_name": est.shop_name,
                        "document_id": est.document_id,
                        "notes": est.notes,
                        "is_primary": est.is_primary or (idx == 0 and len(body.estimates) == 1),
                    }
                )
            if any(e.is_primary for e in body.estimates):
                primary_id = next(e.id or pd["estimates"][i]["id"] for i, e in enumerate(body.estimates) if e.is_primary)
                for row in pd["estimates"]:
                    row["is_primary"] = row["id"] == primary_id

        await db.matters.update_one(
            {"id": matter_id, "firm_id": user["firm_id"]},
            {"$set": {"pi_property_damage": pd, "updated_at": now_iso()}},
        )
        summary = compute_pd_summary(pd, incident_date=m.get("incident_date"))
        return {"matter_id": matter_id, "pi_property_damage": pd, "summary": summary}

    @api.post("/matters/{matter_id}/property-damage/log-follow-up")
    async def log_pd_follow_up(matter_id: str, user=Depends(get_current_user)):
        m = await db.matters.find_one(
            {"id": matter_id, "firm_id": user["firm_id"]},
            {"_id": 0, "practice_area": 1, "pi_property_damage": 1, "incident_date": 1},
        )
        _assert_pi_matter(m)
        pd = merge_pi_property_damage(m.get("pi_property_damage"))
        today = datetime.now(timezone.utc).date().isoformat()
        pd["last_follow_up_date"] = today
        await db.matters.update_one(
            {"id": matter_id, "firm_id": user["firm_id"]},
            {"$set": {"pi_property_damage": pd, "updated_at": now_iso()}},
        )
        summary = compute_pd_summary(pd, incident_date=m.get("incident_date"))
        return {"matter_id": matter_id, "pi_property_damage": pd, "summary": summary}
