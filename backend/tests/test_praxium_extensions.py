"""Tests for Praxium backend extensions — RBAC, billing, workflows, marketplace, team, IDV."""
import os
import time

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")
API = f"{BASE_URL}/api"
TS = int(time.time())


@pytest.fixture(scope="session")
def ext_headers():
    payload = {
        "email": f"ext+{TS}@praxium.law",
        "password": "Demo1234!",
        "name": "Ext Test Attorney",
        "firm_name": f"Ext Firm {TS}",
    }
    r = requests.post(f"{API}/auth/signup", json=payload, timeout=20)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}", "Content-Type": "application/json"}


# ─────────── billing ───────────
def test_billing_plans_public():
    r = requests.get(f"{API}/billing/plans", timeout=10)
    assert r.status_code == 200
    plans = r.json().get("plans", [])
    assert len(plans) >= 3
    assert any(p["id"] == "starter" for p in plans)


def test_billing_subscription(ext_headers):
    r = requests.get(f"{API}/billing/subscription", headers=ext_headers, timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert "tier" in data and "seats_used" in data


def test_billing_upgrade_inquiry(ext_headers):
    r = requests.post(
        f"{API}/billing/upgrade-inquiry",
        headers=ext_headers,
        json={"plan_id": "growth", "message": "TEST inquiry"},
        timeout=10,
    )
    assert r.status_code == 200
    assert r.json().get("ok") is True


# ─────────── workflows ───────────
def test_workflows_list(ext_headers):
    r = requests.get(f"{API}/workflows", headers=ext_headers, timeout=10)
    assert r.status_code == 200
    items = r.json().get("items", [])
    assert len(items) >= 1
    assert any(w.get("trigger") == "matter.created" for w in items)


def test_workflow_toggle(ext_headers):
    listed = requests.get(f"{API}/workflows", headers=ext_headers, timeout=10).json()["items"]
    wf_id = listed[0]["id"]
    r = requests.patch(
        f"{API}/workflows/{wf_id}",
        headers=ext_headers,
        json={"enabled": not listed[0].get("enabled", True)},
        timeout=10,
    )
    assert r.status_code == 200


# ─────────── marketplace tools ───────────
def test_marketplace_catalog(ext_headers):
    r = requests.get(f"{API}/marketplace/tools", headers=ext_headers, timeout=10)
    assert r.status_code == 200
    tools = r.json().get("tools", [])
    assert len(tools) >= 4


def test_marketplace_custom_tool_request(ext_headers):
    r = requests.post(
        f"{API}/marketplace/custom-tool-requests",
        headers=ext_headers,
        json={"title": f"TEST tool {TS}", "description": "Automated test request"},
        timeout=10,
    )
    assert r.status_code == 200
    assert r.json().get("status") == "submitted"


# ─────────── team invites ───────────
def test_team_invite_flow(ext_headers):
    email = f"invite+{TS}@praxium.law"
    inv = requests.post(
        f"{API}/team/invite",
        headers=ext_headers,
        json={"email": email, "name": "Invited Paralegal", "role": "paralegal"},
        timeout=10,
    )
    assert inv.status_code == 200, inv.text
    token = inv.json().get("accept_token")
    assert token

    listed = requests.get(f"{API}/team/invites", headers=ext_headers, timeout=10)
    assert listed.status_code == 200
    assert any(i["email"] == email for i in listed.json().get("items", []))

    accept = requests.post(
        f"{API}/team/accept-invite",
        json={"token": token, "password": "Invite1234!"},
        timeout=10,
    )
    assert accept.status_code == 200, accept.text
    assert "token" in accept.json()


# ─────────── audit ───────────
def test_audit_log(ext_headers):
    r = requests.get(f"{API}/audit", headers=ext_headers, timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    assert data.get("limit") == 50


def test_audit_verify_chain(ext_headers):
    r = requests.get(f"{API}/audit/verify", headers=ext_headers, timeout=10)
    assert r.status_code == 200
    body = r.json()
    assert "ok" in body and "verified" in body


def test_audit_login_and_matter_view(ext_headers):
    login_fail = requests.post(
        f"{API}/auth/login",
        json={"email": f"ext+{TS}@praxium.law", "password": "wrong-password"},
        timeout=10,
    )
    assert login_fail.status_code == 401

    matter = requests.post(
        f"{API}/matters",
        headers=ext_headers,
        json={"title": f"Audit test matter {TS}", "status": "open"},
        timeout=10,
    )
    assert matter.status_code == 200, matter.text
    mid = matter.json()["id"]

    view = requests.get(f"{API}/matters/{mid}", headers=ext_headers, timeout=10)
    assert view.status_code == 200

    audit = requests.get(f"{API}/audit", headers=ext_headers, params={"limit": 50}, timeout=10)
    actions = {row["action"] for row in audit.json().get("items", [])}
    assert "auth.login.failed" in actions
    assert "matter.viewed" in actions


# ─────────── firm settings ───────────
def test_firm_settings_patch(ext_headers):
    r = requests.patch(
        f"{API}/firm/settings",
        headers=ext_headers,
        json={"settings": {"timezone": "America/Chicago"}},
        timeout=10,
    )
    assert r.status_code == 200
    assert r.json().get("settings", {}).get("timezone") == "America/Chicago"


# ─────────── identity verification demo ───────────
# ─────────── portal messaging ───────────
def test_portal_client_staff_messages(ext_headers):
    contact = requests.post(
        f"{API}/contacts",
        headers=ext_headers,
        json={"name": f"Portal Client {TS}", "email": f"portal+{TS}@example.com", "kind": "client"},
        timeout=10,
    )
    assert contact.status_code == 200, contact.text
    cid = contact.json()["id"]

    matter = requests.post(
        f"{API}/matters",
        headers=ext_headers,
        json={"title": f"Portal matter {TS}", "status": "open", "client_id": cid},
        timeout=10,
    )
    assert matter.status_code == 200, matter.text
    mid = matter.json()["id"]

    enable = requests.patch(
        f"{API}/matters/{mid}/portal",
        headers=ext_headers,
        json={"portal_enabled": True},
        timeout=10,
    )
    assert enable.status_code == 200

    link = requests.post(
        f"{API}/portal/request-link",
        json={"email": f"portal+{TS}@example.com"},
        timeout=10,
    )
    assert link.status_code == 200
    dev_url = link.json().get("dev_verify_url")
    if not dev_url:
        pytest.skip("Set PRAXIUM_PORTAL_DEV_RETURN_LINK=1 for portal message test")
    token = dev_url.split("token=")[-1]

    verify = requests.post(f"{API}/portal/verify", json={"token": token}, timeout=10)
    assert verify.status_code == 200, verify.text
    portal_token = verify.json()["token"]
    portal_headers = {"Authorization": f"Bearer {portal_token}", "Content-Type": "application/json"}

    client_msg = requests.post(
        f"{API}/portal/messages",
        headers=portal_headers,
        json={"matter_id": mid, "content": f"TEST portal client {TS}"},
        timeout=10,
    )
    assert client_msg.status_code == 200, client_msg.text

    thread = requests.get(
        f"{API}/portal/staff/messages",
        headers=ext_headers,
        params={"matter_id": mid},
        timeout=10,
    )
    assert thread.status_code == 200, thread.text
    items = thread.json().get("items", [])
    assert any(m.get("content") == f"TEST portal client {TS}" for m in items)

    staff_reply = requests.post(
        f"{API}/portal/staff/messages",
        headers=ext_headers,
        json={"matter_id": mid, "content": f"TEST staff reply {TS}"},
        timeout=10,
    )
    assert staff_reply.status_code == 200, staff_reply.text

    thread2 = requests.get(
        f"{API}/portal/staff/messages",
        headers=ext_headers,
        params={"matter_id": mid},
        timeout=10,
    )
    assert thread2.status_code == 200
    assert any(m.get("content") == f"TEST staff reply {TS}" for m in thread2.json().get("items", []))


def test_idv_demo_session():
    r = requests.post(f"{API}/identity-verification/demo/session", timeout=10)
    if r.status_code == 403:
        pytest.skip("IDV demo disabled on this deployment")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("token") and data.get("verifyUrl")


def _prod_needs_deploy() -> bool:
    return BASE_URL.rstrip("/").endswith("api.praxiumlaw.com")


# ─────────── phase 20 — webhooks, import, api keys, analytics ───────────
def test_health_program_phase():
    r = requests.get(f"{API}/health", timeout=10)
    assert r.status_code == 200
    data = r.json()
    if _prod_needs_deploy() and data.get("programPhase") != 20:
        pytest.skip("Prod API not yet on v0.3.0 — deploy praxiumlaw-back")
    assert data.get("programPhase") == 20
    assert data.get("maxProgramPhase") == 20
    assert "webhooks" in (data.get("modules") or [])


def test_webhooks_events_catalog(ext_headers):
    health = requests.get(f"{API}/health", timeout=10).json()
    if _prod_needs_deploy() and health.get("programPhase") != 20:
        pytest.skip("Prod API not yet on v0.3.0")
    r = requests.get(f"{API}/webhooks/events", headers=ext_headers, timeout=10)
    assert r.status_code == 200
    events = r.json().get("events", [])
    assert "matter.created" in events
    assert "signature.completed" in events


def test_webhook_endpoint_crud(ext_headers):
    health = requests.get(f"{API}/health", timeout=10).json()
    if _prod_needs_deploy() and health.get("programPhase") != 20:
        pytest.skip("Prod API not yet on v0.3.0")
    created = requests.post(
        f"{API}/webhooks/endpoints",
        headers=ext_headers,
        json={
            "url": "https://example.com/praxium-hook",
            "events": ["matter.created"],
            "description": f"TEST hook {TS}",
        },
        timeout=10,
    )
    assert created.status_code == 200, created.text
    body = created.json()
    assert body.get("secret", "").startswith("whsec_")
    endpoint_id = body["id"]

    listed = requests.get(f"{API}/webhooks/endpoints", headers=ext_headers, timeout=10)
    assert listed.status_code == 200
    assert any(i["id"] == endpoint_id for i in listed.json().get("items", []))

    deleted = requests.delete(f"{API}/webhooks/endpoints/{endpoint_id}", headers=ext_headers, timeout=10)
    assert deleted.status_code == 200


def test_api_key_create(ext_headers):
    health = requests.get(f"{API}/health", timeout=10).json()
    if _prod_needs_deploy() and health.get("programPhase") != 20:
        pytest.skip("Prod API not yet on v0.3.0")
    r = requests.post(
        f"{API}/integrations/api-keys",
        headers=ext_headers,
        json={"label": f"TEST key {TS}"},
        timeout=10,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("key", "").startswith("px_live_")
    assert data.get("id")


def test_analytics_summary(ext_headers):
    health = requests.get(f"{API}/health", timeout=10).json()
    if _prod_needs_deploy() and health.get("programPhase") != 20:
        pytest.skip("Prod API not yet on v0.3.0")
    r = requests.get(f"{API}/analytics/summary", headers=ext_headers, timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert data.get("programPhase") == 20
    assert "matters_total" in data
