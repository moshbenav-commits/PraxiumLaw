"""
PI Case OS — document taxonomy + redaction gate.
"""
from __future__ import annotations

from typing import Any, Callable, Literal, Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field

DOC_TYPES: tuple[dict[str, str], ...] = (
    {"id": "intake", "label": "Intake", "folder": "Intake"},
    {"id": "medical", "label": "Medical", "folder": "Medical"},
    {"id": "auto_insurance", "label": "Auto insurance", "folder": "Auto insurance"},
    {"id": "health_subro", "label": "Health / subrogation", "folder": "Health subro"},
    {"id": "invoice_receipt", "label": "Invoice / receipt", "folder": "Invoices"},
    {"id": "pleadings", "label": "Pleadings", "folder": "Pleadings"},
    {"id": "misc", "label": "Miscellaneous", "folder": "Misc"},
)

MEDICAL_CODES: tuple[dict[str, str], ...] = (
    {"id": "MR", "label": "Medical records (MR)"},
    {"id": "B", "label": "Bill (B)"},
    {"id": "FE", "label": "Futures estimate (FE)"},
    {"id": "COR", "label": "Certificate of records (COR)"},
)

REDACTION_STATUSES = ("not_required", "pending", "complete")
REDACT_BEFORE_CARRIER = frozenset({"medical", "auto_insurance"})

REDACTION_CHECKLIST = (
    "Date of birth",
    "Age",
    "Address",
    "Social Security number",
    "Medicare ID",
    "VIN",
    "License plate",
    "Health insurance identifiers",
    "Sensitive health information",
    "Ethnicity",
    "Lien holder information (when sending to adverse carriers)",
)


def folder_for_doc_type(doc_type: str) -> str:
    for row in DOC_TYPES:
        if row["id"] == doc_type:
            return row["folder"]
    return "Misc"


def default_doc_taxonomy(doc_type: str = "misc", medical_code: Optional[str] = None) -> dict[str, Any]:
    dt = doc_type if doc_type in {r["id"] for r in DOC_TYPES} else "misc"
    mc = medical_code if medical_code in {r["id"] for r in MEDICAL_CODES} else None
    if dt != "medical":
        mc = None
    redaction = "pending" if dt in REDACT_BEFORE_CARRIER else "not_required"
    return {
        "doc_type": dt,
        "medical_code": mc,
        "provider_label": "",
        "taxonomy_notes": "",
        "redaction_status": redaction,
        "carrier_share_ok": False,
        "redaction_acknowledged_by": None,
        "redaction_acknowledged_at": None,
    }


def merge_doc_taxonomy(existing: Optional[dict]) -> dict[str, Any]:
    if not existing:
        return default_doc_taxonomy()
    base = default_doc_taxonomy(existing.get("doc_type", "misc"), existing.get("medical_code"))
    merged = {**base, **{k: v for k, v in existing.items() if k in base}}
    if merged.get("redaction_status") not in REDACTION_STATUSES:
        merged["redaction_status"] = base["redaction_status"]
    if merged["doc_type"] != "medical":
        merged["medical_code"] = None
    if merged["redaction_status"] != "complete":
        merged["carrier_share_ok"] = False
    return merged


def validate_upload_taxonomy(doc_type: str, medical_code: Optional[str]) -> dict[str, Any]:
    if doc_type not in {r["id"] for r in DOC_TYPES}:
        raise HTTPException(400, "Invalid doc_type")
    if doc_type == "medical" and not medical_code:
        raise HTTPException(400, "medical_code required when doc_type is medical (MR, B, FE, or COR)")
    if medical_code and medical_code not in {r["id"] for r in MEDICAL_CODES}:
        raise HTTPException(400, "Invalid medical_code")
    return default_doc_taxonomy(doc_type, medical_code)


class DocumentTaxonomyPatchIn(BaseModel):
    doc_type: Optional[
        Literal["intake", "medical", "auto_insurance", "health_subro", "invoice_receipt", "pleadings", "misc"]
    ] = None
    medical_code: Optional[Literal["MR", "B", "FE", "COR"]] = None
    provider_label: Optional[str] = Field(None, max_length=200)
    taxonomy_notes: Optional[str] = Field(None, max_length=500)
    redaction_status: Optional[Literal["not_required", "pending", "complete"]] = None
    carrier_share_ok: Optional[bool] = None
    acknowledge_redaction: Optional[bool] = None


def register_pi_document_routes(api, db, get_current_user: Callable, now_iso: Callable):
    @api.get("/pi/documents/taxonomy")
    async def document_taxonomy_catalog(user=Depends(get_current_user)):
        return {
            "doc_types": list(DOC_TYPES),
            "medical_codes": list(MEDICAL_CODES),
            "redaction_checklist": list(REDACTION_CHECKLIST),
        }

    @api.patch("/documents/{doc_id}/taxonomy")
    async def patch_document_taxonomy(doc_id: str, body: DocumentTaxonomyPatchIn, user=Depends(get_current_user)):
        doc = await db.documents.find_one({"id": doc_id, "firm_id": user["firm_id"]}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Document not found")

        taxonomy = merge_doc_taxonomy(doc.get("taxonomy"))

        if body.doc_type is not None:
            taxonomy["doc_type"] = body.doc_type
            if body.doc_type != "medical":
                taxonomy["medical_code"] = None
            if body.doc_type in REDACT_BEFORE_CARRIER and taxonomy["redaction_status"] == "not_required":
                taxonomy["redaction_status"] = "pending"
            if body.doc_type not in REDACT_BEFORE_CARRIER:
                taxonomy["redaction_status"] = "not_required"
                taxonomy["carrier_share_ok"] = False

        if body.medical_code is not None:
            if taxonomy["doc_type"] != "medical" and body.medical_code:
                raise HTTPException(400, "Set doc_type to medical before medical_code")
            taxonomy["medical_code"] = body.medical_code if taxonomy["doc_type"] == "medical" else None

        if body.provider_label is not None:
            taxonomy["provider_label"] = body.provider_label
        if body.taxonomy_notes is not None:
            taxonomy["taxonomy_notes"] = body.taxonomy_notes

        if body.acknowledge_redaction:
            taxonomy["redaction_status"] = "complete"
            taxonomy["redaction_acknowledged_by"] = user["id"]
            taxonomy["redaction_acknowledged_at"] = now_iso()

        if body.redaction_status is not None:
            taxonomy["redaction_status"] = body.redaction_status
            if body.redaction_status != "complete":
                taxonomy["carrier_share_ok"] = False
                taxonomy["redaction_acknowledged_by"] = None
                taxonomy["redaction_acknowledged_at"] = None

        if body.carrier_share_ok is not None:
            if body.carrier_share_ok and taxonomy["doc_type"] in REDACT_BEFORE_CARRIER:
                if taxonomy["redaction_status"] != "complete":
                    raise HTTPException(
                        400,
                        "Complete redaction checklist before marking safe for carrier share",
                    )
            taxonomy["carrier_share_ok"] = body.carrier_share_ok

        taxonomy = merge_doc_taxonomy(taxonomy)
        folder = folder_for_doc_type(taxonomy["doc_type"])

        await db.documents.update_one(
            {"id": doc_id, "firm_id": user["firm_id"]},
            {"$set": {"taxonomy": taxonomy, "folder": folder}},
        )
        updated = await db.documents.find_one({"id": doc_id}, {"_id": 0, "data_b64": 0})
        return updated
