"""PI insurance — 3P/1P panel API."""
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
            "email": f"insurance+{ts}@praxium.law",
            "password": "Demo1234!",
            "name": "Insurance Test",
            "firm_name": f"Insurance Firm {ts}",
        },
    )
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    matter = client.post(
        "/api/matters",
        headers=headers,
        json={"title": "MVA Insurance Test", "practice_area": "personal_injury"},
    ).json()
    headers["X-Matter-Id"] = matter["id"]
    return headers


def test_matter_insurance_defaults(auth_headers):
    mid = auth_headers["X-Matter-Id"]
    r = client.get(f"/api/matters/{mid}/insurance", headers=auth_headers)
    assert r.status_code == 200
    pi = r.json()["pi_insurance"]
    assert pi["claimant_count"] == 1
    assert pi["third_party"]["lor"]["status"] == "not_sent"
    assert pi["first_party"]["opened"] is False


def test_matter_insurance_patch_3p(auth_headers):
    mid = auth_headers["X-Matter-Id"]
    r = client.patch(
        f"/api/matters/{mid}/insurance",
        headers=auth_headers,
        json={
            "claimant_count": 2,
            "third_party": {
                "opened": True,
                "carrier_name": "State Farm",
                "claim_number": "CLM-123",
                "lor": {"status": "sent", "sent_date": "2026-07-04"},
                "limits": {"display": "100/300", "limits_confirmed": True},
            },
        },
    )
    assert r.status_code == 200
    pi = r.json()["pi_insurance"]
    assert pi["claimant_count"] == 2
    assert pi["third_party"]["carrier_name"] == "State Farm"
    assert pi["third_party"]["lor"]["status"] == "sent"
    assert pi["third_party"]["limits"]["display"] == "100/300"
