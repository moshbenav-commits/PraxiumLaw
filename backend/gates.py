"""
Praxium Suite — attorney-gate registry (P1 core build).

Declarative catalog of the actions that require licensed judgment
(docs/EXPANSION_ARCHITECTURE.md). Downstream modules import require_gate()
to guard endpoints and record_gate_decision() to leave an approval record.
The PI demand review queue predates this registry and keeps its own flow;
its gate is listed here for catalog completeness.
"""
from __future__ import annotations

from typing import Any, Callable, Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel

from rbac import role_has_permission

# gate id → the permission that opens it (permissions live in rbac.PERMISSIONS)
GATE_CATALOG: tuple[dict[str, str], ...] = (
    {"id": "demand.send", "permission": "demand.send",
     "label": "Send demand", "description": "Demand packages leave the firm only on attorney approval."},
    {"id": "reduction.offer", "permission": "reductions.approve",
     "label": "Send reduction ask", "description": "Every outbound lien/bill reduction offer is attorney-approved."},
    {"id": "reduction.accept", "permission": "reductions.approve",
     "label": "Accept reduction", "description": "Accepting a lienholder counter requires attorney approval."},
    {"id": "disbursement.approve", "permission": "disbursement.approve",
     "label": "Approve disbursement sheet", "description": "No client payout without an attorney-approved sheet."},
    {"id": "trust.execute", "permission": "trust.execute",
     "label": "Execute trust movement", "description": "The system prepares and records; only human signatories move trust money."},
    {"id": "citation.strategy", "permission": "citations.strategy",
     "label": "Set citation strategy", "description": "Plea selection and contest strategy are the practice of law."},
    {"id": "citation.ask", "permission": "citations.strategy",
     "label": "Send negotiation ask", "description": "Each rung of the citation ask ladder goes out attorney-approved."},
)

GATE_IDS = frozenset(g["id"] for g in GATE_CATALOG)


def get_gate(gate_id: str) -> Optional[dict]:
    for g in GATE_CATALOG:
        if g["id"] == gate_id:
            return g
    return None


def require_gate(gate_id: str, get_current_user: Callable):
    """FastAPI dependency factory — 403 unless the user's role opens the gate."""
    gate = get_gate(gate_id)
    if gate is None:
        raise ValueError(f"Unknown attorney gate: {gate_id}")

    async def _guard(user=Depends(get_current_user)):
        role = user.get("role", "staff")
        if not role_has_permission(role, gate["permission"]):
            raise HTTPException(403, f"Attorney gate '{gate_id}': role '{role}' cannot approve this")
        return user

    return _guard


async def record_gate_decision(
    db: Any,
    *,
    user: dict,
    gate_id: str,
    resource_type: str,
    resource_id: str,
    decision: str,  # approved | rejected
    note: Optional[str],
    new_id: Callable,
    now_iso: Callable,
) -> dict:
    doc = {
        "id": new_id(),
        "firm_id": user["firm_id"],
        "gate_id": gate_id,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "decision": decision,
        "note": note or "",
        "decided_by": user["id"],
        "decided_by_name": user.get("name", ""),
        "decided_by_role": user.get("role", ""),
        "created_at": now_iso(),
    }
    await db.gate_decisions.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


class GateDecisionIn(BaseModel):
    resource_type: str
    resource_id: str
    decision: str  # approved | rejected
    note: Optional[str] = None


def register_gate_routes(
    api,
    db,
    get_current_user: Callable,
    new_id: Callable,
    now_iso: Callable,
    log_audit: Callable,
):
    @api.get("/gates/catalog")
    async def gates_catalog(user=Depends(get_current_user)):
        role = user.get("role", "staff")
        return {
            "gates": [
                {**g, "user_can_approve": role_has_permission(role, g["permission"])}
                for g in GATE_CATALOG
            ]
        }

    @api.get("/gates/decisions")
    async def gate_decisions(
        resource_id: Optional[str] = None,
        gate_id: Optional[str] = None,
        limit: int = 50,
        user=Depends(get_current_user),
    ):
        q: dict[str, Any] = {"firm_id": user["firm_id"]}
        if resource_id:
            q["resource_id"] = resource_id
        if gate_id:
            q["gate_id"] = gate_id
        cursor = db.gate_decisions.find(q, {"_id": 0}).sort("created_at", -1).limit(min(limit, 200))
        return {"decisions": [d async for d in cursor]}

    @api.post("/gates/{gate_id}/decisions")
    async def decide_gate(gate_id: str, body: GateDecisionIn, user=Depends(get_current_user)):
        gate = get_gate(gate_id)
        if gate is None:
            raise HTTPException(404, "Unknown attorney gate")
        if body.decision not in ("approved", "rejected"):
            raise HTTPException(400, "decision must be 'approved' or 'rejected'")
        role = user.get("role", "staff")
        if not role_has_permission(role, gate["permission"]):
            raise HTTPException(403, f"Attorney gate '{gate_id}': role '{role}' cannot approve this")
        doc = await record_gate_decision(
            db, user=user, gate_id=gate_id,
            resource_type=body.resource_type, resource_id=body.resource_id,
            decision=body.decision, note=body.note,
            new_id=new_id, now_iso=now_iso,
        )
        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user.get("name", ""),
            action=f"gate.{body.decision}",
            resource_type=body.resource_type,
            resource_id=body.resource_id,
            detail={"gate_id": gate_id, "note": body.note or ""},
            new_id=new_id,
            now_iso=now_iso,
        )
        return doc
