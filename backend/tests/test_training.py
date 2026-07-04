"""Training API — catalog and content from docs/pi-case-os."""
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
            "email": f"train+{ts}@praxium.law",
            "password": "Demo1234!",
            "name": "Training Test",
            "firm_name": f"Train Firm {ts}",
        },
    )
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_training_catalog(auth_headers):
    r = client.get("/api/training/catalog", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "guides" in data and len(data["guides"]) >= 1
    assert "articles" in data and len(data["articles"]) >= 1
    assert data["ux_gaps_summary"]["total"] >= 1


def test_training_guide_content(auth_headers):
    r = client.get("/api/training/content/guide/case-manager", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["type"] == "guide"
    assert "Case Manager" in body["title"]
    assert len(body["markdown"]) > 200


def test_training_ux_gaps(auth_headers):
    r = client.get("/api/training/ux-gaps?priority=P0", headers=auth_headers)
    assert r.status_code == 200
    gaps = r.json()["gaps"]
    assert all(g["priority"] == "P0" for g in gaps)
    assert any(g["id"] == "UX-002" for g in gaps)


def test_training_templates_catalog(auth_headers):
    r = client.get("/api/training/templates", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["total"] >= 100
    assert data["download_available"] is True
    assert any(t["category"] == "intake" for t in data["templates"])


def test_training_intake_checklist(auth_headers):
    r = client.get("/api/training/intake-checklist", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert "sections" in body and len(body["sections"]) >= 5


def test_training_intake_checklist_pdf(auth_headers):
    r = client.get("/api/training/intake-checklist.pdf", headers=auth_headers)
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert r.content[:4] == b"%PDF"
