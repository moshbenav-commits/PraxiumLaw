"""Unit tests for outgoing webhook signing (no Mongo)."""
from outgoing_webhooks import _sign_payload, SUPPORTED_EVENTS


def test_sign_payload_deterministic():
    body = b'{"id":"evt_1","type":"matter.created"}'
    a = _sign_payload("whsec_test", body)
    b = _sign_payload("whsec_test", body)
    assert a == b
    assert len(a) == 64


def test_supported_events_catalog():
    assert "matter.created" in SUPPORTED_EVENTS
    assert "signature.completed" in SUPPORTED_EVENTS
