"""PI intake — Needs List API."""
import pytest
from fastapi.testclient import TestClient

from server import app

client = TestClient(app)


@pytest.fixture
def auth_headers():
    import time

    ts = int(time.time())
    r = client.post(
        "/api/auth/signup",
        json={
            "email": f"intake+{ts}@praxium.law",
            "password": "Demo1234!",
            "name": "Intake Test",
            "firm_name": f"Intake Firm {ts}",
        },
    )
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    matter = client.post(
        "/api/matters",
        headers=headers,
        json={"title": "Test MVA", "practice_area": "personal_injury"},
    ).json()
    headers["X-Matter-Id"] = matter["id"]
    return headers


def test_needs_list_defaults(auth_headers):
    r = client.get("/api/pi/intake/needs-list-defaults", headers=auth_headers)
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) >= 10
    assert items[0]["id"] and "label" in items[0]


def test_matter_intake_get_and_patch(auth_headers):
    mid = auth_headers["X-Matter-Id"]
    r = client.get(f"/api/matters/{mid}/intake", headers=auth_headers)
    assert r.status_code == 200
    pi = r.json()["pi_intake"]
    assert len(pi["needs_list"]) >= 10
    assert pi["conflict_check_status"] == "pending"

    item_id = pi["needs_list"][0]["id"]
    r2 = client.patch(
        f"/api/matters/{mid}/intake",
        headers=auth_headers,
        json={"needs_list": [{"id": item_id, "received": True, "notes": "Copy on file"}]},
    )
    assert r2.status_code == 200
    updated = r2.json()["pi_intake"]
    first = next(x for x in updated["needs_list"] if x["id"] == item_id)
    assert first["received"] is True
    assert first["notes"] == "Copy on file"
