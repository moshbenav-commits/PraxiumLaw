"""PI phase pipeline API."""
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
            "email": f"phase+{ts}@praxium.law",
            "password": "Demo1234!",
            "name": "Phase Test",
            "firm_name": f"Phase Firm {ts}",
        },
    )
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    matter = client.post(
        "/api/matters",
        headers=headers,
        json={"title": "PI Phase Matter", "practice_area": "personal_injury"},
    ).json()
    headers["X-Matter-Id"] = matter["id"]
    return headers


def test_phases_catalog(auth_headers):
    r = client.get("/api/pi/phases/catalog", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert len(data["phases"]) >= 10
    assert "intake" in data["phase_tasks"]


def test_phase_transition(auth_headers):
    mid = auth_headers["X-Matter-Id"]
    r = client.get(f"/api/matters/{mid}/phase", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["pi_phase"]["current"] == "intake"
    assert len(r.json()["tasks"]) >= 1

    r2 = client.patch(
        f"/api/matters/{mid}/phase",
        headers=auth_headers,
        json={"phase": "treating", "notes": "Client booked chiro"},
    )
    assert r2.status_code == 200
    assert r2.json()["pi_phase"]["current"] == "treating"
    assert len(r2.json()["pi_phase"]["history"]) == 1

    matter = client.get(f"/api/matters/{mid}", headers=auth_headers).json()
    assert matter["status"] == "active"

    r3 = client.get("/api/matters?pi_phase=treating", headers=auth_headers)
    assert r3.status_code == 200
    assert any(m["id"] == mid for m in r3.json())


def test_phase_report(auth_headers):
    r = client.get("/api/pi/phases/report", headers=auth_headers)
    assert r.status_code == 200
    assert "counts" in r.json()
    assert r.json()["counts"]["intake"] >= 0
