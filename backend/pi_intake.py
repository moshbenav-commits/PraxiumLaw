"""
PI Case OS — matter intake (Needs List, team roles, conflict check).
"""
from __future__ import annotations

from typing import Any, Callable, Literal, Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel

NEEDS_LIST_DEFAULTS: tuple[dict[str, str], ...] = (
    {"id": "decl_page", "label": "Insurance declaration page (not just card)"},
    {"id": "hospital_bills", "label": "Hospital bills"},
    {"id": "hospital_records", "label": "Hospital records"},
    {"id": "ambulance_bills", "label": "Ambulance bills"},
    {"id": "medical_bills", "label": "Other medical bills in hand"},
    {"id": "drivers_license", "label": "Driver's license / ID"},
    {"id": "health_ins_card", "label": "Health insurance card"},
    {"id": "ssn_info", "label": "Social Security information (as required for forms)"},
    {"id": "vehicle_reg", "label": "Vehicle registration (optional)"},
    {"id": "exchange_ticket", "label": "Accident exchange ticket / defendant info"},
    {"id": "body_shop", "label": "Body shop or tow-yard information"},
    {"id": "repair_estimate", "label": "Vehicle repair estimate"},
)


def default_needs_list() -> list[dict[str, Any]]:
    return [{"id": item["id"], "label": item["label"], "received": False, "notes": ""} for item in NEEDS_LIST_DEFAULTS]


def default_pi_intake() -> dict[str, Any]:
    return {
        "needs_list": default_needs_list(),
        "appointments_notes": "",
        "medicare_recipient": None,
        "conflict_check_status": "pending",
        "conflict_notes": "",
        "case_manager_id": None,
        "supervising_attorney_id": None,
        "intake_staff_id": None,
    }


def merge_pi_intake(existing: Optional[dict]) -> dict[str, Any]:
    base = default_pi_intake()
    if not existing:
        return base
    merged = {**base, **{k: v for k, v in existing.items() if k in base}}
    if existing.get("needs_list"):
        by_id = {i["id"]: i for i in existing["needs_list"] if isinstance(i, dict) and i.get("id")}
        merged["needs_list"] = []
        for default in default_needs_list():
            saved = by_id.get(default["id"], {})
            merged["needs_list"].append(
                {
                    "id": default["id"],
                    "label": default.get("label") or saved.get("label", ""),
                    "received": bool(saved.get("received", False)),
                    "notes": saved.get("notes") or "",
                }
            )
    return merged


class NeedsListItemIn(BaseModel):
    id: str
    received: bool = False
    notes: str = ""


class PiIntakePatchIn(BaseModel):
    needs_list: Optional[list[NeedsListItemIn]] = None
    appointments_notes: Optional[str] = None
    medicare_recipient: Optional[bool] = None
    conflict_check_status: Optional[Literal["pending", "clear", "flagged"]] = None
    conflict_notes: Optional[str] = None
    case_manager_id: Optional[str] = None
    supervising_attorney_id: Optional[str] = None
    intake_staff_id: Optional[str] = None


def register_pi_intake_routes(api, db, get_current_user: Callable, now_iso: Callable):
    @api.get("/pi/intake/needs-list-defaults")
    async def needs_list_defaults(user=Depends(get_current_user)):
        return {"items": default_needs_list()}

    @api.get("/matters/{matter_id}/intake")
    async def get_matter_intake(matter_id: str, user=Depends(get_current_user)):
        m = await db.matters.find_one({"id": matter_id, "firm_id": user["firm_id"]}, {"_id": 0, "pi_intake": 1, "id": 1})
        if not m:
            raise HTTPException(404, "Matter not found")
        return {"matter_id": matter_id, "pi_intake": merge_pi_intake(m.get("pi_intake"))}

    @api.patch("/matters/{matter_id}/intake")
    async def patch_matter_intake(matter_id: str, body: PiIntakePatchIn, user=Depends(get_current_user)):
        m = await db.matters.find_one({"id": matter_id, "firm_id": user["firm_id"]}, {"_id": 0, "pi_intake": 1})
        if not m:
            raise HTTPException(404, "Matter not found")

        pi_intake = merge_pi_intake(m.get("pi_intake"))

        if body.needs_list is not None:
            by_id = {item.id: item for item in body.needs_list}
            for row in pi_intake["needs_list"]:
                if row["id"] in by_id:
                    patch = by_id[row["id"]]
                    row["received"] = patch.received
                    row["notes"] = patch.notes

        for field in (
            "appointments_notes",
            "medicare_recipient",
            "conflict_check_status",
            "conflict_notes",
            "case_manager_id",
            "supervising_attorney_id",
            "intake_staff_id",
        ):
            val = getattr(body, field)
            if val is not None:
                pi_intake[field] = val

        await db.matters.update_one(
            {"id": matter_id, "firm_id": user["firm_id"]},
            {"$set": {"pi_intake": pi_intake, "updated_at": now_iso()}},
        )
        return {"matter_id": matter_id, "pi_intake": pi_intake}
