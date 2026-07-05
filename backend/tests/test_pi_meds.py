"""PI Meds ledger API."""
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
            "email": f"meds+{ts}@praxium.law",
            "password": "Demo1234!",
            "name": "Meds Test",
            "firm_name": f"Meds Firm {ts}",
        },
    )
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    matter = client.post(
        "/api/matters",
        headers=headers,
        json={"title": "MVA Meds Test", "practice_area": "personal_injury"},
    ).json()
    headers["X-Matter-Id"] = matter["id"]
    return headers


def test_meds_ledger_crud(auth_headers):
    mid = auth_headers["X-Matter-Id"]
    r = client.post(
        f"/api/matters/{mid}/meds-ledger",
        headers=auth_headers,
        json={"provider_name": "ABC Chiropractic", "specialty": "chiro"},
    )
    assert r.status_code == 200
    row_id = r.json()["id"]

    r2 = client.get(f"/api/matters/{mid}/meds-ledger", headers=auth_headers)
    assert r2.status_code == 200
    data = r2.json()
    assert data["summary"]["provider_count"] == 1
    assert data["items"][0]["provider_name"] == "ABC Chiropractic"

    r3 = client.patch(
        f"/api/meds-ledger/{row_id}",
        headers=auth_headers,
        json={
            "balance": 4500,
            "staff_initials": "RT",
            "last_treatment_date": "2026-06-01",
            "still_treating": False,
            "cor_status": "missing",
        },
    )
    assert r3.status_code == 200
    assert r3.json()["balance"] == 4500
    assert r3.json()["cor_status"] == "missing"

    r4 = client.get(f"/api/matters/{mid}/meds-ledger", headers=auth_headers)
    assert r4.json()["summary"]["missing_cor_count"] == 1

    r6 = client.patch(
        f"/api/meds-ledger/{row_id}",
        headers=auth_headers,
        json={
            "lien_sold_to": "JML",
            "cpt_code": "72141",
            "date_of_service": "2017-01-31",
            "chartswap_required": True,
        },
    )
    assert r6.status_code == 200
    assert r6.json()["lien_sold_to"] == "JML"
    assert r6.json()["cpt_code"] == "72141"
    assert r6.json()["chartswap_required"] is True
    assert client.get(f"/api/matters/{mid}/meds-ledger", headers=auth_headers).json()["summary"]["lien_sold_count"] == 1

    r5 = client.delete(f"/api/meds-ledger/{row_id}", headers=auth_headers)
    assert r5.status_code == 200


def test_treatment_compliance_alerts(auth_headers):
    mid = auth_headers["X-Matter-Id"]
    row = client.post(
        f"/api/matters/{mid}/meds-ledger",
        headers=auth_headers,
        json={"provider_name": "Valley Chiro", "specialty": "chiro"},
    ).json()
    client.patch(
        f"/api/meds-ledger/{row['id']}",
        headers=auth_headers,
        json={
            "still_treating": True,
            "first_treatment_date": "2026-01-01",
            "last_treatment_date": "2026-01-15",
            "next_treatment_date": "2026-01-20",
        },
    )
    data = client.get(f"/api/matters/{mid}/meds-ledger", headers=auth_headers).json()
    codes = {a["code"] for a in data.get("alerts", [])}
    assert "no_show" in codes or "treatment_gap" in codes
    assert data["items"][0].get("compliance_status") in ("no_show", "treatment_gap", "not_confirmed", "active")
    assert data["summary"].get("alert_count", 0) >= 1
    assert "mri_overdue" in codes or data["summary"]["alert_count"] >= 1
