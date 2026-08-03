"""
Praxium Suite — practice-area module engine (P1 core build).

A module = configuration + content pack on the shared core (docs/practice-areas/).
Firms enable modules; matters carry a module; assignment spawns the module's
day-one task pack. PI is module #1 and keeps its dedicated pi_* engines.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Callable, Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel

# Status mirrors marketing labels (frontend/src/data/expansion.js):
# only shipped app capability is "available".
MODULE_CATALOG: tuple[dict[str, Any], ...] = (
    {
        "id": "personal-injury",
        "name": "Personal injury",
        "practice_area": "personal_injury",
        "status": "available",
        "summary": "Reference implementation — PI phase pipeline, Needs List, insurance, meds ledger, demand, settlement.",
        "day_one_tasks": (),  # PI intake tasks come from the phase engine + workflows
    },
    {
        "id": "premises-liability",
        "name": "Premises liability",
        "practice_area": "premises_liability",
        "status": "rolling_out",
        "summary": "Slip/trip-and-fall and negligent security on the PI core; evidence preservation is the day-one battle.",
        "day_one_tasks": (
            {"title": "Send CCTV/evidence preservation (spoliation) letters", "priority": "urgent", "due_days": 1},
            {"title": "Identify property owner/occupier + insurer", "priority": "high", "due_days": 2},
            {"title": "Public-entity defendant? Calendar tort-claim notice deadline", "priority": "urgent", "due_days": 1},
        ),
    },
    {
        "id": "dog-bite",
        "name": "Dog bite & animal attack",
        "practice_area": "dog_bite",
        "status": "rolling_out",
        "summary": "Animal-attack cases; homeowner's/renter's coverage and the wound-photo cadence drive value.",
        "day_one_tasks": (
            {"title": "Identify homeowner's/renter's/umbrella coverage", "priority": "high", "due_days": 2},
            {"title": "Request animal-control report", "priority": "high", "due_days": 2},
            {"title": "Start wound-photo cadence (day 1/7/30/scar maturity)", "priority": "high", "due_days": 1},
        ),
    },
    {
        "id": "workers-compensation",
        "name": "Workers' compensation",
        "practice_area": "workers_compensation",
        "status": "early_access",
        "summary": "Administrative-forum benefits practice; companion third-party cases link back to PI.",
        "day_one_tasks": (
            {"title": "Verify injury reported to employer + capture report date", "priority": "urgent", "due_days": 1},
            {"title": "Calendar claim-filing deadline for jurisdiction", "priority": "urgent", "due_days": 1},
            {"title": "Screen for companion third-party liability case", "priority": "medium", "due_days": 3},
        ),
    },
    {
        "id": "medical-malpractice",
        "name": "Medical malpractice",
        "practice_area": "medical_malpractice",
        "status": "early_access",
        "summary": "Expert-gated provider-negligence practice; interacting deadlines and complete records are the case.",
        "day_one_tasks": (
            {"title": "Send complete records requests to ALL involved providers (incl. EHR audit trail)", "priority": "urgent", "due_days": 1},
            {"title": "Calendar SOL / repose / pre-suit notice / affidavit deadlines", "priority": "urgent", "due_days": 1},
            {"title": "Run case-economics viability screen", "priority": "high", "due_days": 3},
        ),
    },
    {
        "id": "product-liability",
        "name": "Product liability",
        "practice_area": "product_liability",
        "status": "early_access",
        "summary": "Defect claims; the product itself is the case — secure it before anyone alters or discards it.",
        "day_one_tasks": (
            {"title": "SECURE THE PRODUCT — custody within 72h, start chain-of-custody log", "priority": "urgent", "due_days": 1},
            {"title": "Send spoliation letters to every party holding the product", "priority": "urgent", "due_days": 1},
            {"title": "Sweep recall/complaint databases for the product", "priority": "medium", "due_days": 5},
        ),
    },
    {
        "id": "mass-tort",
        "name": "Mass tort",
        "practice_area": "mass_tort",
        "status": "early_access",
        "summary": "Campaign-based volume practice; qualification criteria and census deadlines rule.",
        "day_one_tasks": (
            {"title": "Confirm campaign qualification criteria met + document", "priority": "high", "due_days": 1},
            {"title": "Start proof-of-use evidence collection (pharmacy/purchase/implant records)", "priority": "high", "due_days": 3},
        ),
    },
    {
        "id": "nursing-home-abuse",
        "name": "Nursing home abuse & neglect",
        "practice_area": "nursing_home_abuse",
        "status": "early_access",
        "summary": "LTC facility claims; authority first, chart fast, arbitration screened, resident safety above the case.",
        "day_one_tasks": (
            {"title": "Resident still at risk? Escalate care/safety before case workup", "priority": "urgent", "due_days": 1},
            {"title": "Verify caller authority (POA / guardianship / next of kin)", "priority": "urgent", "due_days": 1},
            {"title": "Request full chart: care plans, MARs, incident reports, staffing", "priority": "high", "due_days": 1},
            {"title": "Screen admission packet for arbitration clause", "priority": "medium", "due_days": 5},
        ),
    },
    {
        "id": "wrongful-death",
        "name": "Wrongful death (overlay)",
        "practice_area": "wrongful_death",
        "status": "early_access",
        "summary": "Overlay on any injury module when the client dies; estate/standing is the critical path.",
        "day_one_tasks": (
            {"title": "Estate opened? Track personal-representative appointment (no PR, no claim)", "priority": "urgent", "due_days": 1},
            {"title": "Calendar wrongful-death SOL separately from underlying-claim SOL", "priority": "urgent", "due_days": 1},
            {"title": "Map statutory beneficiaries + relationships", "priority": "medium", "due_days": 5},
        ),
    },
)

MODULE_IDS = frozenset(m["id"] for m in MODULE_CATALOG)
DEFAULT_ENABLED = ("personal-injury",)


def get_module(module_id: str) -> Optional[dict]:
    for m in MODULE_CATALOG:
        if m["id"] == module_id:
            return m
    return None


async def ensure_firm_modules(db: Any, firm_id: str) -> list[str]:
    """Return the firm's enabled module ids, seeding the default on first touch."""
    firm = await db.firms.find_one({"id": firm_id}, {"_id": 0, "enabled_modules": 1})
    if firm is None:
        return list(DEFAULT_ENABLED)
    enabled = firm.get("enabled_modules")
    if enabled is None:
        enabled = list(DEFAULT_ENABLED)
        await db.firms.update_one({"id": firm_id}, {"$set": {"enabled_modules": enabled}})
    return enabled


class ModuleToggle(BaseModel):
    enabled: bool


class MatterModuleAssign(BaseModel):
    module_id: str


def register_practice_module_routes(
    api,
    db,
    get_current_user: Callable,
    require_permission: Callable,
    new_id: Callable,
    now_iso: Callable,
    log_audit: Callable,
):
    settings_guard = require_permission("settings.write", get_current_user)
    matters_guard = require_permission("matters.write", get_current_user)

    async def _audit(user, action: str, resource_id: str, detail: dict):
        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user.get("name", ""),
            action=action,
            resource_type="practice_module",
            resource_id=resource_id,
            detail=detail,
            new_id=new_id,
            now_iso=now_iso,
        )

    @api.get("/practice-modules/catalog")
    async def practice_modules_catalog(user=Depends(get_current_user)):
        enabled = await ensure_firm_modules(db, user["firm_id"])
        return {
            "modules": [
                {**{k: v for k, v in m.items() if k != "day_one_tasks"},
                 "day_one_task_count": len(m["day_one_tasks"]),
                 "enabled": m["id"] in enabled}
                for m in MODULE_CATALOG
            ]
        }

    @api.patch("/practice-modules/{module_id}")
    async def toggle_practice_module(
        module_id: str,
        body: ModuleToggle,
        user=Depends(settings_guard),
    ):
        module = get_module(module_id)
        if not module:
            raise HTTPException(404, "Unknown practice module")
        enabled = set(await ensure_firm_modules(db, user["firm_id"]))
        if body.enabled:
            enabled.add(module_id)
        else:
            if module_id == "personal-injury":
                raise HTTPException(400, "The personal-injury module cannot be disabled")
            enabled.discard(module_id)
        ordered = [m["id"] for m in MODULE_CATALOG if m["id"] in enabled]
        await db.firms.update_one({"id": user["firm_id"]}, {"$set": {"enabled_modules": ordered}})
        await _audit(user, "practice_module.toggled", module_id, {"enabled": body.enabled})
        return {"enabled_modules": ordered}

    @api.patch("/matters/{matter_id}/module")
    async def assign_matter_module(
        matter_id: str,
        body: MatterModuleAssign,
        user=Depends(matters_guard),
    ):
        module = get_module(body.module_id)
        if not module:
            raise HTTPException(404, "Unknown practice module")
        enabled = await ensure_firm_modules(db, user["firm_id"])
        if body.module_id not in enabled:
            raise HTTPException(400, f"Module '{body.module_id}' is not enabled for this firm")
        matter = await db.matters.find_one({"id": matter_id, "firm_id": user["firm_id"]}, {"_id": 0})
        if not matter:
            raise HTTPException(404, "Matter not found")
        ts = now_iso()
        await db.matters.update_one(
            {"id": matter_id, "firm_id": user["firm_id"]},
            {"$set": {"module_id": body.module_id, "practice_area": module["practice_area"], "updated_at": ts}},
        )

        # Spawn the module's day-one task pack (idempotent by open task title).
        created: list[str] = []
        for t in module["day_one_tasks"]:
            existing = await db.tasks.find_one(
                {"firm_id": user["firm_id"], "matter_id": matter_id,
                 "title": t["title"], "status": {"$ne": "done"}}
            )
            if existing:
                continue
            due = (datetime.fromisoformat(ts) + timedelta(days=t["due_days"])).isoformat()
            await db.tasks.insert_one({
                "id": new_id(),
                "firm_id": user["firm_id"],
                "matter_id": matter_id,
                "title": t["title"],
                "description": f"Day-one task from the {module['name']} module pack.",
                "priority": t["priority"],
                "status": "open",
                "assignee_id": user["id"],
                "created_by": user["id"],
                "created_at": ts,
                "due_date": due,
            })
            created.append(t["title"])

        await _audit(
            user, "matter.module_assigned", matter_id,
            {"module_id": body.module_id, "day_one_tasks": created},
        )
        return {"module_id": body.module_id, "practice_area": module["practice_area"], "day_one_tasks_created": created}
