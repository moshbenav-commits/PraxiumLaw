"""Disclosure gate + subrogation module."""
import time

import pytest
from fastapi.testclient import TestClient

from server import app

client = TestClient(app)


@pytest.fixture
def auth_headers():
    ts = int(time.time())
    r = client.post(
        "/api/auth/signup",
        json={
            "email": f"subro+{ts}@praxium.law",
            "password": "Demo1234!",
            "name": "Subro Test",
            "firm_name": f"Subro Firm {ts}",
        },
    )
    assert r.status_code == 200, r.text
    headers = {"Authorization": f"Bearer {r.json()['token']}"}
    matter = client.post(
        "/api/matters",
        headers=headers,
        json={"title": "Subro Matter", "practice_area": "personal_injury"},
    ).json()
    headers["X-Matter-Id"] = matter["id"]
    return headers


def test_disclosure_required_then_ack(auth_headers):
    d = client.get("/api/disclosure", headers=auth_headers)
    assert d.status_code == 200
    assert d.json()["required"] is True

    blocked = client.get(
        "/api/training/templates/download/test.docx",
        headers=auth_headers,
    )
    assert blocked.status_code in (403, 404)

    ack = client.post("/api/disclosure/acknowledge", headers=auth_headers, json={"confirm": True})
    assert ack.status_code == 200

    d2 = client.get("/api/disclosure", headers=auth_headers)
    assert d2.json()["required"] is False


def test_subrogation_tab(auth_headers):
    mid = auth_headers["X-Matter-Id"]
    r = client.get(f"/api/matters/{mid}/subrogation", headers=auth_headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert len(data["pi_subrogation"]["checklist"]) >= 6

    patch = client.patch(
        f"/api/matters/{mid}/subrogation",
        headers=auth_headers,
        json={"status": "open", "path": "medicare", "health_plan_used": True},
    )
    assert patch.status_code == 200
    assert patch.json()["pi_subrogation"]["status"] == "open"
