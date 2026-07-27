"""
PI Case OS — AI document classifier (Matter-aware DocGen companion, doc-classify gap).

Classifies an uploaded document's `extracted_text` into the existing
pi_documents.py taxonomy via Claude and returns a PROPOSAL — {type,
confidence, rationale} — for staff to confirm through the EXISTING
`PATCH /documents/{doc_id}/taxonomy` route (pi_documents.py). Nothing is
auto-applied here; this mirrors pi_ai_intake.py's "AI proposes, staff
disposes" pattern and leaves RBAC/audit behavior on the taxonomy route
completely unchanged.
"""
from __future__ import annotations

import json
from typing import Any, Callable, Optional

from fastapi import Depends, HTTPException

from pi_documents import DOC_TYPES, MEDICAL_CODES
from rbac import role_has_permission

MAX_CHARS = 12_000

_DOC_TYPE_IDS = {row["id"] for row in DOC_TYPES}
_MEDICAL_CODE_IDS = {row["id"] for row in MEDICAL_CODES}


def _doc_types_prompt() -> str:
    return "\n".join(f'- "{row["id"]}": {row["label"]}' for row in DOC_TYPES)


def _medical_codes_prompt() -> str:
    return "\n".join(f'- "{row["id"]}": {row["label"]}' for row in MEDICAL_CODES)


_SYSTEM = f"""You classify a personal-injury case document into a fixed taxonomy for a paralegal to confirm.
Respond with ONLY a JSON object — no prose, no markdown fences — in exactly this schema:
{{"doc_type": "<one of the ids below>", "medical_code": "<MR, B, FE, COR, or null>", "confidence": <0.0-1.0>, "rationale": "<one sentence citing what in the text indicated this>"}}

doc_type options:
{_doc_types_prompt()}

medical_code applies ONLY when doc_type is "medical" — options:
{_medical_codes_prompt()}
Set medical_code to null when doc_type is not "medical" or the sub-type isn't clear.

Rules:
- Base the classification ONLY on the document text provided. Never guess facts not in the text.
- If the text doesn't clearly indicate a type, choose "misc" and set confidence below 0.4.
- confidence reflects how CERTAIN you are of the type, not how important the document is."""


def _valid_doc_type(value: Any) -> str:
    return value if value in _DOC_TYPE_IDS else "misc"


def _valid_medical_code(value: Any, doc_type: str) -> Optional[str]:
    if doc_type != "medical":
        return None
    return value if value in _MEDICAL_CODE_IDS else None


def parse_classification(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:]
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end <= start:
        raise ValueError("no JSON object in model output")
    raw = json.loads(cleaned[start : end + 1])
    doc_type = _valid_doc_type(raw.get("doc_type"))
    medical_code = _valid_medical_code(raw.get("medical_code"), doc_type)
    try:
        confidence = float(raw.get("confidence"))
    except (TypeError, ValueError):
        confidence = 0.0
    confidence = max(0.0, min(1.0, confidence))
    rationale = str(raw.get("rationale") or "").strip()[:500]
    return {"doc_type": doc_type, "medical_code": medical_code, "confidence": confidence, "rationale": rationale}


def register_pi_doc_classify_routes(
    api,
    db,
    get_current_user: Callable,
    new_id: Callable,
    now_iso: Callable,
    *,
    stream_ai_reply: Callable,
):
    @api.post("/documents/{doc_id}/classify")
    async def classify_document(doc_id: str, user=Depends(get_current_user)):
        if not role_has_permission(user.get("role", "staff"), "documents.read"):
            raise HTTPException(403, f"Role '{user.get('role')}' cannot classify documents")

        doc = await db.documents.find_one(
            {"id": doc_id, "firm_id": user["firm_id"]},
            {"_id": 0, "id": 1, "name": 1, "matter_id": 1, "extracted_text": 1, "taxonomy": 1},
        )
        if not doc:
            raise HTTPException(404, "Document not found")

        text = (doc.get("extracted_text") or "").strip()
        if not text:
            raise HTTPException(
                400,
                "No extractable text on this document — scanned images need OCR before AI can classify them",
            )

        message = f"Document name: {doc.get('name')}\n\nDocument text:\n{text[:MAX_CHARS]}"
        collected = ""
        async for chunk in stream_ai_reply(db, system=_SYSTEM, message=message, max_tokens=300):
            collected += chunk
        if collected.strip().startswith("[Error:"):
            raise HTTPException(400, collected.strip().strip("[]"))

        try:
            result = parse_classification(collected)
        except (ValueError, json.JSONDecodeError):
            raise HTTPException(502, "AI returned output that could not be parsed — try again")

        await db.activities.insert_one(
            {
                "id": new_id(),
                "firm_id": user["firm_id"],
                "matter_id": doc.get("matter_id"),
                "actor_id": user["id"],
                "actor_name": user.get("name"),
                "type": "document_classify_proposed",
                "description": (
                    f"AI proposed type '{result['doc_type']}' for {doc.get('name')} "
                    f"(confidence {result['confidence']:.2f}) — pending staff confirm"
                ),
                "created_at": now_iso(),
            }
        )

        current_type = (doc.get("taxonomy") or {}).get("doc_type")
        return {
            "document_id": doc_id,
            "proposal": result,
            "current_doc_type": current_type,
            "changed": result["doc_type"] != current_type,
        }
