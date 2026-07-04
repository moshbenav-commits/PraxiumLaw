"""PI client comms cadence API (UX-016)."""
import time

import pytest
from fastapi.testclient import TestClient

from server import app

client = TestClient(app)


@pytest.fixture
def pi_headers():
    ts = int(time.time())
    r = client.post(
        "/api/auth/signup",
        json={
            "email": f"comms+{ts}@praxium.law",
            "password": "Demo1234!",
            "name": "Comms Test",
            "firm_name": f"Comms Firm {ts}",
        },
    )
    assert r.status_code == 200, r.text
    headers = {"Authorization": f"Bearer {r.json()['token']}"}
    matter = client.post(
        "/api/matters",
        headers=headers,
        json={"title": "Comms Matter", "practice_area": "personal_injury", "incident_date": "2026-01-01"},
    ).json()
    headers["X-Matter-Id"] = matter["id"]
    return headers


def test_comms_cadence_get(pi_headers):
    mid = pi_headers["X-Matter-Id"]
    r = client.get(f"/api/matters/{mid}/comms-cadence", headers=pi_headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "cadence" in data
    assert "due_items" in data["cadence"]
    assert data["voxline_status"] == "mocked"


def test_log_contact(pi_headers):
    mid = pi_headers["X-Matter-Id"]
    r = client.post(
        f"/api/matters/{mid}/comms-cadence/contact",
        headers=pi_headers,
        json={"channel": "call", "summary": "3-day check-in — Needs List reviewed", "cadence_code": "day_3", "mark_milestone_complete": "day_3"},
    )
    assert r.status_code == 200, r.text
    assert len(r.json()["contact_log"]) >= 1


def test_white_label_merge_tokens(pi_headers):
    client.patch(
        "/api/firm/white-label",
        headers=pi_headers,
        json={"firm_address": "123 Main St", "attorney_name": "Jane Doe"},
    )
    r = client.get("/api/training/templates/merge-tokens", headers=pi_headers)
    assert r.status_code == 200
    tokens = r.json()["tokens"]
    assert tokens["{{FIRM_ADDRESS}}"] == "123 Main St"
    assert tokens["{{ATTORNEY_NAME}}"] == "Jane Doe"


def test_audit_dashboard(pi_headers):
    r = client.get("/api/pi/audit/dashboard", headers=pi_headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "matters_audited" in data
    assert "items" in data
