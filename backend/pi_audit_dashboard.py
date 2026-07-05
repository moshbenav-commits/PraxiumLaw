"""
PI Case OS — firm-wide case audit dashboard (UX-022).
Rolls up phase hints, treatment alerts, PD, demand queue, docs, comms cadence.
"""
from __future__ import annotations

from typing import Any, Callable, Optional

from fastapi import Depends

SEVERITY_ORDER = {"high": 0, "medium": 1, "low": 2}


def _max_severity(issues: list[dict]) -> str:
    if not issues:
        return "none"
    best = min(SEVERITY_ORDER.get(i.get("severity", "low"), 9) for i in issues)
    for label, rank in SEVERITY_ORDER.items():
        if rank == best:
            return label
    return "low"


def register_pi_audit_routes(
    api,
    db,
    get_current_user: Callable,
    *,
    merge_pi_intake: Callable,
    merge_pi_insurance: Callable,
    merge_pi_phase: Callable,
    merge_pi_demand: Callable,
    merge_pi_property_damage: Callable,
    merge_pi_comms: Callable,
    merge_pi_subrogation: Callable,
    merge_ledger_row: Callable,
    summarize_ledger: Callable,
    compute_matter_treatment_alerts: Callable,
    compute_phase_audit: Callable,
    compute_pd_summary: Callable,
    compute_comms_cadence: Callable,
    compute_subrogation_alerts: Callable,
):
    async def _matter_issues(matter: dict) -> list[dict[str, Any]]:
        issues: list[dict[str, Any]] = []
        mid = matter["id"]

        ledger_raw = matter.get("meds_ledger") or []
        items = [merge_ledger_row(r) for r in ledger_raw]
        treatment_alerts = compute_matter_treatment_alerts(items, incident_date=matter.get("incident_date"))
        for a in treatment_alerts:
            issues.append(
                {
                    "code": a.get("code", "treatment"),
                    "severity": a.get("severity", "high"),
                    "message": a.get("message", "Treatment alert"),
                    "area": "medical",
                    "tab": "medical",
                }
            )

        summary = summarize_ledger(items, alerts=treatment_alerts)
        phase = merge_pi_phase(matter.get("pi_phase"))
        phase_id = phase.get("current", "intake")
        hints = compute_phase_audit(
            phase_id=phase_id,
            pi_intake=merge_pi_intake(matter.get("pi_intake")),
            pi_insurance=merge_pi_insurance(matter.get("pi_insurance")),
            meds_summary=summary,
            alert_count=len(treatment_alerts),
        )
        for h in hints:
            issues.append({**h, "area": "pipeline", "tab": "pipeline"})

        pd = merge_pi_property_damage(matter.get("pi_property_damage"))
        pd_summary = compute_pd_summary(pd, incident_date=matter.get("incident_date"))
        for a in pd_summary.get("alerts") or []:
            issues.append({**a, "area": "pd", "tab": "pd"})

        demand = merge_pi_demand(matter.get("pi_demand"))
        if demand.get("status") == "pending_attorney_review":
            issues.append(
                {
                    "code": "demand_review",
                    "severity": "high",
                    "message": "Demand pending attorney review",
                    "area": "demand",
                    "tab": "demand",
                }
            )
        prep_open = sum(1 for i in demand.get("prep_checklist") or [] if not i.get("complete"))
        if prep_open and phase_id in ("record_gathering", "demand", "waiting_for_offer"):
            issues.append(
                {
                    "code": "demand_prep_open",
                    "severity": "medium",
                    "message": f"{prep_open} demand prep checklist item(s) open",
                    "area": "demand",
                    "tab": "demand",
                }
            )

        pi_comms = merge_pi_comms(matter.get("pi_comms"))
        pd_daily = any(a.get("code") == "daily_follow_up_due" for a in pd_summary.get("alerts") or [])
        cadence = compute_comms_cadence(matter, pi_comms, pd_active_daily=pd_daily)
        if cadence.get("due_count", 0) > 0:
            issues.append(
                {
                    "code": "comms_cadence_due",
                    "severity": "high" if cadence["due_count"] > 1 else "medium",
                    "message": f"{cadence['due_count']} client contact cadence item(s) due",
                    "area": "comms",
                    "tab": "comms",
                }
            )

        intake = merge_pi_intake(matter.get("pi_intake"))
        sub_alerts = compute_subrogation_alerts(
            matter.get("pi_subrogation"),
            medicare_recipient=intake.get("medicare_recipient"),
        )
        for a in sub_alerts:
            issues.append({**a, "area": "subrogation", "tab": "subrogation"})

        unclassified = int(matter.get("unclassified_doc_count") or 0)
        if unclassified:
            issues.append(
                {
                    "code": "docs_unclassified",
                    "severity": "medium",
                    "message": f"{unclassified} document(s) need taxonomy classification",
                    "area": "documents",
                    "tab": "documents",
                }
            )

        for issue in issues:
            issue.setdefault("matter_id", mid)
        return issues

    @api.get("/pi/audit/dashboard")
    async def pi_audit_dashboard(user=Depends(get_current_user)):
        firm_id = user["firm_id"]
        cursor = db.matters.find(
            {"firm_id": firm_id, "practice_area": "personal_injury"},
            {
                "_id": 0,
                "id": 1,
                "title": 1,
                "case_number": 1,
                "incident_date": 1,
                "created_at": 1,
                "pi_intake": 1,
                "pi_insurance": 1,
                "pi_phase": 1,
                "pi_demand": 1,
                "pi_property_damage": 1,
                "pi_comms": 1,
                "pi_subrogation": 1,
                "meds_ledger": 1,
            },
        )
        matters: list[dict] = []
        async for m in cursor:
            matters.append(m)

        doc_counts: dict[str, int] = {}
        doc_cursor = db.documents.find(
            {"firm_id": firm_id},
            {"_id": 0, "matter_id": 1, "taxonomy.doc_type": 1},
        )
        async for d in doc_cursor:
            mid = d.get("matter_id")
            if not mid:
                continue
            dt = (d.get("taxonomy") or {}).get("doc_type") or "misc"
            if dt == "misc":
                doc_counts[mid] = doc_counts.get(mid, 0) + 1

        rows: list[dict] = []
        severity_totals = {"high": 0, "medium": 0, "low": 0}
        area_totals: dict[str, int] = {}

        for m in matters:
            m["unclassified_doc_count"] = doc_counts.get(m["id"], 0)
            issues = await _matter_issues(m)
            if not issues:
                continue
            for i in issues:
                sev = i.get("severity", "low")
                if sev in severity_totals:
                    severity_totals[sev] += 1
                area = i.get("area", "other")
                area_totals[area] = area_totals.get(area, 0) + 1
            phase = merge_pi_phase(m.get("pi_phase"))
            rows.append(
                {
                    "matter_id": m["id"],
                    "case_number": m.get("case_number"),
                    "title": m.get("title"),
                    "phase": phase.get("current", "intake"),
                    "issue_count": len(issues),
                    "max_severity": _max_severity(issues),
                    "issues": issues,
                }
            )

        rows.sort(key=lambda r: (SEVERITY_ORDER.get(r["max_severity"], 9), -r["issue_count"]))

        demand_queue = sum(
            1
            for m in matters
            if merge_pi_demand(m.get("pi_demand")).get("status") == "pending_attorney_review"
        )

        return {
            "matters_audited": len(matters),
            "matters_with_issues": len(rows),
            "matters_clean": len(matters) - len(rows),
            "severity_totals": severity_totals,
            "area_totals": area_totals,
            "demand_review_queue_count": demand_queue,
            "items": rows[:100],
            "truncated": len(rows) > 100,
        }
