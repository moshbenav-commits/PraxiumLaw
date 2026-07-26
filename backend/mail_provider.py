"""
Praxium Suite — inbound-email provider adapters (mail_provider.py).

mail_adapters.py owns classification + routing for mail that already made it
into the app as `{from_addr, subject, body}`. This module is the piece in
front of it: real inbound-email providers (SendGrid Inbound Parse, Mailgun
Routes, or a generic/custom relay) POST their own payload shapes to a
webhook, and something has to normalize those into the common shape before
`classify_mail` ever sees them.

Kept file-isolated like mail_adapters.py: the normalizers are pure functions
with no I/O, and the webhook route reuses `classify_mail` and reproduces the
same `db.mail_items` / `db.citations` document shapes that
`register_mail_adapter_routes` writes, rather than importing private helpers
from that module. That keeps provider-specific payload quirks out of the
classifier and keeps this module swappable per provider without touching
mail_adapters.py.

Inbound webhooks are unauthenticated by the provider (there's no logged-in
Praxium user on the other end — it's SendGrid/Mailgun's servers), so this
route does NOT use get_current_user. Instead the caller must supply a
`firm_id` (query param or header) that attributes the mail to a tenant. In
production this must be paired with provider signature verification (see
`_verify_signature` below) so a `firm_id` can't be spoofed by an arbitrary
POST — that verification is stubbed here and clearly marked TODO.
"""
from __future__ import annotations

from typing import Any, Callable, Optional

from fastapi import Body, Header, HTTPException
from starlette.requests import Request
from webhook_security import compute_idempotency_key, verify_signature

from exceptions_queue import raise_exception
from mail_adapters import LOW_CONFIDENCE_THRESHOLD, classify_mail

SUPPORTED_PROVIDERS: tuple[str, ...] = ("sendgrid", "mailgun", "generic")


def _first_nonempty(*values: Any) -> str:
    for v in values:
        if v:
            return str(v)
    return ""


def normalize_sendgrid(payload: dict) -> dict[str, str]:
    """SendGrid Inbound Parse posts (as multipart form fields, but we accept
    the equivalent dict here) `from`, `subject`, and `text` (with `html` as
    a fallback body)."""
    payload = payload or {}
    return {
        "from_addr": _first_nonempty(payload.get("from"), payload.get("envelope_from")),
        "subject": _first_nonempty(payload.get("subject")),
        "body": _first_nonempty(payload.get("text"), payload.get("html")),
    }


def normalize_mailgun(payload: dict) -> dict[str, str]:
    """Mailgun Routes posts `sender`, `subject`, and `body-plain` (with
    `body-html` as a fallback body)."""
    payload = payload or {}
    return {
        "from_addr": _first_nonempty(payload.get("sender"), payload.get("From")),
        "subject": _first_nonempty(payload.get("subject"), payload.get("Subject")),
        "body": _first_nonempty(payload.get("body-plain"), payload.get("body-html")),
    }


def normalize_generic(payload: dict) -> dict[str, str]:
    """Fallback shape for a custom/manual relay: accepts either
    `from_addr`/`subject`/`body` or `from`/`subject`/`text`."""
    payload = payload or {}
    return {
        "from_addr": _first_nonempty(payload.get("from_addr"), payload.get("from")),
        "subject": _first_nonempty(payload.get("subject")),
        "body": _first_nonempty(payload.get("body"), payload.get("text")),
    }


_NORMALIZERS: dict[str, Callable[[dict], dict[str, str]]] = {
    "sendgrid": normalize_sendgrid,
    "mailgun": normalize_mailgun,
    "generic": normalize_generic,
}


def normalize(provider: str, payload: dict) -> dict[str, str]:
    """Dispatch to the provider-specific normalizer; unknown providers fall
    back to `normalize_generic` rather than failing the webhook outright."""
    fn = _NORMALIZERS.get((provider or "").lower(), normalize_generic)
    return fn(payload)


def _verify_signature(provider: str, headers: Any, raw: Any) -> bool:
    """TODO(security): verify the provider's inbound-webhook signature before
    trusting the payload.

    - SendGrid Inbound Parse: verify the `X-Twilio-Email-Event-Webhook-*`
      signature headers (Ed25519) when signed event webhooks are enabled, or
      lock the endpoint down at the network layer if using plain Inbound
      Parse (which has no built-in signing).
    - Mailgun: verify `signature`/`token`/`timestamp` via HMAC-SHA256 against
      the Mailgun signing key (see Mailgun's "Securing Webhooks" docs).

    Delegates to webhook_security.verify_signature: fail-open in dev when no
    signing-key env var is set, strict/fail-closed once a key is configured.

    `raw` MUST be the exact raw request body bytes for sendgrid/generic (their
    HMAC is computed over the literal bytes the sender signed — FastAPI's
    re-parsed `dict` is NOT byte-identical to that, so passing the dict here
    would make every real signature fail to verify). Mailgun is the one
    exception: its signature fields (`timestamp`/`token`/`signature`) travel
    IN the parsed payload rather than over the whole body, so callers pass the
    dict for that provider instead — see `mail_provider_webhook` below, which
    picks the right one per provider.
    """
    return verify_signature(provider, headers, raw)


def register_mail_provider_routes(api, db, get_current_user, require_permission, new_id, now_iso, log_audit):
    @api.post("/mail/webhook/{provider}")
    async def mail_provider_webhook(
        provider: str,
        request: Request,
        body: dict = Body(...),
        firm_id: Optional[str] = None,
        x_firm_id: Optional[str] = Header(default=None, alias="X-Firm-Id"),
    ):
        """Inbound-parse webhook for a mail provider (`sendgrid`, `mailgun`,
        or `generic`). Unauthenticated by design (the caller is the
        provider's servers, not a logged-in user) — the tenant is instead
        supplied explicitly via `firm_id` (query param) or the `X-Firm-Id`
        header, and `_verify_signature` is the seam where provider-signature
        verification belongs before this is trusted in production.

        Idempotent: a retried delivery (provider timeout/5xx/at-least-once
        redelivery) of an already-processed event returns the SAME response
        (marked `duplicate: true`) instead of creating a second `mail_items`
        row / a second `citations` row — see `webhook_receipts` below."""
        resolved_firm_id = firm_id or x_firm_id
        if not resolved_firm_id:
            raise HTTPException(400, "firm_id is required (query param or X-Firm-Id header)")

        raw_body = await request.body()
        # Mailgun's signature covers {timestamp, token} INSIDE the parsed
        # payload, not the raw bytes, so its verifier needs the dict.
        # sendgrid/generic sign the literal raw bytes — passing the
        # FastAPI-reparsed dict there would never match a real signature.
        signature_source: Any = body if provider.lower() == "mailgun" else raw_body
        if not _verify_signature(provider, request.headers, signature_source):
            raise HTTPException(401, "Signature verification failed")

        idem_key = compute_idempotency_key(provider, resolved_firm_id, request.headers, signature_source)
        existing = await db.webhook_receipts.find_one({"key": idem_key}, {"_id": 0})
        if existing:
            return {**existing["response"], "duplicate": True}

        normalized = normalize(provider, body)
        from_addr = normalized["from_addr"]
        subject = normalized["subject"]
        mail_body = normalized["body"]

        result = classify_mail(subject, mail_body, sender=from_addr)
        ticket_type = result["ticket_type"]
        confidence = result["confidence"]
        extracted = result["extracted"]

        item = {
            "id": new_id(),
            "firm_id": resolved_firm_id,
            "from_addr": from_addr or None,
            "subject": subject,
            "body": mail_body,
            "matter_id": None,
            "ticket_type": ticket_type,
            "confidence": confidence,
            "extracted": extracted,
            "status": "ingested",
            "routed_to": None,
            "created_at": now_iso(),
        }
        await db.mail_items.insert_one(item)
        item_id = item["id"]

        routed_to: Optional[str] = None

        if ticket_type == "citation" and confidence >= LOW_CONFIDENCE_THRESHOLD:
            ts = now_iso()
            citation = {
                "id": new_id(),
                "firm_id": resolved_firm_id,
                "matter_id": None,
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
            await db.citations.insert_one(citation)
            routed_to = f"citation:{citation['id']}"
            await db.mail_items.update_one(
                {"id": item_id},
                {"$set": {"routed_to": routed_to, "status": "routed"}},
            )
        elif confidence < LOW_CONFIDENCE_THRESHOLD:
            await raise_exception(
                db,
                firm_id=resolved_firm_id,
                kind="extraction_low_confidence",
                source="mail_provider",
                title=f"Classify inbound mail ({provider}): {subject[:60]}",
                detail={
                    "mail_item_id": item_id,
                    "provider": provider,
                    "ticket_type": ticket_type,
                    "confidence": confidence,
                    "from_addr": from_addr,
                },
                matter_id=None,
                new_id=new_id,
                now_iso=now_iso,
            )

        await log_audit(
            db,
            firm_id=resolved_firm_id,
            actor_id="webhook:" + provider,
            actor_name=f"mail_provider:{provider}",
            action="mail.webhook_ingest",
            resource_type="mail_item",
            resource_id=item_id,
            detail={"provider": provider, "ticket_type": ticket_type, "confidence": confidence, "routed_to": routed_to},
            new_id=new_id,
            now_iso=now_iso,
        )

        response = {
            "provider": provider,
            "ticket_type": ticket_type,
            "confidence": confidence,
            "routed_to": routed_to,
        }
        await db.webhook_receipts.insert_one({
            "id": new_id(),
            "key": idem_key,
            "firm_id": resolved_firm_id,
            "provider": provider,
            "mail_item_id": item_id,
            "response": response,
            "created_at": now_iso(),
        })
        return response
