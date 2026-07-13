"""
Praxium Suite — inbound mail-provider webhook signature verification
(webhook_security.py).

Pure, side-effect-free verification helpers for the `_verify_signature`
seam in `mail_provider.py` (see that module's docstring — it explicitly
marks this as a stubbed TODO(security) today). This module intentionally
has NO FastAPI import, NO routes, and NO I/O beyond reading env vars and
the caller-supplied headers/payload: `mail_provider.py` is expected to
import `verify_signature` (or the per-provider functions) and call it from
inside `_verify_signature`.

Call site (once wired up in mail_provider.py):

    from webhook_security import verify_signature
    ok = verify_signature(provider, headers, raw_body)

--------------------------------------------------------------------------
FAIL-OPEN vs FAIL-CLOSED (read this before deploying)
--------------------------------------------------------------------------
`ALLOW_UNVERIFIED_WHEN_NO_KEY` (below) controls what happens when the
provider's signing-key env var is NOT set:

  * True  (current default) -> verification is SKIPPED and the function
    returns True. This lets local/dev/staging environments accept inbound
    mail webhooks without provisioning provider secrets first.
  * False -> verification is REQUIRED; with no key configured, every
    webhook is rejected (fail-closed).

    ****************************************************************
    * PRODUCTION MUST SET THE PROVIDER SIGNING-KEY ENV VARS BELOW.  *
    * Once a key IS set for a given provider, that provider's check *
    * becomes strict/fail-closed regardless of this flag — a wrong  *
    * or missing signature is rejected. This flag only affects the  *
    * no-key-configured case.                                      *
    ****************************************************************

Flip `ALLOW_UNVERIFIED_WHEN_NO_KEY = False` (or override per-deploy) once
all environments that receive real inbound mail have keys provisioned, so
a misconfigured/keyless deploy can't silently accept unsigned webhooks.
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import os
import time
from typing import Any, Optional

logger = logging.getLogger("praxium.webhook_security")

# See module docstring above. Explicit, module-level, easy to flip.
ALLOW_UNVERIFIED_WHEN_NO_KEY = True

# Reject Mailgun signatures whose `timestamp` is older than this many
# seconds, to prevent replay of a captured (timestamp, token, signature)
# triple. Mailgun's own guidance is "a few minutes"; 15 min gives slack
# for clock drift without materially widening the replay window.
MAILGUN_MAX_TIMESTAMP_AGE_SECONDS = 15 * 60

MAILGUN_SIGNING_KEY_ENV = "MAILGUN_SIGNING_KEY"
SENDGRID_WEBHOOK_KEY_ENV = "SENDGRID_WEBHOOK_KEY"
GENERIC_WEBHOOK_KEY_ENV = "GENERIC_WEBHOOK_KEY"

SENDGRID_SIGNATURE_HEADER = "X-Twilio-Email-Event-Webhook-Signature"
GENERIC_SIGNATURE_HEADER = "X-Webhook-Signature"


def _to_bytes(raw: Any) -> bytes:
    """Normalize a raw request body (bytes, str, or None) to bytes for HMAC."""
    if raw is None:
        return b""
    if isinstance(raw, bytes):
        return raw
    if isinstance(raw, str):
        return raw.encode("utf-8")
    # Defensive fallback (e.g. someone passes a dict) — stable repr so the
    # function doesn't raise, though callers should pass the true raw body.
    return str(raw).encode("utf-8")


def _get_header(headers: Any, name: str) -> Optional[str]:
    """Case-insensitive header lookup that works for plain dicts as well as
    header-mapping objects (e.g. Starlette's `Request.headers`), both of
    which support `.get`."""
    if headers is None:
        return None
    # Try exact key first (cheap, common case for plain dicts).
    value = headers.get(name)
    if value is not None:
        return value
    lname = name.lower()
    try:
        items = headers.items()
    except AttributeError:
        return None
    for k, v in items:
        if str(k).lower() == lname:
            return v
    return None


def verify_mailgun(payload_or_headers: dict) -> bool:
    """Verify a Mailgun inbound-route/webhook signature.

    Mailgun signs `timestamp + token` with HMAC-SHA256 using the account's
    Mailgun signing key (Settings > API Keys > "Webhook signing key" in the
    Mailgun dashboard; NOT the general API key). Mailgun includes the
    fields `timestamp`, `token`, and `signature` directly in the payload
    (as POST fields for Routes, or under `signature: {...}` for the newer
    Events webhook — pass whichever dict contains those three keys).

    https://documentation.mailgun.com/en/latest/user_manual.html#webhooks
    ("Securing Webhooks")

    Returns True (see ALLOW_UNVERIFIED_WHEN_NO_KEY) if MAILGUN_SIGNING_KEY
    is unset. When it IS set, verification is strict: missing fields, a
    stale timestamp, or a mismatched signature all return False.
    """
    payload_or_headers = payload_or_headers or {}

    signing_key = os.environ.get(MAILGUN_SIGNING_KEY_ENV)
    if not signing_key:
        if ALLOW_UNVERIFIED_WHEN_NO_KEY:
            logger.warning(
                "webhook_security: %s is not set — skipping Mailgun signature "
                "verification (ALLOW_UNVERIFIED_WHEN_NO_KEY=True). "
                "PRODUCTION MUST SET THIS ENV VAR.",
                MAILGUN_SIGNING_KEY_ENV,
            )
            return True
        logger.error(
            "webhook_security: %s is not set — rejecting Mailgun webhook "
            "(ALLOW_UNVERIFIED_WHEN_NO_KEY=False, fail-closed).",
            MAILGUN_SIGNING_KEY_ENV,
        )
        return False

    # Support both the flat Routes shape and a nested `signature` sub-dict.
    sig_block = payload_or_headers.get("signature")
    source = sig_block if isinstance(sig_block, dict) else payload_or_headers

    timestamp = source.get("timestamp")
    token = source.get("token")
    signature = source.get("signature")

    if not timestamp or not token or not signature:
        logger.warning("webhook_security: Mailgun payload missing timestamp/token/signature.")
        return False

    try:
        timestamp_int = int(timestamp)
    except (TypeError, ValueError):
        logger.warning("webhook_security: Mailgun timestamp %r is not an integer.", timestamp)
        return False

    age = time.time() - timestamp_int
    if age > MAILGUN_MAX_TIMESTAMP_AGE_SECONDS or age < -60:
        # Small negative allowance for clock skew; large negative or large
        # positive age both indicate a replayed/expired request.
        logger.warning(
            "webhook_security: Mailgun timestamp %s outside allowed window (age=%.0fs).",
            timestamp, age,
        )
        return False

    expected = hmac.new(
        key=signing_key.encode("utf-8"),
        msg=f"{timestamp}{token}".encode("utf-8"),
        digestmod=hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(expected, str(signature))


def verify_sendgrid(headers: dict, raw: Any) -> bool:
    """Verify a SendGrid webhook signature.

    IMPORTANT CAVEAT: SendGrid's *Inbound Parse* endpoint (the one that
    actually delivers inbound mail — what `normalize_sendgrid` in
    mail_provider.py targets) has NO built-in request signing. SendGrid's
    signed-webhook feature (ECDSA over the Event Webhook public/private
    keypair, verified with the `X-Twilio-Email-Event-Webhook-Signature` /
    `...-Timestamp` headers) applies to the *Event Webhook* (delivery/open/
    click events), not Inbound Parse. For Inbound Parse in production,
    SendGrid's own guidance is to protect the endpoint with a secret,
    hard-to-guess URL path and/or HTTP Basic Auth at the edge — this
    function does NOT implement ECDSA verification (that needs the
    `cryptography` package, which is out of scope for this stdlib-only
    module) and should not be assumed to cover Inbound Parse.

    As a documented, best-effort fallback for deployments that put a
    shared-secret HMAC in front of SendGrid (e.g. a proxy/relay that
    re-signs before forwarding, or a custom header added at the edge),
    this checks `X-Twilio-Email-Event-Webhook-Signature` as an HMAC-SHA256
    over the raw body against SENDGRID_WEBHOOK_KEY. This is NOT SendGrid's
    native scheme — confirm the exact scheme in use (Event Webhook ECDSA
    vs. Inbound Parse secret-URL vs. a custom edge proxy HMAC) before
    relying on this in production, and swap in real ECDSA verification via
    `cryptography.hazmat` if/when the Event Webhook's signed mode is used.
    https://www.twilio.com/docs/sendgrid/for-developers/tracking-events/getting-started-event-webhook-security-features
    """
    headers = headers or {}

    signing_key = os.environ.get(SENDGRID_WEBHOOK_KEY_ENV)
    if not signing_key:
        if ALLOW_UNVERIFIED_WHEN_NO_KEY:
            logger.warning(
                "webhook_security: %s is not set — skipping SendGrid signature "
                "verification (ALLOW_UNVERIFIED_WHEN_NO_KEY=True). "
                "PRODUCTION MUST SET THIS ENV VAR (or lock the Inbound Parse "
                "endpoint down with a secret URL / basic-auth — see docstring).",
                SENDGRID_WEBHOOK_KEY_ENV,
            )
            return True
        logger.error(
            "webhook_security: %s is not set — rejecting SendGrid webhook "
            "(ALLOW_UNVERIFIED_WHEN_NO_KEY=False, fail-closed).",
            SENDGRID_WEBHOOK_KEY_ENV,
        )
        return False

    signature = _get_header(headers, SENDGRID_SIGNATURE_HEADER)
    if not signature:
        logger.warning(
            "webhook_security: SENDGRID_WEBHOOK_KEY is set but %s header is "
            "missing — rejecting.",
            SENDGRID_SIGNATURE_HEADER,
        )
        return False

    expected = hmac.new(
        key=signing_key.encode("utf-8"),
        msg=_to_bytes(raw),
        digestmod=hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(expected, str(signature))


def verify_generic(headers: dict, raw: Any) -> bool:
    """Verify a generic/custom relay webhook: HMAC-SHA256 over the raw
    request body, hex-encoded, compared against the `X-Webhook-Signature`
    header, using the shared secret in GENERIC_WEBHOOK_KEY.
    """
    headers = headers or {}

    signing_key = os.environ.get(GENERIC_WEBHOOK_KEY_ENV)
    if not signing_key:
        if ALLOW_UNVERIFIED_WHEN_NO_KEY:
            logger.warning(
                "webhook_security: %s is not set — skipping generic webhook "
                "signature verification (ALLOW_UNVERIFIED_WHEN_NO_KEY=True). "
                "PRODUCTION MUST SET THIS ENV VAR.",
                GENERIC_WEBHOOK_KEY_ENV,
            )
            return True
        logger.error(
            "webhook_security: %s is not set — rejecting generic webhook "
            "(ALLOW_UNVERIFIED_WHEN_NO_KEY=False, fail-closed).",
            GENERIC_WEBHOOK_KEY_ENV,
        )
        return False

    signature = _get_header(headers, GENERIC_SIGNATURE_HEADER)
    if not signature:
        logger.warning(
            "webhook_security: GENERIC_WEBHOOK_KEY is set but %s header is "
            "missing — rejecting.",
            GENERIC_SIGNATURE_HEADER,
        )
        return False

    expected = hmac.new(
        key=signing_key.encode("utf-8"),
        msg=_to_bytes(raw),
        digestmod=hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(expected, str(signature))


def verify_signature(provider: str, headers: Any, raw: Any) -> bool:
    """Dispatcher matching mail_provider.py's `_verify_signature(provider,
    headers, raw)` seam. `raw` may be the raw request body (bytes/str) for
    sendgrid/generic, or the parsed payload dict for mailgun (which carries
    its signature fields inline rather than signing the whole body) —
    Mailgun's fields are read out of it regardless of which `dict` mail_provider.py
    hands in as `raw`/`body`.

    Unknown providers fall back to `verify_generic`, matching `normalize()`'s
    fallback-to-generic behavior in mail_provider.py.
    """
    provider_key = (provider or "").lower()

    if provider_key == "mailgun":
        # Mailgun's signature fields live in the payload itself, not in
        # headers or a distinct raw body — accept whichever of headers/raw
        # is actually the parsed dict.
        payload = raw if isinstance(raw, dict) else headers
        return verify_mailgun(payload if isinstance(payload, dict) else {})

    if provider_key == "sendgrid":
        return verify_sendgrid(headers, raw)

    return verify_generic(headers, raw)


if __name__ == "__main__":
    # Quick self-test of the HMAC path with a known key/message. Run with:
    #   python3 backend/webhook_security.py
    import sys

    failures = 0

    def _check(label: str, condition: bool) -> None:
        global failures
        status = "ok" if condition else "FAIL"
        if not condition:
            failures += 1
        print(f"[{status}] {label}")

    # --- generic: no key set -> allowed (fail-open default) ---
    os.environ.pop(GENERIC_WEBHOOK_KEY_ENV, None)
    _check(
        "generic: no key configured -> True (dev fail-open)",
        verify_generic({}, b"hello world") is True,
    )

    # --- generic: key set, correct signature -> True ---
    os.environ[GENERIC_WEBHOOK_KEY_ENV] = "test-secret"
    body = b'{"hello":"world"}'
    expected_sig = hmac.new(b"test-secret", body, hashlib.sha256).hexdigest()
    _check(
        "generic: correct signature -> True",
        verify_generic({GENERIC_SIGNATURE_HEADER: expected_sig}, body) is True,
    )
    _check(
        "generic: case-insensitive header lookup -> True",
        verify_generic({"x-webhook-signature": expected_sig}, body) is True,
    )
    _check(
        "generic: wrong signature -> False",
        verify_generic({GENERIC_SIGNATURE_HEADER: "deadbeef"}, body) is False,
    )
    _check(
        "generic: missing header, key set -> False (fail-closed)",
        verify_generic({}, body) is False,
    )
    del os.environ[GENERIC_WEBHOOK_KEY_ENV]

    # --- sendgrid: mirrors generic mechanics via its own env var/header ---
    os.environ[SENDGRID_WEBHOOK_KEY_ENV] = "sg-secret"
    sg_body = b"raw-event-payload"
    sg_expected = hmac.new(b"sg-secret", sg_body, hashlib.sha256).hexdigest()
    _check(
        "sendgrid: correct fallback HMAC signature -> True",
        verify_sendgrid({SENDGRID_SIGNATURE_HEADER: sg_expected}, sg_body) is True,
    )
    _check(
        "sendgrid: wrong signature -> False",
        verify_sendgrid({SENDGRID_SIGNATURE_HEADER: "nope"}, sg_body) is False,
    )
    del os.environ[SENDGRID_WEBHOOK_KEY_ENV]

    # --- mailgun: fresh timestamp + correct HMAC -> True ---
    os.environ[MAILGUN_SIGNING_KEY_ENV] = "mg-secret"
    ts = str(int(time.time()))
    token = "test-token-1234567890"
    mg_expected = hmac.new(
        b"mg-secret", f"{ts}{token}".encode("utf-8"), hashlib.sha256
    ).hexdigest()
    _check(
        "mailgun: fresh timestamp + correct signature -> True",
        verify_mailgun({"timestamp": ts, "token": token, "signature": mg_expected}) is True,
    )
    _check(
        "mailgun: wrong signature -> False",
        verify_mailgun({"timestamp": ts, "token": token, "signature": "bad"}) is False,
    )
    stale_ts = str(int(time.time()) - MAILGUN_MAX_TIMESTAMP_AGE_SECONDS - 60)
    stale_expected = hmac.new(
        b"mg-secret", f"{stale_ts}{token}".encode("utf-8"), hashlib.sha256
    ).hexdigest()
    _check(
        "mailgun: stale timestamp (replay) -> False",
        verify_mailgun({"timestamp": stale_ts, "token": token, "signature": stale_expected}) is False,
    )
    del os.environ[MAILGUN_SIGNING_KEY_ENV]

    # --- dispatcher smoke test ---
    os.environ[GENERIC_WEBHOOK_KEY_ENV] = "test-secret"
    _check(
        "dispatcher: unknown provider falls back to generic",
        verify_signature("carrier-pigeon", {GENERIC_SIGNATURE_HEADER: expected_sig}, body) is True,
    )
    del os.environ[GENERIC_WEBHOOK_KEY_ENV]

    print(f"\n{'ALL PASSED' if failures == 0 else f'{failures} FAILURE(S)'}")
    sys.exit(1 if failures else 0)
