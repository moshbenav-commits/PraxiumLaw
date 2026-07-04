"""PI demand builder + attorney approval gate."""
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
            "email": f"demand+{ts}@praxium.law",
            "password": "Demo1234!",
            "name": "Demand Test",
            "firm_name": f"Demand Firm {ts}",
        },
    )
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    matter = client.post(
        "/api/matters",
        headers=headers,
        json={"title": "Demand Matter", "practice_area": "personal_injury"},
    ).json()
    headers["X-Matter-Id"] = matter["id"]
    return headers


def test_demand_builder_flow(auth_headers):
    mid = auth_headers["X-Matter-Id"]
    row = client.post(
        f"/api/matters/{mid}/meds-ledger",
        headers=auth_headers,
        json={"provider_name": "Desert Hospital", "specialty": "hospital"},
    ).json()
    client.patch(
        f"/api/meds-ledger/{row['id']}",
        headers=auth_headers,
        json={"balance": 45000},
    )

    r = client.get(f"/api/matters/{mid}/demand", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["pi_demand"]["status"] == "draft"

    r2 = client.post(f"/api/matters/{mid}/demand/rebuild-exhibits", headers=auth_headers)
    assert r2.status_code == 200
    assert r2.json()["exhibit_count"] >= 1

    prep_payload = [
        {"id": item["id"], "complete": True, "notes": ""}
        for item in r2.json()["pi_demand"]["prep_checklist"]
    ]
    client.patch(f"/api/matters/{mid}/demand", headers=auth_headers, json={"prep_checklist": prep_payload})

    r3 = client.post(f"/api/matters/{mid}/demand/submit-for-review", headers=auth_headers)
    assert r3.status_code == 200
    assert r3.json()["pi_demand"]["status"] == "pending_attorney_review"

    r4 = client.post(f"/api/matters/{mid}/demand/mark-sent", headers=auth_headers)
    assert r4.status_code == 403

    r5 = client.post(f"/api/matters/{mid}/demand/approve", headers=auth_headers, json={})
    assert r5.status_code == 200
    assert r5.json()["pi_demand"]["status"] == "approved"

    r6 = client.post(f"/api/matters/{mid}/demand/mark-sent", headers=auth_headers, json={})
    assert r6.status_code == 200
    assert r6.json()["pi_demand"]["status"] == "sent"

    queue = client.get("/api/pi/demand/review-queue", headers=auth_headers)
    assert queue.status_code == 200


def test_yellow_sheet_order(auth_headers):
    from pi_demand import build_exhibits_from_ledger

    rows = [
        {"id": "a", "provider_name": "CVS", "specialty": "pharmacy", "balance": 100},
        {"id": "b", "provider_name": "General Hospital", "specialty": "hospital", "balance": 50000},
    ]
    ex = build_exhibits_from_ledger(rows, new_id=lambda: "x")
    assert ex[0]["provider_name"] == "General Hospital"
    assert ex[0]["sort_order"] == 1
