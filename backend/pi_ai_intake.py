"""
PI Case OS — AI intake fill (docgen.intake gap).

Extracts intake / insurance merge fields from uploaded matter documents
(declaration pages, police reports, exchange tickets) via Claude and returns
PROPOSALS for staff review — nothing is written to the matter here. The
frontend applies confirmed values through the existing PATCH endpoints, so
RBAC and audit behavior are unchanged.
"""
from __future__ import annotations

import json
from typing import Any, Callable, Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel

MAX_CHARS_PER_DOC = 15_000
MAX_CHARS_TOTAL = 60_000

_ADJUSTER_KEYS = ("name", "phone", "email", "mailing_address")

FIELD_LABELS: tuple[tuple[str, str], ...] = (
    ("contact.name", "Client name"),
    ("contact.phone", "Client phone"),
    ("contact.email", "Client email"),
    ("contact.address", "Client mailing address"),
    ("contact.date_of_birth", "Client date of birth"),
    ("matter.incident_date", "Date of loss"),
    ("matter.description", "Incident description"),
    ("insurance.third_party.carrier_name", "3P carrier name"),
    ("insurance.third_party.claim_number", "3P claim number"),
    ("insurance.third_party.policy_number", "3P policy number"),
    ("insurance.third_party.adjuster.name", "3P adjuster name"),
    ("insurance.third_party.adjuster.phone", "3P adjuster phone"),
    ("insurance.third_party.adjuster.email", "3P adjuster email"),
    ("insurance.third_party.adjuster.mailing_address", "3P adjuster mailing address"),
    ("insurance.first_party.carrier_name", "1P carrier name"),
    ("insurance.first_party.claim_number", "1P claim number"),
    ("insurance.first_party.policy_number", "1P policy number"),
    ("insurance.first_party.adjuster.name", "1P adjuster name"),
    ("insurance.first_party.adjuster.phone", "1P adjuster phone"),
    ("insurance.first_party.adjuster.email", "1P adjuster email"),
    ("insurance.first_party.adjuster.mailing_address", "1P adjuster mailing address"),
    ("insurance.first_party.medpay_limit", "MedPay limit"),
)

_EXTRACTION_SYSTEM = """You extract personal-injury intake fields from case documents for a paralegal to review.
Respond with ONLY a JSON object — no prose, no markdown fences — in exactly this schema:
{
  "contact": {"name": null, "phone": null, "email": null, "address": null, "date_of_birth": null},
  "matter": {"incident_date": null, "description": null},
  "insurance": {
    "third_party": {"carrier_name": null, "claim_number": null, "policy_number": null,
                    "adjuster": {"name": null, "phone": null, "email": null, "mailing_address": null}},
    "first_party": {"carrier_name": null, "claim_number": null, "policy_number": null, "medpay_limit": null,
                    "adjuster": {"name": null, "phone": null, "email": null, "mailing_address": null}}
  }
}
Rules:
- Use null for anything the documents do not state. NEVER guess or invent values.
- "first_party" is the CLIENT'S OWN auto policy; "third_party" is the ADVERSE driver's carrier.
- Dates in ISO format (YYYY-MM-DD). Phone numbers as written. medpay_limit as a number (no $ or commas).
- "description" = one or two factual sentences about how the incident occurred, from the documents only.
- Addresses as a single string with commas or \\n between lines."""


def _empty_adjuster_proposal() -> dict[str, Any]:
    return {k: None for k in _ADJUSTER_KEYS}


def _empty_side_proposal(*, medpay: bool = False) -> dict[str, Any]:
    side: dict[str, Any] = {
        "carrier_name": None,
        "claim_number": None,
        "policy_number": None,
        "adjuster": _empty_adjuster_proposal(),
    }
    if medpay:
        side["medpay_limit"] = None
    return side


def empty_proposals() -> dict[str, Any]:
    return {
        "contact": {"name": None, "phone": None, "email": None, "address": None, "date_of_birth": None},
        "matter": {"incident_date": None, "description": None},
        "insurance": {
            "third_party": _empty_side_proposal(),
            "first_party": _empty_side_proposal(medpay=True),
        },
    }


def _clean_str(value: Any, max_len: int = 1000) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    return text[:max_len] or None


def normalize_extraction(raw: Any) -> dict[str, Any]:
    """Coerce model output into the exact proposals schema — drop anything unknown."""
    out = empty_proposals()
    if not isinstance(raw, dict):
        return out
    contact = raw.get("contact") or {}
    for key in out["contact"]:
        out["contact"][key] = _clean_str(contact.get(key)) if isinstance(contact, dict) else None
    matter = raw.get("matter") or {}
    if isinstance(matter, dict):
        out["matter"]["incident_date"] = _clean_str(matter.get("incident_date"), 40)
        out["matter"]["description"] = _clean_str(matter.get("description"), 2000)
    insurance = raw.get("insurance") or {}
    for side_key in ("third_party", "first_party"):
        side_raw = insurance.get(side_key) if isinstance(insurance, dict) else None
        side_out = out["insurance"][side_key]
        if not isinstance(side_raw, dict):
            continue
        for key in ("carrier_name", "claim_number", "policy_number"):
            side_out[key] = _clean_str(side_raw.get(key), 300)
        adjuster_raw = side_raw.get("adjuster")
        if isinstance(adjuster_raw, dict):
            for key in _ADJUSTER_KEYS:
                side_out["adjuster"][key] = _clean_str(adjuster_raw.get(key))
        if side_key == "first_party":
            limit = side_raw.get("medpay_limit")
            try:
                side_out["medpay_limit"] = float(limit) if limit is not None else None
            except (TypeError, ValueError):
                side_out["medpay_limit"] = None
    return out


def parse_model_json(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:]
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end <= start:
        raise ValueError("no JSON object in model output")
    return json.loads(cleaned[start : end + 1])


def _dig(data: dict, path: str) -> Any:
    node: Any = data
    for part in path.split("."):
        if not isinstance(node, dict):
            return None
        node = node.get(part)
    return node


def compute_missing_fields(proposals: dict, current: dict) -> list[dict[str, str]]:
    missing = []
    for path, label in FIELD_LABELS:
        if not _dig(proposals, path) and not _dig(current, path):
            missing.append({"path": path, "label": label})
    return missing


def build_current_shape(matter: dict, client: Optional[dict], insurance: dict) -> dict[str, Any]:
    tp = insurance.get("third_party") or {}
    fp = insurance.get("first_party") or {}

    def side(src: dict, *, medpay: bool = False) -> dict[str, Any]:
        adjuster = src.get("adjuster") or {}
        out: dict[str, Any] = {
            "carrier_name": src.get("carrier_name") or None,
            "claim_number": src.get("claim_number") or None,
            "policy_number": src.get("policy_number") or None,
            "adjuster": {k: adjuster.get(k) or None for k in _ADJUSTER_KEYS},
        }
        if medpay:
            out["medpay_limit"] = (src.get("medpay") or {}).get("limit")
        return out

    client = client or {}
    return {
        "contact": {
            "name": client.get("name") or None,
            "phone": client.get("phone") or None,
            "email": client.get("email") or None,
            "address": client.get("address") or None,
            "date_of_birth": client.get("date_of_birth") or None,
        },
        "matter": {
            "incident_date": matter.get("incident_date") or None,
            "description": matter.get("description") or None,
        },
        "insurance": {
            "third_party": side(tp),
            "first_party": side(fp, medpay=True),
        },
    }


class AiIntakeFillIn(BaseModel):
    document_ids: Optional[list[str]] = None


def register_pi_ai_intake_routes(
    api,
    db,
    get_current_user: Callable,
    new_id: Callable,
    now_iso: Callable,
    *,
    merge_pi_insurance: Callable,
    stream_ai_reply: Callable,
):
    @api.post("/matters/{matter_id}/ai/intake-fill")
    async def ai_intake_fill(matter_id: str, body: AiIntakeFillIn, user=Depends(get_current_user)):
        m = await db.matters.find_one({"id": matter_id, "firm_id": user["firm_id"]}, {"_id": 0})
        if not m:
            raise HTTPException(404, "Matter not found")
        if m.get("practice_area") != "personal_injury":
            raise HTTPException(400, "AI intake fill applies to personal injury matters only")

        client_id = m.get("client_id") or m.get("client_contact_id")
        client = None
        if client_id:
            client = await db.contacts.find_one({"id": client_id, "firm_id": user["firm_id"]}, {"_id": 0})

        query: dict[str, Any] = {
            "firm_id": user["firm_id"],
            "matter_id": matter_id,
            "extracted_text": {"$nin": [None, ""]},
        }
        if body.document_ids:
            query["id"] = {"$in": body.document_ids}
        docs = await db.documents.find(
            query, {"_id": 0, "id": 1, "name": 1, "extracted_text": 1}
        ).sort("uploaded_at", -1).to_list(50)
        if not docs:
            raise HTTPException(
                400,
                "No documents with extractable text on this matter — upload text PDFs "
                "(scanned images need OCR before AI can read them)",
            )

        chunks: list[str] = []
        used: list[str] = []
        total = 0
        for doc in docs:
            text = (doc.get("extracted_text") or "")[:MAX_CHARS_PER_DOC]
            if not text.strip():
                continue
            if total + len(text) > MAX_CHARS_TOTAL:
                break
            chunks.append(f"=== DOCUMENT: {doc.get('name')} ===\n{text}")
            used.append(doc.get("name") or doc["id"])
            total += len(text)
        if not chunks:
            raise HTTPException(400, "Selected documents have no extractable text")

        message = "Extract the intake fields from these case documents:\n\n" + "\n\n".join(chunks)
        collected = ""
        async for chunk in stream_ai_reply(db, system=_EXTRACTION_SYSTEM, message=message, max_tokens=2000):
            collected += chunk
        if collected.strip().startswith("[Error:"):
            raise HTTPException(400, collected.strip().strip("[]"))

        try:
            proposals = normalize_extraction(parse_model_json(collected))
        except (ValueError, json.JSONDecodeError):
            raise HTTPException(502, "AI returned output that could not be parsed — try again")

        current = build_current_shape(m, client, merge_pi_insurance(m.get("pi_insurance")))

        await db.activities.insert_one(
            {
                "id": new_id(),
                "firm_id": user["firm_id"],
                "matter_id": matter_id,
                "actor_id": user["id"],
                "actor_name": user.get("name"),
                "type": "ai_intake_fill",
                "description": f"AI intake fill ran over {len(used)} document(s) — proposals pending staff review",
                "created_at": now_iso(),
            }
        )
        return {
            "proposals": proposals,
            "current": current,
            "missing_fields": compute_missing_fields(proposals, current),
            "documents_used": used,
            "client_contact_id": client_id,
        }
