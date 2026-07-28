"""
E2E test for Q1-C2 lead-attribution intake fields.

No real MongoDB is available in this environment, so `motor.motor_asyncio.AsyncIOMotorClient`
is monkeypatched to `mongomock_motor.AsyncMongoMockClient` BEFORE `server` is imported —
server.py builds its Mongo client at module import time (`mongo_client = AsyncIOMotorClient(...)`),
so the patch has to be in place first.
"""
import asyncio
import os
import sys
import time
from pathlib import Path
from unittest.mock import patch

import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# server.py reads these via os.environ[...] (mandatory) at import time.
os.environ.setdefault("MONGO_URL", "mongodb://127.0.0.1:27017")
os.environ.setdefault("DB_NAME", "praxium_test")
os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")
os.environ.setdefault("PRAXIUM_FRONTEND_URL", "http://localhost:3000")
# No Resend key configured on purpose — notify should degrade to log-only behavior.
os.environ.pop("RESEND_API_KEY", None)
os.environ.pop("PRAXIUM_LEAD_NOTIFY_EMAIL", None)
os.environ.pop("LEAD_NOTIFY_EMAIL", None)

from mongomock_motor import AsyncMongoMockClient  # noqa: E402

# server may already be imported by another test module in the same session — drop it so the
# patched Mongo client is the one that gets wired up when we (re)import it here.
sys.modules.pop("server", None)

with patch("motor.motor_asyncio.AsyncIOMotorClient", AsyncMongoMockClient):
    import server  # noqa: E402

from fastapi.testclient import TestClient  # noqa: E402

# Seed the provider-secret sync cache so email_util's lazy pymongo refresh doesn't waste time
# trying (and failing after a 3s timeout) to reach a real Mongo at MONGO_URL during tests.
import provider_secrets  # noqa: E402

provider_secrets._CACHE["at"] = time.monotonic()
provider_secrets._CACHE["values"] = {}
provider_secrets._CACHE["extras"] = {}


@pytest.fixture()
def client():
    with TestClient(server.app) as c:
        yield c


def find_lead(lead_id):
    """mongomock-motor mirrors motor's async interface — run the coroutine synchronously."""
    return asyncio.run(server.db.leads.find_one({"id": lead_id}))


BASE_PAYLOAD = {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "555-0100",
    "case_type": "personal_injury",
    "description": "I was in a car accident and broke my arm.",
}


def test_intake_with_attribution_persists_fields(client):
    payload = {
        **BASE_PAYLOAD,
        "utm_source": "google",
        "utm_medium": "cpc",
        "utm_campaign": "e2e-test",
        "utm_term": "car accident lawyer",
        "utm_content": "ad-variant-a",
        "gclid": "Cj0KCQjw-e2e-gclid",
        "fbclid": "e2e-fbclid",
        "source_page": "/intake/test-firm",
        "landing_page": "/?utm_source=google",
        "referrer": "https://www.google.com/",
        "first_touch_at": "2026-07-01T12:00:00+00:00",
    }
    resp = client.post("/api/intake", json=payload)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["ok"] is True
    assert body["lead_id"]

    stored = find_lead(body["lead_id"])
    assert stored is not None
    assert stored["utm_source"] == "google"
    assert stored["utm_medium"] == "cpc"
    assert stored["utm_campaign"] == "e2e-test"
    assert stored["source_page"] == "/intake/test-firm"
    assert stored["landing_page"] == "/?utm_source=google"
    assert stored["gclid"] == "Cj0KCQjw-e2e-gclid"
    assert stored["fbclid"] == "e2e-fbclid"
    assert stored["referrer"] == "https://www.google.com/"
    assert stored["first_touch_at"] == "2026-07-01T12:00:00+00:00"


def test_intake_attribution_is_sanitized():
    """Sanitize step strips whitespace and caps each attribution field at 300 chars —
    exercised directly against the pure helper (no Mongo/network involved)."""
    long_value = ("x" * 400)
    doc = {
        "utm_source": f"  {long_value}  ",
        "utm_medium": None,
        "source_page": "  /intake  ",
    }
    server._sanitize_attribution(doc)
    assert doc["utm_source"] == long_value[:300]
    assert len(doc["utm_source"]) == 300
    assert doc["utm_medium"] is None
    assert doc["source_page"] == "/intake"


def test_intake_without_attribution_still_works(client):
    resp = client.post("/api/intake", json=BASE_PAYLOAD)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["ok"] is True
    assert body["lead_id"]

    stored = find_lead(body["lead_id"])
    assert stored is not None
    assert stored.get("utm_source") is None
    assert stored.get("source_page") is None
    assert stored.get("landing_page") is None


def test_notify_never_fails_intake_when_send_raises(client):
    """Even if the notify email helper blows up, the intake request must still succeed."""
    with patch("server._notify_new_lead", side_effect=RuntimeError("boom")):
        resp = client.post("/api/intake", json=BASE_PAYLOAD)
    assert resp.status_code == 200, resp.text
    assert resp.json()["ok"] is True


def test_notify_calls_send_transactional_email_with_attribution(client, monkeypatch):
    monkeypatch.setenv("PRAXIUM_LEAD_NOTIFY_EMAIL", "notify@example.com")
    sent = {}

    def fake_send(to, subject, text, **kwargs):
        sent["to"] = to
        sent["subject"] = subject
        sent["text"] = text
        return True

    with patch("email_util.send_transactional_email", side_effect=fake_send):
        payload = {**BASE_PAYLOAD, "utm_source": "facebook", "source_page": "/intake"}
        resp = client.post("/api/intake", json=payload)

    assert resp.status_code == 200, resp.text
    assert sent["to"] == "notify@example.com"
    assert "New intake lead" in sent["subject"]
    assert "Jane Doe" in sent["subject"]
    assert "utm_source: facebook" in sent["text"]
    assert "source_page: /intake" in sent["text"]


def test_notify_skips_when_no_notify_email_configured(client, monkeypatch):
    monkeypatch.delenv("PRAXIUM_LEAD_NOTIFY_EMAIL", raising=False)
    monkeypatch.delenv("LEAD_NOTIFY_EMAIL", raising=False)
    with patch("email_util.send_transactional_email") as mock_send:
        resp = client.post("/api/intake", json=BASE_PAYLOAD)
    assert resp.status_code == 200, resp.text
    mock_send.assert_not_called()
