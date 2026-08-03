"""
Praxium Suite — Citation OS pipeline engine (P1 core build).

Implements the citation state machine end to end: intake → verification →
engagement → attorney-approved strategy → filing → negotiation → resolution
(docs/citation-os/PIPELINE_SPEC.md, state machine in §"State machine").
Low-confidence extractions and deadline risk both raise into the shared
exception queue instead of failing silently (exceptions_queue.py). Outbound
filings ride the shared letter-persistence engine so the court's response
window is tracked the same way every other outbound item is (persistence.py).

GUARDRAIL: strategy selection and every rung of the negotiation ask ladder
are the practice of law (PIPELINE_SPEC.md §2, §4 — "The attorney selects the
strategy" / "The attorney picks the rung"). This module drafts and tracks;
it never decides. Those two actions are attorney-gated via gates.py and are
not reachable through the generic state-transition endpoint.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Callable, Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel

from gates import require_gate, record_gate_decision
from exceptions_queue import raise_exception
from persistence import create_outbound

# Linear happy-path order (PIPELINE_SPEC.md state machine). Transitions must
# move strictly forward along this chain.
LINEAR_STATES: tuple[str, ...] = (
    "detected",
    "verified",
    "conflict_cleared",
    "engaged",
    "strategy_set",
    "filed",
    "awaiting_response",
    "negotiating",
    "disposition_offered",
    "client_approved",
    "resolved",
    "verified_closed",
)

# Exit/failure states — reachable from any non-terminal state, never part of
# the linear path itself.
FAILURE_STATES: tuple[str, ...] = ("declined", "withdrawn", "defaulted", "referred_out")

ALL_STATES: frozenset[str] = frozenset(LINEAR_STATES) | frozenset(FAILURE_STATES)

OFFER_RUNGS: tuple[str, ...] = (
    "dismissal", "amend_non_moving", "deferral", "fine_reduction", "payment_plan",
)
OFFER_DIRECTIONS: tuple[str, ...] = ("ask", "counter", "accept")

LOW_CONFIDENCE_THRESHOLD = 0.7
DEADLINE_RISK_DAYS = 3


def _can_transition(current: str, target: str) -> bool:
    """Forward-only along the linear chain; failure states reachable from
    any non-terminal state; nothing is reachable from a terminal state."""
    if target not in ALL_STATES:
        return False
    if current in FAILURE_STATES or current == LINEAR_STATES[-1]:
        return False
    if target in FAILURE_STATES:
        return True
    if current not in LINEAR_STATES:
        return False
    return LINEAR_STATES.index(target) > LINEAR_STATES.index(current)


def _parse_dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except (ValueError, TypeError):
        return None


async def _check_deadline_risk(
    db: Any,
    citation: dict,
    *,
    new_id: Callable,
    now_iso: Callable,
) -> Optional[dict]:
    """Approaching response_deadline with the matter not yet filed pages a
    human — a defaulted citation must never happen through system inaction
    (PIPELINE_SPEC.md §"Failure/exit states")."""
    if citation.get("state") in FAILURE_STATES or citation.get("state") in (
        "filed", "awaiting_response", "negotiating", "disposition_offered",
        "client_approved", "resolved", "verified_closed",
    ):
        return None
    deadline = _parse_dt(citation.get("response_deadline"))
    now = _parse_dt(now_iso())
    if deadline is None or now is None:
        return None
    if deadline - now <= timedelta(days=DEADLINE_RISK_DAYS):
        return await raise_exception(
            db,
            firm_id=citation["firm_id"],
            kind="deadline_risk",
            source="citation_os",
            title=f"Deadline risk — citation {citation.get('citation_number', citation['id'])} due {citation.get('response_deadline')}",
            detail={"citation_id": citation["id"], "state": citation.get("state")},
            matter_id=citation.get("matter_id"),
            new_id=new_id,
            now_iso=now_iso,
        )
    return None


class CitationIn(BaseModel):
    matter_id: Optional[str] = None
    citation_number: str
    issuing_agency: str
    court: Optional[str] = None
    violation_desc: Optional[str] = None
    issue_date: Optional[str] = None
    response_deadline: Optional[str] = None
    fine_amount: Optional[float] = None
    jurisdiction: Optional[str] = None
    confidence: float = 1.0


class StateIn(BaseModel):
    state: str
    note: Optional[str] = None


class StrategyIn(BaseModel):
    strategy: Optional[str] = None
    note: Optional[str] = None


class OfferIn(BaseModel):
    rung: str
    direction: str
    terms: Optional[str] = None
    amount: Optional[float] = None
    date: Optional[str] = None
    note: Optional[str] = None


def register_citation_routes(api, db, get_current_user, require_permission, new_id, now_iso, log_audit):
    read_guard = require_permission("matters.read", get_current_user)
    write_guard = require_permission("matters.write", get_current_user)
    strategy_guard = require_gate("citation.strategy", get_current_user)
    ask_guard = require_gate("citation.ask", get_current_user)

    @api.post("/citations")
    async def create_citation(body: CitationIn, user=Depends(write_guard)):
        doc = {
            "id": new_id(),
            "firm_id": user["firm_id"],
            "matter_id": body.matter_id,
            "citation_number": body.citation_number,
            "issuing_agency": body.issuing_agency,
            "court": body.court,
            "violation_desc": body.violation_desc,
            "issue_date": body.issue_date,
            "response_deadline": body.response_deadline,
            "fine_amount": body.fine_amount,
            "jurisdiction": body.jurisdiction,
            "state": "detected",
            "confidence": body.confidence,
            "offers": [],
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        await db.citations.insert_one(doc)
        clean = {k: v for k, v in doc.items() if k != "_id"}

        exceptions_raised: list[dict] = []
        if body.confidence < LOW_CONFIDENCE_THRESHOLD:
            exc = await raise_exception(
                db,
                firm_id=user["firm_id"],
                kind="extraction_low_confidence",
                source="citation_os",
                title=f"Verify citation {body.citation_number}",
                detail={"citation_id": clean["id"], "confidence": body.confidence},
                matter_id=body.matter_id,
                new_id=new_id,
                now_iso=now_iso,
            )
            exceptions_raised.append(exc)
        risk_exc = await _check_deadline_risk(db, clean, new_id=new_id, now_iso=now_iso)
        if risk_exc:
            exceptions_raised.append(risk_exc)

        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user.get("name", ""),
            action="citation.create",
            resource_type="citation",
            resource_id=clean["id"],
            detail={"citation_number": body.citation_number, "confidence": body.confidence},
            new_id=new_id,
            now_iso=now_iso,
        )
        return {**clean, "exceptions_raised": exceptions_raised}

    @api.get("/citations/summary")
    async def citations_summary(user=Depends(read_guard)):
        pipeline = [
            {"$match": {"firm_id": user["firm_id"]}},
            {"$group": {"_id": "$state", "count": {"$sum": 1}}},
        ]
        by_state: dict[str, int] = {s: 0 for s in ALL_STATES}
        async for row in db.citations.aggregate(pipeline):
            by_state[row["_id"]] = row["count"]
        return {"by_state": by_state}

    @api.get("/citations")
    async def list_citations(
        state: Optional[str] = None,
        matter_id: Optional[str] = None,
        user=Depends(read_guard),
    ):
        q: dict[str, Any] = {"firm_id": user["firm_id"]}
        if state:
            q["state"] = state
        if matter_id:
            q["matter_id"] = matter_id
        cursor = db.citations.find(q, {"_id": 0}).sort("response_deadline", 1)
        return {"citations": [d async for d in cursor]}

    @api.get("/citations/{citation_id}")
    async def get_citation(citation_id: str, user=Depends(read_guard)):
        doc = await db.citations.find_one({"id": citation_id, "firm_id": user["firm_id"]}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Citation not found")
        return doc

    @api.patch("/citations/{citation_id}/state")
    async def update_citation_state(citation_id: str, body: StateIn, user=Depends(write_guard)):
        citation = await db.citations.find_one({"id": citation_id, "firm_id": user["firm_id"]}, {"_id": 0})
        if not citation:
            raise HTTPException(404, "Citation not found")
        current = citation["state"]
        target = body.state

        if target == "strategy_set":
            raise HTTPException(
                400,
                "strategy_set requires attorney sign-off — use POST /api/citations/{id}/strategy",
            )
        if not _can_transition(current, target):
            raise HTTPException(400, f"Illegal transition: {current} -> {target}")

        if target == "filed":
            await create_outbound(
                db,
                firm_id=user["firm_id"],
                user_id=user["id"],
                title=f"Filing — citation {citation.get('citation_number', citation_id)}",
                kind="filing",
                recipient=citation.get("court") or citation.get("issuing_agency") or "court",
                matter_id=citation.get("matter_id"),
                new_id=new_id,
                now_iso=now_iso,
            )

        ts = now_iso()
        await db.citations.update_one(
            {"id": citation_id},
            {"$set": {"state": target, "updated_at": ts}},
        )
        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user.get("name", ""),
            action="citation.state_change",
            resource_type="citation",
            resource_id=citation_id,
            detail={"from": current, "to": target, "note": body.note or ""},
            new_id=new_id,
            now_iso=now_iso,
        )
        updated = await db.citations.find_one({"id": citation_id}, {"_id": 0})
        await _check_deadline_risk(db, updated, new_id=new_id, now_iso=now_iso)
        return updated

    @api.post("/citations/{citation_id}/strategy")
    async def set_citation_strategy(citation_id: str, body: StrategyIn, user=Depends(strategy_guard)):
        citation = await db.citations.find_one({"id": citation_id, "firm_id": user["firm_id"]}, {"_id": 0})
        if not citation:
            raise HTTPException(404, "Citation not found")
        current = citation["state"]
        if not _can_transition(current, "strategy_set"):
            raise HTTPException(400, f"Illegal transition: {current} -> strategy_set")

        ts = now_iso()
        await db.citations.update_one(
            {"id": citation_id},
            {"$set": {"state": "strategy_set", "strategy": body.strategy, "updated_at": ts}},
        )
        await record_gate_decision(
            db,
            user=user,
            gate_id="citation.strategy",
            resource_type="citation",
            resource_id=citation_id,
            decision="approved",
            note=body.note,
            new_id=new_id,
            now_iso=now_iso,
        )
        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user.get("name", ""),
            action="citation.strategy_set",
            resource_type="citation",
            resource_id=citation_id,
            detail={"strategy": body.strategy, "note": body.note or ""},
            new_id=new_id,
            now_iso=now_iso,
        )
        return await db.citations.find_one({"id": citation_id}, {"_id": 0})

    @api.post("/citations/{citation_id}/offers")
    async def add_citation_offer(citation_id: str, body: OfferIn, user=Depends(ask_guard)):
        citation = await db.citations.find_one({"id": citation_id, "firm_id": user["firm_id"]}, {"_id": 0})
        if not citation:
            raise HTTPException(404, "Citation not found")
        if body.rung not in OFFER_RUNGS:
            raise HTTPException(400, f"rung must be one of {OFFER_RUNGS}")
        if body.direction not in OFFER_DIRECTIONS:
            raise HTTPException(400, f"direction must be one of {OFFER_DIRECTIONS}")

        offer = {
            "rung": body.rung,
            "direction": body.direction,
            "terms": body.terms,
            "amount": body.amount,
            "date": body.date or now_iso(),
        }
        ts = now_iso()
        await db.citations.update_one(
            {"id": citation_id},
            {"$push": {"offers": offer}, "$set": {"updated_at": ts}},
        )
        await record_gate_decision(
            db,
            user=user,
            gate_id="citation.ask",
            resource_type="citation",
            resource_id=citation_id,
            decision="approved",
            note=body.note,
            new_id=new_id,
            now_iso=now_iso,
        )
        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user.get("name", ""),
            action="citation.offer",
            resource_type="citation",
            resource_id=citation_id,
            detail=offer,
            new_id=new_id,
            now_iso=now_iso,
        )
        return await db.citations.find_one({"id": citation_id}, {"_id": 0})
