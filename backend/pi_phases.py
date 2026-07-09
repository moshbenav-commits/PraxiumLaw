"""
PI Case OS — phase pipeline (Intake → Treating → Demand → Settlement / Lit).
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Callable, Literal, Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field

PI_PHASES: tuple[dict[str, Any], ...] = (
    {"id": "intake", "label": "Intake", "order": 1, "terminal": False},
    {"id": "treating", "label": "Treating", "order": 2, "terminal": False},
    {"id": "record_gathering", "label": "Record gathering", "order": 3, "terminal": False},
    {"id": "demand", "label": "Demand", "order": 4, "terminal": False},
    {"id": "waiting_for_offer", "label": "Waiting for offer", "order": 5, "terminal": False},
    {"id": "counter_supplement", "label": "Counter / Supplement", "order": 6, "terminal": False},
    {"id": "settlement_disbursement", "label": "Settlement / disbursement", "order": 7, "terminal": False},
    {"id": "minors_compromise", "label": "Minor's compromise", "order": 8, "terminal": False},
    {"id": "litigate", "label": "Litigate", "order": 9, "terminal": False},
    {"id": "dropped", "label": "Drop", "order": 10, "terminal": True},
    {"id": "closed", "label": "Closed", "order": 11, "terminal": True},
)

PHASE_IDS = frozenset(p["id"] for p in PI_PHASES)
TERMINAL_PHASES = frozenset(p["id"] for p in PI_PHASES if p.get("terminal"))

PHASE_TASKS: dict[str, tuple[dict[str, str], ...]] = {
    "intake": (
        {"id": "needs_list", "label": "Needs list items collected"},
        {"id": "signature_packet", "label": "Signature packet executed"},
        {"id": "conflict_check", "label": "Conflict check complete"},
        {"id": "client_text_channel", "label": "Client text channel provisioned"},
    ),
    "treating": (
        {"id": "providers_booked", "label": "Chiro/PT + pain mgmt tracks booked"},
        {"id": "lor_3p", "label": "3P claim opened + LOR sent"},
        {"id": "decl_page", "label": "Declaration page on file"},
        {"id": "pd_track", "label": "Property damage track started"},
    ),
    "record_gathering": (
        {"id": "med_records", "label": "Medical records requested / in file"},
        {"id": "cor_queue", "label": "COR plan for discharged providers"},
        {"id": "mri_pathway", "label": "MRI / imaging pathway documented"},
        {"id": "subro_opened", "label": "Health subrogation opened if benefits used"},
    ),
    "demand": (
        {"id": "med_chronology", "label": "Medical chronology + exhibits complete"},
        {"id": "redaction_review", "label": "Carrier-share docs redacted"},
        {"id": "attorney_demand_review", "label": "Supervising attorney demand review"},
        {"id": "demand_sent", "label": "Demand package sent"},
    ),
    "waiting_for_offer": (
        {"id": "carrier_ack", "label": "Carrier acknowledged demand"},
        {"id": "monthly_treat", "label": "Client treating monthly during wait"},
        {"id": "limits_confirmed", "label": "Policy limits confirmed"},
    ),
    "counter_supplement": (
        {"id": "offer_logged", "label": "Offer amount logged"},
        {"id": "counter_or_supplement", "label": "Counter-offer or supplement sent"},
        {"id": "attorney_auth", "label": "Attorney authorized negotiation step"},
    ),
    "settlement_disbursement": (
        {"id": "settlement_agreement", "label": "Settlement agreement executed"},
        {"id": "subro_final", "label": "Final subrogation lien resolved"},
        {"id": "trust_disbursement", "label": "Trust / disbursement checklist complete"},
    ),
    "minors_compromise": (
        {"id": "minor_compromise_filed", "label": "Minor's compromise filed"},
        {"id": "court_approval", "label": "Court approval received"},
    ),
    "litigate": (
        {"id": "transfer_lit_letters", "label": "Transfer-to-lit letters sent"},
        {"id": "lit_counsel_assigned", "label": "Litigating attorney assigned"},
        {"id": "complaint_filed", "label": "Complaint filed or deadline tracked"},
    ),
    "dropped": (
        {"id": "drop_reason", "label": "Drop reason documented"},
        {"id": "client_notice", "label": "Client notice sent"},
    ),
    "closed": (
        {"id": "file_archived", "label": "File archived / closed checklist"},
    ),
}

# Map PI phase → generic matter status for legacy views
PHASE_TO_STATUS: dict[str, str] = {
    "intake": "intake",
    "treating": "active",
    "record_gathering": "active",
    "demand": "active",
    "waiting_for_offer": "negotiation",
    "counter_supplement": "negotiation",
    "settlement_disbursement": "settlement",
    "minors_compromise": "settlement",
    "litigate": "litigation",
    "dropped": "closed",
    "closed": "closed",
}

PHASE_LETTER_TASKS: dict[str, tuple[dict, ...]] = {
    "treating": (
        {"title": "Send letters of representation to carriers (DocGen — Demand tab)", "priority": "high", "due_days": 2},
    ),
    "demand": (
        {"title": "Generate demand letter (DocGen — Demand tab)", "priority": "high", "due_days": 3},
    ),
    "settlement_disbursement": (
        {"title": "Verify lien balances before disbursement (DocGen — Settlement tab)", "priority": "high", "due_days": 2},
        {"title": "Generate reduction request letters (DocGen — Settlement tab)", "priority": "high", "due_days": 3},
        {"title": "Generate disbursement letter (DocGen — needs attorney-approved scenario)", "priority": "high", "due_days": 5},
    ),
    "dropped": (
        {"title": "Send drop letters to providers / lien holders (DocGen — Demand tab)", "priority": "high", "due_days": 2},
    ),
}


def default_pi_phase(*, phase: str = "intake") -> dict[str, Any]:
    current = phase if phase in PHASE_IDS else "intake"
    return {
        "current": current,
        "entered_at": None,
        "history": [],
        "task_completion": {},
        "phase_notes": "",
    }


def merge_pi_phase(existing: Optional[dict]) -> dict[str, Any]:
    base = default_pi_phase()
    if not existing:
        return base
    merged = {**base, **{k: v for k, v in existing.items() if k in base}}
    if merged.get("current") not in PHASE_IDS:
        merged["current"] = "intake"
    if not isinstance(merged.get("history"), list):
        merged["history"] = []
    if not isinstance(merged.get("task_completion"), dict):
        merged["task_completion"] = {}
    return merged


def phase_tasks_for(phase_id: str) -> list[dict[str, Any]]:
    templates = PHASE_TASKS.get(phase_id, ())
    return [{"id": t["id"], "label": t["label"], "done": False} for t in templates]


def enrich_phase_tasks(phase_id: str, task_completion: dict) -> list[dict[str, Any]]:
    items = []
    for t in PHASE_TASKS.get(phase_id, ()):
        items.append(
            {
                "id": t["id"],
                "label": t["label"],
                "done": bool(task_completion.get(t["id"], False)),
            }
        )
    return items


def compute_phase_audit(
    *,
    phase_id: str,
    pi_intake: Optional[dict],
    pi_insurance: Optional[dict],
    meds_summary: Optional[dict],
    alert_count: int = 0,
) -> list[dict[str, str]]:
    """Training-aligned case audit hints for the current phase."""
    hints: list[dict[str, str]] = []
    intake = pi_intake or {}
    insurance = pi_insurance or {}

    if phase_id in ("intake", "treating"):
        needs = intake.get("needs_list") or []
        missing = [n for n in needs if isinstance(n, dict) and not n.get("received")]
        if missing:
            hints.append(
                {
                    "code": "needs_list_open",
                    "severity": "medium",
                    "message": f"{len(missing)} Needs List item(s) still outstanding",
                }
            )
        if intake.get("conflict_check_status") == "flagged":
            hints.append(
                {"code": "conflict_flagged", "severity": "high", "message": "Conflict check flagged — attorney review required"}
            )

    if phase_id in ("treating", "record_gathering", "demand", "waiting_for_offer"):
        tp = (insurance.get("third_party") or {}) if isinstance(insurance.get("third_party"), dict) else {}
        if not tp.get("claim_number") and not tp.get("lor_sent_at"):
            hints.append(
                {"code": "lor_3p", "severity": "high", "message": "3P claim / LOR not documented — open day one per training"}
            )
        if alert_count > 0:
            hints.append(
                {
                    "code": "treatment_alerts",
                    "severity": "high",
                    "message": f"{alert_count} treatment compliance alert(s) on Meds tab",
                }
            )

    if phase_id in ("record_gathering", "demand"):
        summary = meds_summary or {}
        if summary.get("missing_cor_count", 0) > 0:
            hints.append(
                {
                    "code": "missing_cor",
                    "severity": "high",
                    "message": f"{summary['missing_cor_count']} provider(s) missing COR before demand",
                }
            )

    if phase_id == "litigate":
        hints.append(
            {
                "code": "transfer_lit",
                "severity": "medium",
                "message": "Queue transfer-to-litigation letters to providers and carriers (article 22)",
            }
        )

    return hints


class PiPhasePatchIn(BaseModel):
    phase: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=2000)
    phase_notes: Optional[str] = Field(None, max_length=4000)
    task_completion: Optional[dict[str, bool]] = None


def register_pi_phase_routes(
    api,
    db,
    get_current_user: Callable,
    new_id: Callable,
    now_iso: Callable,
    *,
    merge_pi_intake: Callable,
    merge_pi_insurance: Callable,
    summarize_ledger: Callable,
    compute_matter_treatment_alerts: Callable,
    enrich_ledger_items: Callable,
):
    async def _spawn_phase_letter_tasks(matter_id, firm_id, user, phase_id, ts):
        created_titles: list[str] = []
        for t in PHASE_LETTER_TASKS.get(phase_id, ()):
            existing = await db.tasks.find_one(
                {
                    "firm_id": firm_id,
                    "matter_id": matter_id,
                    "title": t["title"],
                    "status": {"$ne": "done"},
                }
            )
            if existing:
                continue
            due_date = (datetime.fromisoformat(ts) + timedelta(days=t["due_days"])).isoformat()
            await db.tasks.insert_one(
                {
                    "id": new_id(),
                    "firm_id": firm_id,
                    "matter_id": matter_id,
                    "title": t["title"],
                    "description": "Auto-created on PI phase change — see the matter's letter DocGen card.",
                    "priority": t["priority"],
                    "status": "open",
                    "assignee_id": user["id"],
                    "created_by": user["id"],
                    "created_at": ts,
                    "due_date": due_date,
                }
            )
            created_titles.append(t["title"])
        return created_titles

    @api.get("/pi/phases/catalog")
    async def pi_phases_catalog(user=Depends(get_current_user)):
        return {
            "phases": list(PI_PHASES),
            "phase_tasks": {pid: list(tasks) for pid, tasks in PHASE_TASKS.items()},
        }

    @api.get("/pi/phases/report")
    async def pi_phases_report(user=Depends(get_current_user)):
        counts: dict[str, int] = {p["id"]: 0 for p in PI_PHASES}
        cursor = db.matters.find(
            {"firm_id": user["firm_id"], "practice_area": "personal_injury"},
            {"_id": 0, "pi_phase": 1},
        )
        async for m in cursor:
            phase = merge_pi_phase(m.get("pi_phase")).get("current", "intake")
            if phase in counts:
                counts[phase] += 1
        return {"counts": counts, "phases": list(PI_PHASES)}

    @api.get("/matters/{matter_id}/phase")
    async def get_matter_phase(matter_id: str, user=Depends(get_current_user)):
        m = await db.matters.find_one(
            {"id": matter_id, "firm_id": user["firm_id"]},
            {"_id": 0, "pi_phase": 1, "practice_area": 1, "pi_intake": 1, "pi_insurance": 1, "incident_date": 1, "id": 1},
        )
        if not m:
            raise HTTPException(404, "Matter not found")

        pi_phase = merge_pi_phase(m.get("pi_phase"))
        current = pi_phase["current"]
        tasks = enrich_phase_tasks(current, pi_phase.get("task_completion") or {})

        meds_summary = None
        alert_count = 0
        if m.get("practice_area") == "personal_injury":
            rows = await db.med_ledger.find(
                {"firm_id": user["firm_id"], "matter_id": matter_id},
                {"_id": 0},
            ).to_list(500)
            items = enrich_ledger_items(rows, incident_date=m.get("incident_date"))
            alerts = compute_matter_treatment_alerts(items, incident_date=m.get("incident_date"))
            alert_count = len(alerts)
            meds_summary = summarize_ledger(items, alerts=alerts)

        audit_hints = compute_phase_audit(
            phase_id=current,
            pi_intake=merge_pi_intake(m.get("pi_intake")),
            pi_insurance=merge_pi_insurance(m.get("pi_insurance")),
            meds_summary=meds_summary,
            alert_count=alert_count,
        )

        incomplete = sum(1 for t in tasks if not t["done"])
        return {
            "matter_id": matter_id,
            "practice_area": m.get("practice_area"),
            "pi_phase": pi_phase,
            "phases": list(PI_PHASES),
            "tasks": tasks,
            "tasks_incomplete": incomplete,
            "audit_hints": audit_hints,
            "mapped_status": PHASE_TO_STATUS.get(current, "active"),
        }

    @api.patch("/matters/{matter_id}/phase")
    async def patch_matter_phase(matter_id: str, body: PiPhasePatchIn, user=Depends(get_current_user)):
        m = await db.matters.find_one(
            {"id": matter_id, "firm_id": user["firm_id"]},
            {"_id": 0, "pi_phase": 1, "practice_area": 1, "status": 1},
        )
        if not m:
            raise HTTPException(404, "Matter not found")
        if m.get("practice_area") != "personal_injury":
            raise HTTPException(400, "PI phase engine applies to personal injury matters only")

        pi_phase = merge_pi_phase(m.get("pi_phase"))
        ts = now_iso()
        patch_matter: dict[str, Any] = {"updated_at": ts}
        created_titles: list[str] = []

        if body.phase is not None:
            if body.phase not in PHASE_IDS:
                raise HTTPException(400, f"Invalid phase: {body.phase}")
            prev = pi_phase["current"]
            if body.phase != prev:
                pi_phase["history"].append(
                    {
                        "from": prev,
                        "to": body.phase,
                        "at": ts,
                        "by": user["id"],
                        "by_name": user.get("name"),
                        "notes": body.notes or "",
                    }
                )
                pi_phase["current"] = body.phase
                pi_phase["entered_at"] = ts
                mapped = PHASE_TO_STATUS.get(body.phase)
                if mapped:
                    patch_matter["status"] = mapped
                await db.activities.insert_one(
                    {
                        "id": new_id(),
                        "firm_id": user["firm_id"],
                        "matter_id": matter_id,
                        "actor_id": user["id"],
                        "actor_name": user.get("name"),
                        "type": "pi_phase_changed",
                        "description": f"PI phase: {prev} → {body.phase}",
                        "created_at": ts,
                    }
                )
                created_titles = await _spawn_phase_letter_tasks(matter_id, user["firm_id"], user, body.phase, ts)
                if created_titles:
                    await db.activities.insert_one(
                        {
                            "id": new_id(),
                            "firm_id": user["firm_id"],
                            "matter_id": matter_id,
                            "actor_id": user["id"],
                            "actor_name": user.get("name"),
                            "type": "phase_tasks_created",
                            "description": f"Auto-created {len(created_titles)} letter task(s) for phase {body.phase}",
                            "created_at": ts,
                        }
                    )
                from workflows import run_workflow_trigger

                await run_workflow_trigger(
                    db,
                    firm_id=user["firm_id"],
                    trigger="pi.phase_changed",
                    context={"matter_id": matter_id, "from_phase": prev, "to_phase": body.phase},
                    user_id=user["id"],
                    new_id=new_id,
                    now_iso=now_iso,
                )

        if body.phase_notes is not None:
            pi_phase["phase_notes"] = body.phase_notes

        if body.task_completion:
            merged_tasks = dict(pi_phase.get("task_completion") or {})
            for key, val in body.task_completion.items():
                merged_tasks[key] = bool(val)
            pi_phase["task_completion"] = merged_tasks

        if pi_phase.get("entered_at") is None:
            pi_phase["entered_at"] = ts

        patch_matter["pi_phase"] = pi_phase
        await db.matters.update_one({"id": matter_id, "firm_id": user["firm_id"]}, {"$set": patch_matter})

        updated = await db.matters.find_one({"id": matter_id}, {"_id": 0, "pi_phase": 1})
        return {
            "matter_id": matter_id,
            "pi_phase": merge_pi_phase(updated.get("pi_phase")),
            "letter_tasks_created": created_titles,
        }
