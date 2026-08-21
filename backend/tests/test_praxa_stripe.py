"""
Unit tests for praxa_stripe (stdlib only — no live Stripe calls).

    python3 backend/tests/test_praxa_stripe.py
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from praxa_stripe import checkout_enabled, verify_and_parse_webhook  # noqa: E402

TEST_WEBHOOK_SECRET = "whsec_test_do_not_use_in_prod"


def test_checkout_disabled_by_default() -> None:
    os.environ.pop("PRAXA_CHECKOUT_ENABLED", None)
    assert checkout_enabled() is False


def test_checkout_enabled_when_flag_set() -> None:
    os.environ["PRAXA_CHECKOUT_ENABLED"] = "1"
    try:
        assert checkout_enabled() is True
    finally:
        os.environ.pop("PRAXA_CHECKOUT_ENABLED", None)


def test_webhook_rejects_bad_signature() -> None:
    payload = json.dumps({"id": "evt_test", "type": "checkout.session.completed"}).encode()
    ts = str(int(time.time()))
    os.environ["STRIPE_WEBHOOK_SECRET"] = TEST_WEBHOOK_SECRET
    try:
        sig = f"t={ts},v1=deadbeef"
        try:
            verify_and_parse_webhook(payload, sig)
            raise AssertionError("expected ValueError for bad signature")
        except ValueError as e:
            assert "signature" in str(e).lower()
    finally:
        os.environ.pop("STRIPE_WEBHOOK_SECRET", None)


def test_webhook_accepts_valid_signature() -> None:
    payload = json.dumps({"id": "evt_ok", "type": "ping"}).encode()
    ts = str(int(time.time()))
    signed = f"{ts}.{payload.decode()}"
    v1 = hmac.new(TEST_WEBHOOK_SECRET.encode(), signed.encode(), hashlib.sha256).hexdigest()
    header = f"t={ts},v1={v1}"
    os.environ["STRIPE_WEBHOOK_SECRET"] = TEST_WEBHOOK_SECRET
    try:
        event = verify_and_parse_webhook(payload, header)
        assert event["id"] == "evt_ok"
    finally:
        os.environ.pop("STRIPE_WEBHOOK_SECRET", None)


def main() -> None:
    test_checkout_disabled_by_default()
    test_checkout_enabled_when_flag_set()
    test_webhook_rejects_bad_signature()
    test_webhook_accepts_valid_signature()
    print("test_praxa_stripe: all passed")


if __name__ == "__main__":
    main()
