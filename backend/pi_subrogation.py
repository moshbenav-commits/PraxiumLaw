"""
PI Case OS — health insurance / Medicare subrogation (UX-019).
"""
from __future__ import annotations

from typing import Any, Callable, Literal, Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field

SUBRO_STATUSES = ("not_open", "open", "resolved", "not_applicable")
SUBRO_PATHS = ("none", "medicare", "medicaid", "health_plan", "mixed")

MEDICARE_CRITICAL_CHECKLIST: tuple[dict[str, Any], ...] = (
    {"id": "intake_medicare_flag", "label": "Intake Medicare flag matches client (yes/no branch)", "critical": True},
    {"id": "medicare_questionnaire", "label": "Medicare questionnaire on file (if recipient)", "critical": True},
    {"id": "medicare_intake_pack", "label": "Correct Medicare vs non-Medicare intake packet signed", "critical": True},
    {"id": "benefits_used_confirmed", "label": "Confirmed whether health benefits were actually used (ER/ambulance/hospital)", "critical": True},
    {"id": "lor_health_plan", "label": "Letter of representation / notice to health plan or recovery vendor", "critical": True},
    {"id": "lien_verification", "label": "Lien verification requested where balance uncertain", "critical": False},
    {"id": "medicaid_caution", "label": "If Medicaid/poor-aid — attorney review before opening (training caution)", "critical": True},
    {"id": "no_open_without_benefits", "label": "Subrogation not opened without documented benefit usage", "critical": True},
)


def _default_checklist() -> list[dict[str, Any]]:
    return [
        {"id": row["id"], "label": row["label"], "critical": row["critical"], "complete": False, "notes": ""}
        for row in MEDICARE_CRITICAL_CHECKLIST
    ]


def default_pi_subrogation() -> dict[str, Any]:
    return {
        "status": "not_open",
        "path": "none",
        "health_plan_used": None,
        "health_plan_name": "",
        "recovery_vendor": "",
        "letter_sent_at": None,
        "benefits_used_notes": "",
        "attorney_review_required": False,
        "attorney_reviewed_at": None,
        "checklist": _default_checklist(),
        "notes": "",
    }


def merge_pi_subrogation(existing: Optional[dict]) -> dict[str, Any]:
    base = default_pi_subrogation()
    if not existing:
        return base
    merged = {**base, **{k: v for k, v in existing.items() if k in base and k != "checklist"}}
    if existing.get("checklist"):
        by_id = {i["id"]: i for i in existing["checklist"] if isinstance(i, dict) and i.get("id")}
        merged["checklist"] = []
        for row in _default_checklist():
            saved = by_id.get(row["id"], {})
            merged["checklist"].append(
                {
                    **row,
                    "complete": bool(saved.get("complete", False)),
                    "notes": saved.get("notes") or "",
                }
            )
    return merged


def compute_subrogation_alerts(
    pi_subrogation: dict,
    *,
    medicare_recipient: Optional[bool] = None,
) -> list[dict[str, str]]:
    alerts: list[dict[str, str]] = []
    sub = merge_pi_subrogation(pi_subrogation)

    if medicare_recipient is True and sub.get("path") not in ("medicare", "mixed"):
        alerts.append(
            {
                "code": "medicare_path_mismatch",
                "severity": "high",
                "message": "Intake flagged Medicare recipient — confirm subrogation path and Medicare checklist",
            }
        )

    if sub.get("status") == "open":
        incomplete_critical = [
            i for i in sub.get("checklist", []) if i.get("critical") and not i.get("complete")
        ]
        if incomplete_critical:
            alerts.append(
                {
                    "code": "subro_checklist",
                    "severity": "high",
                    "message": f"{len(incomplete_critical)} critical subrogation checklist item(s) open",
                }
            )

    if sub.get("health_plan_used") is True and sub.get("status") == "not_open":
        alerts.append(
            {
                "code": "subro_should_open",
                "severity": "medium",
                "message": "Health benefits used — training says open subrogation when ER/hospital/ambulance billed to plan",
            }
        )

    if sub.get("attorney_review_required") and not sub.get("attorney_reviewed_at"):
        alerts.append(
            {
                "code": "subro_attorney_review",
                "severity": "high",
                "message": "Attorney review required before subrogation letters (Medicaid/caution path)",
            }
        )

    return alerts


class SubrogationChecklistPatch(BaseModel):
    id: str
    complete: Optional[bool] = None
    notes: Optional[str] = Field(None, max_length=500)


class PiSubrogationPatchIn(BaseModel):
    status: Optional[Literal["not_open", "open", "resolved", "not_applicable"]] = None
    path: Optional[Literal["none", "medicare", "medicaid", "health_plan", "mixed"]] = None
    health_plan_used: Optional[bool] = None
    health_plan_name: Optional[str] = Field(None, max_length=200)
    recovery_vendor: Optional[str] = Field(None, max_length=200)
    letter_sent_at: Optional[str] = None
    benefits_used_notes: Optional[str] = Field(None, max_length=2000)
    attorney_review_required: Optional[bool] = None
    attorney_reviewed_at: Optional[str] = None
    mark_attorney_reviewed: Optional[bool] = None
    checklist: Optional[list[SubrogationChecklistPatch]] = None
    notes: Optional[str] = Field(None, max_length=4000)


def register_pi_subrogation_routes(
    api,
    db,
    get_current_user: Callable,
    now_iso: Callable,
    *,
    merge_pi_intake: Callable,
):
    async def _load_pi_matter(matter_id: str, firm_id: str):
        m = await db.matters.find_one(
            {"id": matter_id, "firm_id": firm_id},
            {"_id": 0, "id": 1, "practice_area": 1, "pi_subrogation": 1, "pi_intake": 1},
        )
        if not m:
            raise HTTPException(404, "Matter not found")
        if m.get("practice_area") != "personal_injury":
            raise HTTPException(400, "Subrogation module applies to PI matters only")
        return m

    @api.get("/pi/subrogation/catalog")
    async def subrogation_catalog(user=Depends(get_current_user)):
        return {
            "statuses": list(SUBRO_STATUSES),
            "paths": list(SUBRO_PATHS),
            "checklist": list(MEDICARE_CRITICAL_CHECKLIST),
        }

    @api.get("/matters/{matter_id}/subrogation")
    async def get_matter_subrogation(matter_id: str, user=Depends(get_current_user)):
        matter = await _load_pi_matter(matter_id, user["firm_id"])
        pi_subrogation = merge_pi_subrogation(matter.get("pi_subrogation"))
        intake = merge_pi_intake(matter.get("pi_intake"))
        alerts = compute_subrogation_alerts(pi_subrogation, medicare_recipient=intake.get("medicare_recipient"))
        return {
            "matter_id": matter_id,
            "pi_subrogation": pi_subrogation,
            "medicare_recipient": intake.get("medicare_recipient"),
            "alerts": alerts,
            "training_article": "23-intake-forms-and-signature-packet",
        }

    @api.patch("/matters/{matter_id}/subrogation")
    async def patch_matter_subrogation(matter_id: str, body: PiSubrogationPatchIn, user=Depends(get_current_user)):
        matter = await _load_pi_matter(matter_id, user["firm_id"])
        pi_subrogation = merge_pi_subrogation(matter.get("pi_subrogation"))

        for field in (
            "status",
            "path",
            "health_plan_used",
            "health_plan_name",
            "recovery_vendor",
            "letter_sent_at",
            "benefits_used_notes",
            "attorney_review_required",
            "attorney_reviewed_at",
            "notes",
        ):
            val = getattr(body, field)
            if val is not None:
                pi_subrogation[field] = val

        if body.mark_attorney_reviewed:
            pi_subrogation["attorney_reviewed_at"] = now_iso()

        if body.checklist:
            by_id = {item.id: item for item in body.checklist}
            for row in pi_subrogation["checklist"]:
                if row["id"] in by_id:
                    patch = by_id[row["id"]]
                    if patch.complete is not None:
                        row["complete"] = patch.complete
                    if patch.notes is not None:
                        row["notes"] = patch.notes

        await db.matters.update_one(
            {"id": matter_id, "firm_id": user["firm_id"]},
            {"$set": {"pi_subrogation": pi_subrogation}},
        )
        intake = merge_pi_intake(matter.get("pi_intake"))
        alerts = compute_subrogation_alerts(pi_subrogation, medicare_recipient=intake.get("medicare_recipient"))
        return {"pi_subrogation": pi_subrogation, "alerts": alerts}
