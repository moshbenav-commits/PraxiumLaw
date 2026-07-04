"""
PI Case OS — client call / text cadence (UX-016).
Coaching prompts at 3/7/30 days + biweekly alternating; PD daily override.
SMS channel remains Phase 2 (VoxLine) — this module tracks cadence + contact log.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any, Callable, Literal, Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field

CADENCE_PROMPTS: tuple[dict[str, str], ...] = (
    {
        "code": "day_3",
        "label": "3-day intake check-in",
        "days_after_anchor": 3,
        "channel_hint": "call",
        "prompt": "Confirm Needs List homework, provider attendance, and any mail bills (ambulance, ER, radiology).",
    },
    {
        "code": "day_7",
        "label": "7-day Needs List follow-up",
        "days_after_anchor": 7,
        "channel_hint": "call",
        "prompt": "Broader Needs List check-in — anything still outstanding from intake homework?",
    },
    {
        "code": "biweekly_client",
        "label": "Biweekly — client week",
        "days_after_anchor": 14,
        "recurring_days": 14,
        "channel_hint": "call_or_text",
        "prompt": "How is treatment? Pain level? Transportation barriers? Still attending all providers?",
    },
    {
        "code": "biweekly_provider",
        "label": "Biweekly — provider week",
        "days_after_anchor": 21,
        "recurring_days": 28,
        "channel_hint": "call",
        "prompt": "Provider balances, LTD/NTD, no-shows, confirm a future appointment exists (reception turnover risk).",
    },
    {
        "code": "day_30_review",
        "label": "30-day case review",
        "days_after_anchor": 30,
        "channel_hint": "call",
        "prompt": "Formal review: MRI status, pain management, outstanding issues, file readiness.",
    },
)

PD_DAILY_PROMPT = {
    "code": "pd_daily",
    "label": "PD daily adjuster follow-up",
    "channel_hint": "call",
    "prompt": "Rental/repair pending — daily pressure on adjuster until resolved (overrides biweekly rhythm).",
}


def default_pi_comms() -> dict[str, Any]:
    return {
        "anchor_date": None,
        "completed_milestones": {},
        "contact_log": [],
        "sms_opt_in": False,
        "preferred_channel": "call",
        "notes": "",
    }


def merge_pi_comms(raw: Optional[dict]) -> dict[str, Any]:
    base = default_pi_comms()
    if not raw:
        return base
    merged = {**base, **{k: v for k, v in raw.items() if k in base}}
    if not isinstance(merged.get("completed_milestones"), dict):
        merged["completed_milestones"] = {}
    if not isinstance(merged.get("contact_log"), list):
        merged["contact_log"] = []
    return merged


def _parse_date(value: Optional[str]) -> Optional[date]:
    if not value:
        return None
    try:
        if "T" in value:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
        return date.fromisoformat(value[:10])
    except (ValueError, TypeError):
        return None


def _anchor_date(matter: dict, pi_comms: dict) -> date:
    explicit = _parse_date(pi_comms.get("anchor_date"))
    if explicit:
        return explicit
    for key in ("incident_date", "created_at"):
        parsed = _parse_date(matter.get(key))
        if parsed:
            return parsed
    return datetime.now(timezone.utc).date()


def _milestone_due(anchor: date, spec: dict, *, today: date, completed: dict) -> Optional[dict]:
    code = spec["code"]
    recurring = spec.get("recurring_days")
    completed_at = completed.get(code)

    if recurring:
        if completed_at:
            last = _parse_date(completed_at)
            interval = int(recurring)
            due = (last + timedelta(days=interval)) if last else anchor + timedelta(days=int(spec["days_after_anchor"]))
        else:
            due = anchor + timedelta(days=int(spec["days_after_anchor"]))
    else:
        if completed_at:
            return None
        due = anchor + timedelta(days=int(spec["days_after_anchor"]))

    if today >= due:
        overdue_days = (today - due).days
        return {
            **spec,
            "due_date": due.isoformat(),
            "overdue_days": overdue_days,
            "status": "overdue" if overdue_days > 0 else "due_today",
        }
    if (due - today).days <= 2:
        return {
            **spec,
            "due_date": due.isoformat(),
            "overdue_days": 0,
            "status": "upcoming",
        }
    return None


def compute_comms_cadence(
    matter: dict,
    pi_comms: dict,
    *,
    pd_active_daily: bool = False,
    today: Optional[date] = None,
) -> dict[str, Any]:
    """Return due/upcoming cadence items + coaching prompts."""
    today = today or datetime.now(timezone.utc).date()
    merged = merge_pi_comms(pi_comms)
    anchor = _anchor_date(matter, merged)
    completed = merged.get("completed_milestones") or {}

    due_items: list[dict[str, Any]] = []
    if pd_active_daily:
        due_items.append({**PD_DAILY_PROMPT, "due_date": today.isoformat(), "overdue_days": 0, "status": "due_today"})

    for spec in CADENCE_PROMPTS:
        if pd_active_daily and spec["code"].startswith("biweekly"):
            continue
        item = _milestone_due(anchor, spec, today=today, completed=completed)
        if item:
            due_items.append(item)

    due_items.sort(key=lambda x: (-x.get("overdue_days", 0), x.get("due_date", "")))

    return {
        "anchor_date": anchor.isoformat(),
        "pd_daily_mode": pd_active_daily,
        "due_count": sum(1 for i in due_items if i.get("status") in ("overdue", "due_today")),
        "upcoming_count": sum(1 for i in due_items if i.get("status") == "upcoming"),
        "due_items": due_items,
        "prompts": list(CADENCE_PROMPTS) + ([PD_DAILY_PROMPT] if pd_active_daily else []),
    }


class CommsContactIn(BaseModel):
    channel: Literal["call", "text", "portal", "note"] = "call"
    direction: Literal["outbound", "inbound"] = "outbound"
    cadence_code: Optional[str] = Field(None, max_length=40)
    summary: str = Field(..., min_length=1, max_length=2000)
    mark_milestone_complete: Optional[str] = Field(None, max_length=40)


class CommsPatchIn(BaseModel):
    anchor_date: Optional[str] = None
    sms_opt_in: Optional[bool] = None
    preferred_channel: Optional[Literal["call", "text", "both"]] = None
    notes: Optional[str] = Field(None, max_length=4000)
    complete_milestone: Optional[str] = Field(None, max_length=40)


def register_pi_comms_routes(
    api,
    db,
    get_current_user: Callable,
    new_id: Callable,
    now_iso: Callable,
    *,
    merge_pi_property_damage: Callable,
    compute_pd_summary: Callable,
):
    async def _load_pi_matter(matter_id: str, firm_id: str):
        m = await db.matters.find_one(
            {"id": matter_id, "firm_id": firm_id},
            {"_id": 0, "id": 1, "practice_area": 1, "created_at": 1, "incident_date": 1, "case_number": 1, "title": 1, "pi_comms": 1, "pi_property_damage": 1},
        )
        if not m:
            raise HTTPException(404, "Matter not found")
        if m.get("practice_area") != "personal_injury":
            raise HTTPException(400, "Comms cadence applies to PI matters only")
        return m

    def _pd_daily_mode(matter: dict) -> bool:
        pd = merge_pi_property_damage(matter.get("pi_property_damage"))
        if pd.get("status") != "active":
            return False
        if not pd.get("daily_follow_up_required"):
            return False
        summary = compute_pd_summary(pd, incident_date=matter.get("incident_date"))
        return any(a.get("code") == "daily_follow_up_due" for a in summary.get("alerts", []))

    @api.get("/matters/{matter_id}/comms-cadence")
    async def get_comms_cadence(matter_id: str, user=Depends(get_current_user)):
        matter = await _load_pi_matter(matter_id, user["firm_id"])
        pi_comms = merge_pi_comms(matter.get("pi_comms"))
        cadence = compute_comms_cadence(matter, pi_comms, pd_active_daily=_pd_daily_mode(matter))
        log = sorted(pi_comms.get("contact_log") or [], key=lambda x: x.get("created_at", ""), reverse=True)
        return {
            "matter_id": matter_id,
            "pi_comms": pi_comms,
            "cadence": cadence,
            "contact_log": log,
            "voxline_status": "mocked",
            "training_article": "11-client-call-cadence",
        }

    @api.patch("/matters/{matter_id}/comms-cadence")
    async def patch_comms_cadence(matter_id: str, body: CommsPatchIn, user=Depends(get_current_user)):
        matter = await _load_pi_matter(matter_id, user["firm_id"])
        pi_comms = merge_pi_comms(matter.get("pi_comms"))
        if body.anchor_date is not None:
            pi_comms["anchor_date"] = body.anchor_date
        if body.sms_opt_in is not None:
            pi_comms["sms_opt_in"] = body.sms_opt_in
        if body.preferred_channel is not None:
            pi_comms["preferred_channel"] = body.preferred_channel
        if body.notes is not None:
            pi_comms["notes"] = body.notes
        if body.complete_milestone:
            pi_comms.setdefault("completed_milestones", {})[body.complete_milestone] = now_iso()
        await db.matters.update_one({"id": matter_id, "firm_id": user["firm_id"]}, {"$set": {"pi_comms": pi_comms}})
        matter["pi_comms"] = pi_comms
        cadence = compute_comms_cadence(matter, pi_comms, pd_active_daily=_pd_daily_mode(matter))
        return {"pi_comms": pi_comms, "cadence": cadence}

    @api.post("/matters/{matter_id}/comms-cadence/contact")
    async def log_comms_contact(matter_id: str, body: CommsContactIn, user=Depends(get_current_user)):
        matter = await _load_pi_matter(matter_id, user["firm_id"])
        pi_comms = merge_pi_comms(matter.get("pi_comms"))
        entry = {
            "id": new_id(),
            "channel": body.channel,
            "direction": body.direction,
            "cadence_code": body.cadence_code,
            "summary": body.summary.strip(),
            "created_at": now_iso(),
            "created_by": user["id"],
            "created_by_name": user.get("name") or "Staff",
        }
        pi_comms.setdefault("contact_log", []).insert(0, entry)
        if body.mark_milestone_complete:
            pi_comms.setdefault("completed_milestones", {})[body.mark_milestone_complete] = now_iso()
        await db.matters.update_one({"id": matter_id, "firm_id": user["firm_id"]}, {"$set": {"pi_comms": pi_comms}})
        await db.activities.insert_one({
            "id": new_id(),
            "firm_id": user["firm_id"],
            "matter_id": matter_id,
            "actor_id": user["id"],
            "actor_name": user.get("name") or "Staff",
            "type": "comms_logged",
            "description": f"Logged {body.channel}: {body.summary[:80]}",
            "created_at": now_iso(),
        })
        matter["pi_comms"] = pi_comms
        cadence = compute_comms_cadence(matter, pi_comms, pd_active_daily=_pd_daily_mode(matter))
        return {"entry": entry, "cadence": cadence, "contact_log": pi_comms["contact_log"]}
