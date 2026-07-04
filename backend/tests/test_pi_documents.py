"""PI document taxonomy + redaction API."""
import io

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
            "email": f"doctax+{ts}@praxium.law",
            "password": "Demo1234!",
            "name": "Doc Tax Test",
            "firm_name": f"Doc Firm {ts}",
        },
    )
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    matter = client.post(
        "/api/matters",
        headers=headers,
        json={"title": "Doc Tax Matter", "practice_area": "personal_injury"},
    ).json()
    headers["X-Matter-Id"] = matter["id"]
    return headers


def test_taxonomy_catalog(auth_headers):
    r = client.get("/api/pi/documents/taxonomy", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert len(data["doc_types"]) >= 7
    assert len(data["medical_codes"]) == 4


def test_upload_with_taxonomy(auth_headers):
    mid = auth_headers["X-Matter-Id"]
    content = b"%PDF-1.4 minimal"
    files = {"file": ("test-bill.pdf", io.BytesIO(content), "application/pdf")}
    data = {
        "matter_id": mid,
        "name": "B Hospital ABC 2026.07.04.pdf",
        "doc_type": "medical",
        "medical_code": "B",
        "provider_label": "Hospital ABC",
    }
    r = client.post("/api/documents", headers=auth_headers, data=data, files=files)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["taxonomy"]["doc_type"] == "medical"
    assert body["taxonomy"]["medical_code"] == "B"
    assert body["taxonomy"]["redaction_status"] == "pending"
    assert body["folder"] == "Medical"


def test_redaction_gate(auth_headers):
    mid = auth_headers["X-Matter-Id"]
    files = {"file": ("records.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")}
    data = {"matter_id": mid, "name": "MR Dr Smith.pdf", "doc_type": "medical", "medical_code": "MR"}
    doc = client.post("/api/documents", headers=auth_headers, data=data, files=files).json()
    doc_id = doc["id"]

    bad = client.patch(
        f"/api/documents/{doc_id}/taxonomy",
        headers=auth_headers,
        json={"carrier_share_ok": True},
    )
    assert bad.status_code == 400

    ok = client.patch(
        f"/api/documents/{doc_id}/taxonomy",
        headers=auth_headers,
        json={"acknowledge_redaction": True},
    )
    assert ok.status_code == 200
    assert ok.json()["taxonomy"]["redaction_status"] == "complete"

    share = client.patch(
        f"/api/documents/{doc_id}/taxonomy",
        headers=auth_headers,
        json={"carrier_share_ok": True},
    )
    assert share.status_code == 200
    assert share.json()["taxonomy"]["carrier_share_ok"] is True
