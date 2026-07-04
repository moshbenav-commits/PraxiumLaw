"""PI settlement calculator + attorney reduction gate."""
import pytest
from fastapi.testclient import TestClient

from pi_settlement import compute_scenario_totals

from server import app

client = TestClient(app)


@pytest.fixture
def auth_headers():
    import time

    ts = int(time.time())
    r = client.post(
        "/api/auth/signup",
        json={
            "email": f"settle+{ts}@praxium.law",
            "password": "Demo1234!",
            "name": "Settle Test",
            "firm_name": f"Settle Firm {ts}",
        },
    )
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    matter = client.post(
        "/api/matters",
        headers=headers,
        json={"title": "Settlement Matter", "practice_area": "personal_injury"},
    ).json()
    headers["X-Matter-Id"] = matter["id"]
    return headers


def test_settlement_scenario_flow(auth_headers):
    mid = auth_headers["X-Matter-Id"]
    row = client.post(
        f"/api/matters/{mid}/meds-ledger",
        headers=auth_headers,
        json={"provider_name": "Valley Hospital", "specialty": "hospital"},
    ).json()
    client.patch(
        f"/api/meds-ledger/{row['id']}",
        headers=auth_headers,
        json={"balance": 60000},
    )

    offer = client.post(
        f"/api/matters/{mid}/settlement/offers",
        headers=auth_headers,
        json={
            "amount": 100000,
            "offer_date": "2026-07-01",
            "direction": "insurance_to_plaintiff",
            "carrier": "State Farm",
        },
    ).json()["offer"]

    scenario = client.post(
        f"/api/matters/{mid}/settlement/scenarios",
        headers=auth_headers,
        json={"name": "Initial offer", "offer_id": offer["id"]},
    ).json()["scenario"]
    assert scenario["gross_settlement"] == 100000
    assert len(scenario["line_items"]) >= 1

    sid = scenario["id"]
    line_id = scenario["line_items"][0]["id"]
    client.patch(
        f"/api/matters/{mid}/settlement/scenarios/{sid}",
        headers=auth_headers,
        json={
            "line_items": [{"id": line_id, "reduction_percent": 40, "reduction_type": "percent"}],
        },
    )

    approved = client.post(f"/api/matters/{mid}/settlement/scenarios/{sid}/approve", headers=auth_headers)
    assert approved.status_code == 200
    assert approved.json()["scenario"]["attorney_approved"] is True
    assert approved.json()["scenario"]["computed"]["client_facing_ready"] is True


def test_compute_net_to_client():
    scenario = {
        "gross_settlement": 100000,
        "expenses": 350,
        "medpay_to_client": 0,
        "attorney_fee_pct": 33.333,
        "line_items": [
            {"balance": 60000, "reduction_type": "percent", "reduction_percent": 40},
        ],
    }
    totals = compute_scenario_totals(scenario)
    assert totals["total_med_payout"] == 36000
    assert totals["net_to_client"] == pytest.approx(100000 - 33333 - 350 - 36000, rel=0.01)
