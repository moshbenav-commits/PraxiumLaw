"""
Self-test / regression suite for the inbound webhook RECEIVER's crypto and
dedupe logic (webhook_security.py), backing the "Ricardo: webhook receiver
smoke (HTTPS endpoint + HMAC verify)" gate — docs/creytix/projects/pipelines/
praxiumlaw.PIPELINE.md, Stage 2.

The actual HTTPS receiver route is `POST /api/mail/webhook/{provider}` in
mail_provider.py, which delegates signature verification and idempotency-key
computation to this (deliberately dependency-free) module. This file only
imports `webhook_security` — no FastAPI, no Mongo, no pytest requirement — so
it proves the receiver's core logic is correct with a TEST secret, with
nothing beyond the Python standard library:

    python3 backend/tests/test_webhook_security.py

It is also pytest-discoverable (`pytest backend/tests/test_webhook_security.py`)
if pytest happens to be installed, since every check is a plain `test_*`
function using `assert` — but nothing here requires pytest to run.

What this DOES prove: a correctly-signed payload is accepted, a tampered one
is rejected (401 at the route level), and repeat deliveries of the same event
dedupe to the same idempotency key. What this does NOT (and cannot) prove:
that the real deployed HTTPS endpoint is reachable over TLS from the public
internet with the REAL production secret — that is Ricardo's one remaining
live smoke test (see docs/BACKEND_API.md, "Inbound webhook receiver").
"""
from __future__ import annotations

import hashlib
import hmac
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # backend/ on sys.path

from webhook_security import (  # noqa: E402
    EVENT_ID_HEADER,
    GENERIC_SIGNATURE_HEADER,
    GENERIC_WEBHOOK_KEY_ENV,
    compute_idempotency_key,
    verify_generic,
)

# Self-test only — never a real secret, never committed to a real deploy env.
TEST_SECRET = "test-secret-do-not-use-in-prod"


def _sign(body: bytes, secret: str = TEST_SECRET) -> str:
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


def _with_test_key(fn):
    """Run `fn()` with GENERIC_WEBHOOK_KEY set to the test secret, always
    cleaning up the env var afterward (even on assertion failure)."""
    os.environ[GENERIC_WEBHOOK_KEY_ENV] = TEST_SECRET
    try:
        fn()
    finally:
        os.environ.pop(GENERIC_WEBHOOK_KEY_ENV, None)


def test_correctly_signed_payload_is_accepted():
    def _run():
        body = b'{"from_addr":"client@example.com","subject":"Re: Citation","body":"See attached"}'
        sig = _sign(body)
        assert verify_generic({GENERIC_SIGNATURE_HEADER: sig}, body) is True

    _with_test_key(_run)


def test_tampered_payload_under_original_signature_is_rejected():
    """The real tamper scenario: sign the ORIGINAL body, then present a
    modified body under that same (now-stale) signature — not just a
    garbage/wrong signature string over an unchanged body."""
    def _run():
        original = b'{"from_addr":"client@example.com","subject":"Re: Citation","body":"See attached"}'
        sig = _sign(original)
        tampered = original.replace(b"client@example.com", b"attacker@evil.com")
        assert verify_generic({GENERIC_SIGNATURE_HEADER: sig}, tampered) is False

    _with_test_key(_run)


def test_wrong_signature_over_unchanged_body_is_rejected():
    def _run():
        body = b'{"hello":"world"}'
        assert verify_generic({GENERIC_SIGNATURE_HEADER: "0" * 64}, body) is False

    _with_test_key(_run)


def test_missing_signature_header_is_rejected_when_key_configured():
    def _run():
        assert verify_generic({}, b"anything") is False

    _with_test_key(_run)


def test_no_key_configured_fails_open_in_dev_by_design():
    # Documented dev convenience (ALLOW_UNVERIFIED_WHEN_NO_KEY=True default).
    # PRODUCTION MUST SET GENERIC_WEBHOOK_KEY — see webhook_security.py
    # module docstring and docs/BACKEND_API.md.
    os.environ.pop(GENERIC_WEBHOOK_KEY_ENV, None)
    assert verify_generic({}, b"anything") is True


def test_idempotency_key_is_stable_for_identical_redelivery():
    raw = b'{"from_addr":"a@b.com","subject":"s","body":"b"}'
    k1 = compute_idempotency_key("generic", "firm_1", {}, raw)
    k2 = compute_idempotency_key("generic", "firm_1", {}, raw)
    assert k1 == k2


def test_idempotency_key_scoped_by_firm_and_body():
    raw_a = b'{"body":"a"}'
    raw_b = b'{"body":"b"}'
    assert compute_idempotency_key("generic", "firm_1", {}, raw_a) != compute_idempotency_key(
        "generic", "firm_2", {}, raw_a
    )
    assert compute_idempotency_key("generic", "firm_1", {}, raw_a) != compute_idempotency_key(
        "generic", "firm_1", {}, raw_b
    )


def test_idempotency_key_prefers_explicit_event_id_over_body_hash():
    # A provider that resends the same logical event under a reformatted body
    # (still carrying the same X-Webhook-Event-Id) must dedupe to one key.
    raw1 = b'{"a":1}'
    raw2 = b'{"a":2}'
    headers = {EVENT_ID_HEADER: "evt_123"}
    assert compute_idempotency_key("generic", "firm_1", headers, raw1) == compute_idempotency_key(
        "generic", "firm_1", headers, raw2
    )


ALL_TESTS = [
    test_correctly_signed_payload_is_accepted,
    test_tampered_payload_under_original_signature_is_rejected,
    test_wrong_signature_over_unchanged_body_is_rejected,
    test_missing_signature_header_is_rejected_when_key_configured,
    test_no_key_configured_fails_open_in_dev_by_design,
    test_idempotency_key_is_stable_for_identical_redelivery,
    test_idempotency_key_scoped_by_firm_and_body,
    test_idempotency_key_prefers_explicit_event_id_over_body_hash,
]


def main() -> int:
    failures = 0
    for t in ALL_TESTS:
        try:
            t()
            print(f"[ok] {t.__name__}")
        except AssertionError:
            failures += 1
            print(f"[FAIL] {t.__name__}")
    print(f"\n{'ALL PASSED' if failures == 0 else f'{failures} FAILURE(S)'} ({len(ALL_TESTS)} tests)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
