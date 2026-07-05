"""PI matter expense ledger + settlement sync."""
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
            "email": f"expenses+{ts}@praxium.law",
            "password": "Demo1234!",
            "name": "Expenses Test",
            "firm_name": f"Expenses Firm {ts}",
        },
    )
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    matter = client.post(
        "/api/matters",
        headers=headers,
        json={"title": "Expense Matter", "practice_area": "personal_injury"},
    ).json()
    headers["X-Matter-Id"] = matter["id"]
    return headers


def test_expense_ledger_and_settlement_sync(auth_headers):
    mid = auth_headers["X-Matter-Id"]

    r = client.post(
        f"/api/matters/{mid}/expenses",
        headers=auth_headers,
        json={"title": "Urgent care copay", "category": "copay_oob", "amount": 4.8},
    )
    assert r.status_code == 200
    row_id = r.json()["id"]

    r2 = client.post(
        f"/api/matters/{mid}/expenses",
        headers=auth_headers,
        json={"title": "Mileage to PT", "category": "mileage", "amount": 42.5},
    )
    assert r2.status_code == 200

    summary = client.get(f"/api/matters/{mid}/expenses", headers=auth_headers).json()["summary"]
    assert summary["settlement_total"] == 47.3
    assert summary["item_count"] == 2

    scenario = client.post(
        f"/api/matters/{mid}/settlement/scenarios",
        headers=auth_headers,
        json={"name": "Base case", "gross_settlement": 50000},
    ).json()["scenario"]
    assert scenario["expenses"] == 0

    sync = client.post(f"/api/matters/{mid}/expenses/sync-to-settlement", headers=auth_headers)
    assert sync.status_code == 200
    assert sync.json()["expenses_synced"] == 47.3

    settlement = client.get(f"/api/matters/{mid}/settlement", headers=auth_headers).json()
    active = settlement["pi_settlement"]["active_scenario_id"]
    active_scenario = next(s for s in settlement["pi_settlement"]["scenarios"] if s["id"] == active)
    assert active_scenario["expenses"] == 47.3

    client.delete(f"/api/expenses/{row_id}", headers=auth_headers)


def test_demand_economic_from_expenses(auth_headers):
    mid = auth_headers["X-Matter-Id"]
    client.post(
        f"/api/matters/{mid}/expenses",
        headers=auth_headers,
        json={"title": "Lost wages week 1", "category": "wage_loss", "amount": 1200},
    )
    client.post(
        f"/api/matters/{mid}/expenses",
        headers=auth_headers,
        json={"title": "Rental car", "category": "rental_car", "amount": 350},
    )

    r = client.post(f"/api/matters/{mid}/demand/sync-economic-from-expenses", headers=auth_headers)
    assert r.status_code == 200
    econ = r.json()["pi_demand"]["economic_damages"]
    assert econ["wage_loss_total"] == 1200
    assert econ["rental_car_total"] == 350

    demand = client.get(f"/api/matters/{mid}/demand", headers=auth_headers).json()
    assert demand["validation"]["economic_damages_total"] == 1550
    assert "economic_damages" in demand["pi_demand"]
