"""
Client portal — the settlement page a client sees ONLY after login, and ONLY once
their matter has a client-facing settlement.

Ricardo (Gold Medal Injury, 2026-09-04): "that page only pops up inside when people
log in and have already a settlement and randy is pointing and the two attorneys
standing next in the desk … they say we get you the gold."

Gate = the product's own definition of a settlement the client may see:
`pi_settlement` has an active (or attorney-approved) scenario whose computed
`client_facing_ready` is true — attorney approved and no medical line still
awaiting a reduction decision (pi_settlement.compute_scenario_totals). Nothing
here invents a status; nothing here is reachable without a portal token.

The celebration image/caption are FIRM settings (`settings.settlement_celebration`)
so a firm's own attorneys appear only for that firm's clients. Gold Medal Injury's
image is the identity-pipeline group shot (Randy pointing, Stikovac + Than Oun
standing at the desk); the caption is HTML text — never baked into pixels.
"""
from __future__ import annotations

from typing import Any, Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field

from pi_settlement import compute_scenario_totals, merge_pi_settlement

DEFAULT_CAPTION = "We get you the gold."

CELEBRATION_KEYS = ("image_url", "image_alt", "caption", "note")


class SettlementCelebrationPatch(BaseModel):
    image_url: Optional[str] = Field(None, max_length=500)
    image_alt: Optional[str] = Field(None, max_length=300)
    caption: Optional[str] = Field(None, max_length=120)
    note: Optional[str] = Field(None, max_length=600)


def pick_client_scenario(pi_settlement: Optional[dict]) -> Optional[dict]:
    """The scenario a client may see: the active one if approved, else the most
    recently approved one. None when nothing is client-facing ready."""
    merged = merge_pi_settlement(pi_settlement)
    fee_pct = float(merged.get("default_attorney_fee_pct") or 33.333)
    scenarios = [s for s in merged.get("scenarios") or [] if isinstance(s, dict)]
    ready = []
    for s in scenarios:
        computed = compute_scenario_totals(s, default_fee_pct=fee_pct)
        if computed.get("client_facing_ready"):
            ready.append({**s, "computed": computed})
    if not ready:
        return None
    active_id = merged.get("active_scenario_id")
    for s in ready:
        if s.get("id") == active_id:
            return s
    ready.sort(key=lambda s: str(s.get("attorney_approved_at") or ""), reverse=True)
    return ready[0]


def celebration_from_firm(firm: Optional[dict]) -> dict:
    raw = (((firm or {}).get("settings") or {}).get("settlement_celebration") or {})
    out = {k: raw.get(k) for k in CELEBRATION_KEYS if raw.get(k)}
    out.setdefault("caption", DEFAULT_CAPTION)
    return out


def portal_settlement_view(matter: Optional[dict], firm: Optional[dict]) -> dict:
    """Pure: what the client portal shows. `ready: False` carries nothing else —
    the page must not render on it."""
    if not matter:
        return {"ready": False}
    scenario = pick_client_scenario(matter.get("pi_settlement"))
    if not scenario:
        return {"ready": False}
    c = scenario["computed"]
    return {
        "ready": True,
        "matter": {"id": matter.get("id"), "title": matter.get("title"), "case_number": matter.get("case_number")},
        "firm": {"name": (firm or {}).get("name")},
        "celebration": celebration_from_firm(firm),
        "summary": {
            "scenario_name": scenario.get("name"),
            "approved_at": scenario.get("attorney_approved_at"),
            "gross_settlement": c.get("gross_settlement"),
            "attorney_fee": c.get("attorney_fee"),
            "expenses": c.get("expenses"),
            "medical_payout": c.get("total_med_payout"),
            "medical_reductions": c.get("total_reductions"),
            "medpay_to_client": c.get("medpay_to_client"),
            "net_to_client": c.get("net_to_client"),
        },
    }


def register_portal_settlement_routes(api, db, get_current_portal_client, _assert_matter_access) -> None:
    @api.get("/portal/matters/{matter_id}/settlement")
    async def portal_matter_settlement(matter_id: str, portal=Depends(get_current_portal_client)):
        _assert_matter_access(portal, matter_id)
        m = await db.matters.find_one(
            {"id": matter_id, "firm_id": portal["firm_id"]},
            {"_id": 0, "id": 1, "title": 1, "case_number": 1, "pi_settlement": 1},
        )
        if not m:
            raise HTTPException(404)
        firm = await db.firms.find_one({"id": portal["firm_id"]}, {"_id": 0, "name": 1, "settings": 1})
        return portal_settlement_view(m, firm)


def register_firm_settlement_celebration_routes(api, db, get_current_user, require_permission, log_audit, new_id, now_iso) -> None:
    """Firm side: set the celebration image/caption. Merges into settings — the
    generic PATCH /firm/settings replaces `settings` wholesale, which would drop
    timezone/white_label; this mirrors the white-label endpoint instead."""

    @api.get("/firm/settlement-celebration")
    async def get_settlement_celebration(user=Depends(get_current_user)):
        firm = await db.firms.find_one({"id": user["firm_id"]}, {"_id": 0, "name": 1, "settings": 1})
        return {"settlement_celebration": celebration_from_firm(firm)}

    @api.patch("/firm/settlement-celebration")
    async def patch_settlement_celebration(
        body: SettlementCelebrationPatch,
        user=Depends(require_permission("settings.write", get_current_user)),
    ):
        firm = await db.firms.find_one({"id": user["firm_id"]}, {"_id": 0, "settings": 1})
        settings = (firm or {}).get("settings") or {}
        current = settings.get("settlement_celebration") or {}
        patch = {k: v for k, v in body.model_dump().items() if v is not None}
        current.update(patch)
        settings["settlement_celebration"] = current
        await db.firms.update_one({"id": user["firm_id"]}, {"$set": {"settings": settings}})
        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user["name"],
            action="firm.settlement_celebration_updated",
            resource_type="firm",
            resource_id=user["firm_id"],
            detail={"keys": list(patch.keys())},
            new_id=new_id,
            now_iso=now_iso,
        )
        return {"settlement_celebration": celebration_from_firm({"settings": settings})}
