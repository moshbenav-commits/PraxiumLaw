"""
Praxium Suite — intake-mailbox classifier and adapter layer (P2b build).

Every inbound mail item (paralegal forward, scanned intake, portal upload
routed through mail) lands here first. It is classified by cheap keyword/
sender heuristics, persisted for audit, and — when the signal is strong
enough — routed straight into the relevant subsystem. Today that means the
Citation OS (citations.py): a high-confidence citation email creates a
citation draft the same way POST /citations does, so the ticket never sits
unrouted in an inbox. Low-confidence classifications never fail silently;
they raise into the shared exception queue (exceptions_queue.py) for a human
to key in instead.

File-isolated by design: this module reproduces the citation document shape
rather than importing it from citations.py, so mail intake can evolve (or be
swapped for a real inbound-mail provider) without coupling to the Citation
OS pipeline's internals.
"""
from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Callable, Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel

from exceptions_queue import raise_exception

TICKET_TYPES: tuple[str, ...] = (
    "citation",
    "medical_record",
    "medical_bill",
    "lien_notice",
    "insurance_correspondence",
    "court_notice",
    "general_correspondence",
    "unknown",
)

# Confidence below this threshold never auto-routes — it raises an
# exception instead. Mirrors citations.LOW_CONFIDENCE_THRESHOLD, but kept as
# a local constant so this module stays import-free of citations.py.
LOW_CONFIDENCE_THRESHOLD = 0.7

# Ordered so a tie in matched-signal count is broken toward the
# highest-priority category (citation first — silence on a citation is the
# most expensive failure mode).
TEXT_SIGNALS: dict[str, tuple[str, ...]] = {
    "citation": ("citation", "ticket", "violation", "court", "fine", "summons"),
    "court_notice": ("hearing", "notice of", "docket", "scheduling order", "case number"),
    "lien_notice": ("lien", "subrogation", "reimbursement", "right of recovery"),
    "insurance_correspondence": ("claim", "adjuster", "policy", "coverage", "insurance"),
    "medical_bill": ("statement", "invoice", "balance due", "amount due", "itemized"),
    "medical_record": ("records", "chart", "mri", "radiology", "medical history", "physician notes"),
}

SENDER_SIGNALS: dict[str, tuple[str, ...]] = {
    "citation": ("dmv", "traffic", "clerk of court", "municipal court"),
    "court_notice": ("court", "clerk", "docket"),
    "lien_notice": ("lien", "subrogation", "recovery"),
    "insurance_correspondence": ("claims", "insurance", "adjuster"),
    "medical_bill": ("billing", "patientaccounts", "revenuecycle"),
    "medical_record": ("records", "healthinfo", "medrecords", "hospital"),
}

_CITATION_KEYWORD_RE = re.compile(r"(?:citation|ticket|violation)\b", re.IGNORECASE)
# A generic alnum/dash token — used within a window after a citation keyword.
# Only tokens containing at least one digit are accepted below, which is what
# keeps this from matching plain words like "Notice" or "number" themselves.
_TOKEN_RE = re.compile(r"\b([A-Za-z0-9][A-Za-z0-9\-]{2,19})\b")
_CITATION_NUMBER_WINDOW = 80
_FINE_AMOUNT_RE = re.compile(r"\$\s?([\d,]+(?:\.\d{1,2})?)")

_ISO_DATE_RE = re.compile(r"\b(\d{4}-\d{2}-\d{2})\b")
_US_DATE_RE = re.compile(r"\b(\d{1,2}/\d{1,2}/\d{2,4})\b")
_MONTH_DATE_RE = re.compile(
    r"\b((?:January|February|March|April|May|June|July|August|September|"
    r"October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)"
    r"\.?\s+\d{1,2},?\s+\d{4})\b",
    re.IGNORECASE,
)
_DATE_RES: tuple[re.Pattern, ...] = (_ISO_DATE_RE, _US_DATE_RE, _MONTH_DATE_RE)
_DEADLINE_CONTEXT_RE = re.compile(
    r"(?:respond(?:\s+by)?|due(?:\s+by)?|deadline|no later than|before)",
    re.IGNORECASE,
)

_DATE_FORMATS: tuple[str, ...] = (
    "%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y",
    "%B %d, %Y", "%b %d, %Y", "%B %d %Y", "%b %d %Y",
)


def _normalize_date(raw: str) -> str:
    """Best-effort ISO normalization; falls back to the raw matched text
    when the format isn't one of the common ones we try."""
    cleaned = raw.strip()
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(cleaned, fmt).date().isoformat()
        except ValueError:
            continue
    return cleaned


def _find_first_date(text: str) -> Optional[str]:
    for pattern in _DATE_RES:
        m = pattern.search(text)
        if m:
            return _normalize_date(m.group(1))
    return None


def _extract_response_deadline(text: str) -> Optional[str]:
    """Prefer a date near deadline-context language ("respond by", "due by",
    "no later than", ...); otherwise fall back to the first date anywhere in
    the text — better a best guess than a silently missing deadline."""
    ctx = _DEADLINE_CONTEXT_RE.search(text)
    if ctx:
        window = text[ctx.end(): ctx.end() + 60]
        near = _find_first_date(window)
        if near:
            return near
    return _find_first_date(text)


def _extract_citation_number(text: str) -> Optional[str]:
    """Scan the text after each citation-keyword occurrence for the nearest
    alnum/dash token that actually contains a digit — plain words like
    "Notice" that happen to follow "Citation" are never real citation
    numbers, so they're skipped rather than captured."""
    for kw_match in _CITATION_KEYWORD_RE.finditer(text):
        window = text[kw_match.end(): kw_match.end() + _CITATION_NUMBER_WINDOW]
        for tok_match in _TOKEN_RE.finditer(window):
            token = tok_match.group(1)
            if any(c.isdigit() for c in token):
                return token
    return None


def _extract_citation_fields(subject: str, body: str) -> dict[str, Any]:
    text = f"{subject}\n{body}"
    extracted: dict[str, Any] = {}

    citation_number = _extract_citation_number(text)
    if citation_number:
        extracted["citation_number"] = citation_number

    m = _FINE_AMOUNT_RE.search(text)
    if m:
        try:
            extracted["fine_amount"] = float(m.group(1).replace(",", ""))
        except ValueError:
            pass

    deadline = _extract_response_deadline(text)
    if deadline:
        extracted["response_deadline"] = deadline

    return extracted


def classify_mail(subject: str, body: str, sender: str = "") -> dict:
    """Pure classifier — no I/O. Scores each ticket_type by counting distinct
    keyword/sender signals it matches; confidence is the winning category's
    share of all matched signal (0..1). Zero signal on nonempty text falls to
    "general_correspondence"; zero signal on empty text falls to "unknown"."""
    subject = subject or ""
    body = body or ""
    sender = sender or ""
    haystack = f"{subject}\n{body}".lower()
    sender_haystack = sender.lower()

    scores: dict[str, int] = {}
    for ticket_type, keywords in TEXT_SIGNALS.items():
        hits = sum(1 for kw in keywords if kw in haystack)
        hits += sum(1 for kw in SENDER_SIGNALS.get(ticket_type, ()) if kw in sender_haystack)
        if hits:
            scores[ticket_type] = hits

    total_hits = sum(scores.values())
    if total_hits == 0:
        ticket_type = "unknown" if not haystack.strip() else "general_correspondence"
        return {"ticket_type": ticket_type, "confidence": 0.0, "extracted": {}}

    # First max in TEXT_SIGNALS insertion order wins ties (citation-first priority).
    winner = max(scores, key=lambda k: scores[k])
    confidence = round(scores[winner] / total_hits, 4)

    extracted: dict[str, Any] = {}
    if winner == "citation":
        extracted = _extract_citation_fields(subject, body)

    return {"ticket_type": winner, "confidence": confidence, "extracted": extracted}


def _build_citation_draft(
    *,
    firm_id: str,
    matter_id: Optional[str],
    extracted: dict[str, Any],
    subject: str,
    from_addr: str,
    confidence: float,
    new_id: Callable,
    now_iso: Callable,
) -> dict:
    """Same shape as the citation document created by POST /citations in
    citations.py (id, firm_id, matter_id, citation_number, issuing_agency,
    court, violation_desc, issue_date, response_deadline, fine_amount,
    jurisdiction, state="detected", confidence, offers=[], created_at,
    updated_at). Built here directly rather than imported, per the
    file-isolation rule for this module."""
    ts = now_iso()
    return {
        "id": new_id(),
        "firm_id": firm_id,
        "matter_id": matter_id,
        "citation_number": extracted.get("citation_number") or "UNKNOWN",
        "issuing_agency": extracted.get("issuing_agency") or from_addr or "Unknown (mail intake)",
        "court": extracted.get("court"),
        "violation_desc": (subject or "")[:500] or None,
        "issue_date": extracted.get("issue_date"),
        "response_deadline": extracted.get("response_deadline"),
        "fine_amount": extracted.get("fine_amount"),
        "jurisdiction": extracted.get("jurisdiction"),
        "state": "detected",
        "confidence": confidence,
        "offers": [],
        "created_at": ts,
        "updated_at": ts,
    }


class MailIngestIn(BaseModel):
    from_addr: Optional[str] = None
    subject: str
    body: str
    matter_id: Optional[str] = None


class MailRouteIn(BaseModel):
    ticket_type: str
    matter_id: Optional[str] = None


def register_mail_adapter_routes(api, db, get_current_user, require_permission, new_id, now_iso, log_audit):
    read_guard = require_permission("matters.read", get_current_user)
    write_guard = require_permission("matters.write", get_current_user)

    @api.post("/mail/ingest")
    async def ingest_mail(body: MailIngestIn, user=Depends(write_guard)):
        result = classify_mail(body.subject, body.body, body.from_addr or "")
        ticket_type = result["ticket_type"]
        confidence = result["confidence"]
        extracted = result["extracted"]

        item = {
            "id": new_id(),
            "firm_id": user["firm_id"],
            "from_addr": body.from_addr,
            "subject": body.subject,
            "body": body.body,
            "matter_id": body.matter_id,
            "ticket_type": ticket_type,
            "confidence": confidence,
            "extracted": extracted,
            "status": "ingested",
            "routed_to": None,
            "created_at": now_iso(),
        }
        await db.mail_items.insert_one(item)
        item_id = item["id"]

        exceptions_raised: list[dict] = []
        routed_to: Optional[str] = None

        if ticket_type == "citation" and confidence >= LOW_CONFIDENCE_THRESHOLD:
            citation = _build_citation_draft(
                firm_id=user["firm_id"],
                matter_id=body.matter_id,
                extracted=extracted,
                subject=body.subject,
                from_addr=body.from_addr or "",
                confidence=confidence,
                new_id=new_id,
                now_iso=now_iso,
            )
            await db.citations.insert_one(citation)
            routed_to = f"citation:{citation['id']}"
            await db.mail_items.update_one(
                {"id": item_id},
                {"$set": {"routed_to": routed_to, "status": "routed"}},
            )
        elif confidence < LOW_CONFIDENCE_THRESHOLD:
            exc = await raise_exception(
                db,
                firm_id=user["firm_id"],
                kind="extraction_low_confidence",
                source="mail_adapter",
                title=f"Classify mail: {body.subject[:60]}",
                detail={
                    "mail_item_id": item_id,
                    "ticket_type": ticket_type,
                    "confidence": confidence,
                    "from_addr": body.from_addr,
                },
                matter_id=body.matter_id,
                new_id=new_id,
                now_iso=now_iso,
            )
            exceptions_raised.append(exc)

        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user.get("name", ""),
            action="mail.ingest",
            resource_type="mail_item",
            resource_id=item_id,
            detail={"ticket_type": ticket_type, "confidence": confidence, "routed_to": routed_to},
            new_id=new_id,
            now_iso=now_iso,
        )

        return {
            "ticket_type": ticket_type,
            "confidence": confidence,
            "routed_to": routed_to,
            "exceptions_raised": exceptions_raised,
        }

    @api.get("/mail/items")
    async def list_mail_items(status: Optional[str] = None, user=Depends(read_guard)):
        q: dict[str, Any] = {"firm_id": user["firm_id"]}
        if status:
            q["status"] = status
        cursor = db.mail_items.find(q, {"_id": 0}).sort("created_at", -1)
        return {"items": [d async for d in cursor]}

    @api.post("/mail/items/{item_id}/route")
    async def route_mail_item(item_id: str, body: MailRouteIn, user=Depends(write_guard)):
        item = await db.mail_items.find_one({"id": item_id, "firm_id": user["firm_id"]}, {"_id": 0})
        if not item:
            raise HTTPException(404, "Mail item not found")
        if body.ticket_type not in TICKET_TYPES:
            raise HTTPException(400, f"ticket_type must be one of {TICKET_TYPES}")

        matter_id = body.matter_id if body.matter_id is not None else item.get("matter_id")
        routed_to: Optional[str] = None
        status = "reclassified"

        if body.ticket_type == "citation":
            citation = _build_citation_draft(
                firm_id=user["firm_id"],
                matter_id=matter_id,
                extracted=item.get("extracted") or {},
                subject=item.get("subject") or "",
                from_addr=item.get("from_addr") or "",
                # A human just confirmed this classification manually.
                confidence=1.0,
                new_id=new_id,
                now_iso=now_iso,
            )
            await db.citations.insert_one(citation)
            routed_to = f"citation:{citation['id']}"
            status = "routed"

        await db.mail_items.update_one(
            {"id": item_id},
            {"$set": {
                "ticket_type": body.ticket_type,
                "matter_id": matter_id,
                "routed_to": routed_to,
                "status": status,
            }},
        )

        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user.get("name", ""),
            action="mail_item.route",
            resource_type="mail_item",
            resource_id=item_id,
            detail={"ticket_type": body.ticket_type, "routed_to": routed_to},
            new_id=new_id,
            now_iso=now_iso,
        )

        return await db.mail_items.find_one({"id": item_id}, {"_id": 0})
