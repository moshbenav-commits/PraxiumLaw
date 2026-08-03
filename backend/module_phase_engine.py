"""
Praxium Suite — module-phase engine (P1 core build).

module_phases.py catalogs the ordered phase set each practice module walks a
matter through and exposes read-only lookups (GET .../phase-set etc.). This
module makes that catalog FUNCTIONAL: it tracks where a given matter actually
sits in its module's phase set (`matter.module_phase = {current, updated_at}`)
and lets it be advanced, forward-only, with attorney-gate enforcement on any
target phase whose `gate` is a catalogued id in gates.GATE_CATALOG
(docs/EXPANSION_ARCHITECTURE.md).

Module resolution and the phase-set data itself are reused as-is from
module_phases.py (`_resolve_matter_module_key`, `get_phase_set`) — this file
does not duplicate or reinterpret that logic.
"""
from __future__ import annotations

from typing import Any, Callable, Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel

from module_phases import get_phase_set, _resolve_matter_module_key
from gates import get_gate, record_gate_decision
from rbac import role_has_permission

# How many upcoming phases (forward-only) to surface as candidates.
_AVAILABLE_NEXT_LOOKAHEAD = 2


def _phase_index(phases: list[dict[str, Any]], key: str) -> Optional[int]:
    for i, p in enumerate(phases):
        if p["key"] == key:
            return i
    return None


def _available_next(phases: list[dict[str, Any]], current_index: int) -> list[str]:
    """Forward-only lookahead: the next phase, and optionally the one after it."""
    return [
        p["key"]
        for p in phases[current_index + 1 : current_index + 1 + _AVAILABLE_NEXT_LOOKAHEAD]
    ]


class ModulePhaseAdvanceIn(BaseModel):
    to_key: str
    note: Optional[str] = None


def register_module_phase_engine_routes(
    api,
    db,
    get_current_user: Callable,
    require_permission: Callable,
    new_id: Callable,
    now_iso: Callable,
    log_audit: Callable,
):
    read_guard = require_permission("matters.read", get_current_user)
    write_guard = require_permission("matters.write", get_current_user)

    async def _load_matter(matter_id: str, user: dict) -> dict:
        matter = await db.matters.find_one(
            {"id": matter_id, "firm_id": user["firm_id"]}, {"_id": 0}
        )
        if not matter:
            raise HTTPException(404, "Matter not found")
        return matter

    def _current_phase_key(matter: dict, phases: list[dict[str, Any]]) -> str:
        module_phase = matter.get("module_phase") or {}
        current = module_phase.get("current")
        if current and _phase_index(phases, current) is not None:
            return current
        return phases[0]["key"]

    @api.get("/matters/{matter_id}/module-phase")
    async def get_module_phase(matter_id: str, user=Depends(read_guard)):
        matter = await _load_matter(matter_id, user)
        module_key = _resolve_matter_module_key(matter)
        phases = get_phase_set(module_key)
        current = _current_phase_key(matter, phases)
        idx = _phase_index(phases, current)
        return {
            "matter_id": matter_id,
            "module_key": module_key,
            "current": current,
            "phases": phases,
            "available_next": _available_next(phases, idx if idx is not None else 0),
        }

    @api.post("/matters/{matter_id}/module-phase/advance")
    async def advance_module_phase(
        matter_id: str, body: ModulePhaseAdvanceIn, user=Depends(write_guard)
    ):
        matter = await _load_matter(matter_id, user)
        module_key = _resolve_matter_module_key(matter)
        phases = get_phase_set(module_key)

        current = _current_phase_key(matter, phases)
        current_idx = _phase_index(phases, current)

        target = next((p for p in phases if p["key"] == body.to_key), None)
        if target is None:
            raise HTTPException(400, f"Unknown phase '{body.to_key}' for module '{module_key}'")
        target_idx = _phase_index(phases, body.to_key)

        if current_idx is None or target_idx is None or target_idx <= current_idx:
            raise HTTPException(
                400,
                f"Illegal phase move: '{current}' -> '{body.to_key}' (forward-only, no backward/no-op moves)",
            )

        gate_id = target.get("gate")
        gate = get_gate(gate_id) if gate_id else None
        if gate is not None:
            role = user.get("role", "staff")
            if not role_has_permission(role, gate["permission"]):
                raise HTTPException(
                    403, f"Phase '{body.to_key}' requires gate {gate_id}"
                )
            await record_gate_decision(
                db,
                user=user,
                gate_id=gate_id,
                resource_type="matter",
                resource_id=matter_id,
                decision="approved",
                note=body.note,
                new_id=new_id,
                now_iso=now_iso,
            )

        ts = now_iso()
        await db.matters.update_one(
            {"id": matter_id, "firm_id": user["firm_id"]},
            {"$set": {"module_phase": {"current": body.to_key, "updated_at": ts}}},
        )
        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user.get("name", ""),
            action="matter.module_phase_advance",
            resource_type="matter",
            resource_id=matter_id,
            detail={
                "module_key": module_key,
                "from": current,
                "to": body.to_key,
                "gate_id": gate_id,
                "note": body.note or "",
            },
            new_id=new_id,
            now_iso=now_iso,
        )

        return {
            "matter_id": matter_id,
            "module_key": module_key,
            "current": body.to_key,
            "available_next": _available_next(phases, target_idx),
        }
