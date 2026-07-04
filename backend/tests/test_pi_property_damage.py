"""PI property damage module."""
import pytest
from fastapi.testclient import TestClient

from pi_property_damage import compute_pd_summary, merge_pi_property_damage

from server import app

client = TestClient(app)


@pytest.fixture
def auth_headers():
    import time

    ts = int(time.time())
    r = client.post(
        "/api/auth/signup",
        json={
            "email": f"pd+{ts}@praxium.law",
            "password": "Demo1234!",
            "name": "PD Test",
            "firm_name": f"PD Firm {ts}",
        },
    )
    token = r.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    matter = client.post(
        "/api/matters",
        headers=headers,
        json={"title": "PD Matter", "practice_area": "personal_injury", "incident_date": "2026-01-01"},
    ).json()
    headers["X-Matter-Id"] = matter["id"]
    return headers


def test_property_damage_crud(auth_headers):
    mid = auth_headers["X-Matter-Id"]
    r = client.get(f"/api/matters/{mid}/property-damage", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["pi_property_damage"]["status"] == "active"

    r2 = client.patch(
        f"/api/matters/{mid}/property-damage",
        headers=auth_headers,
        json={
            "vehicle": {"make": "Toyota", "model": "Camry", "market_value": 20000},
            "estimates": [
                {"source": "insurer", "amount": 500, "is_primary": False},
                {"source": "body_shop", "amount": 5000, "is_primary": True},
            ],
            "rental": {"in_rental": True, "authorization_status": "pending"},
        },
    )
    assert r2.status_code == 200
    summary = r2.json()["summary"]
    assert summary["alert_count"] >= 1

    r3 = client.post(f"/api/matters/{mid}/property-damage/log-follow-up", headers=auth_headers)
    assert r3.status_code == 200
    assert r3.json()["pi_property_damage"]["last_follow_up_date"] is not None


def test_total_loss_computation():
    pd = merge_pi_property_damage(
        {
            "estimates": [{"amount": 13000, "is_primary": True, "source": "body_shop"}],
            "total_loss": {"acv": 20000},
        }
    )
    summary = compute_pd_summary(pd)
    assert summary["total_loss_likely"] is True
