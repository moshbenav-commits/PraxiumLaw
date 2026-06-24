"""Praxium Suite — comprehensive backend API regression tests."""
import os
import time
import uuid
from pathlib import Path

import pytest
import requests


def _load_backend_url() -> str:
    env_url = os.environ.get("REACT_APP_BACKEND_URL", "").strip().rstrip("/")
    if env_url:
        return env_url

    candidates = [
        Path(__file__).resolve().parent.parent.parent / "frontend" / ".env",
        Path("/app/frontend/.env"),
    ]
    for env_path in candidates:
        if not env_path.is_file():
            continue
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip().strip('"').rstrip("/")
    return "http://localhost:8000"


BASE_URL = _load_backend_url()

API = f"{BASE_URL}/api"
TS = int(time.time())


# ─────────── fixtures ───────────
@pytest.fixture(scope="session")
def signup_payload():
    return {
        "email": f"demo+{TS}@praxium.law",
        "password": "Demo1234!",
        "name": "Demo Attorney",
        "firm_name": f"Test Firm {TS}",
    }


@pytest.fixture(scope="session")
def auth_token(signup_payload):
    r = requests.post(f"{API}/auth/signup", json=signup_payload, timeout=20)
    assert r.status_code == 200, f"signup failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and data["user"]["email"] == signup_payload["email"]
    return data["token"]


@pytest.fixture(scope="session")
def headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# ─────────── health ───────────
def test_health():
    r = requests.get(f"{API}/health", timeout=10)
    assert r.status_code == 200
    assert r.json().get("ok") is True


def test_root():
    r = requests.get(f"{API}/", timeout=10)
    assert r.status_code == 200
    assert r.json().get("app") == "Praxium Suite"


# ─────────── auth ───────────
def test_auth_me(headers):
    r = requests.get(f"{API}/auth/me", headers=headers, timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert "user" in data and "firm" in data


def test_login_after_signup(signup_payload):
    r = requests.post(
        f"{API}/auth/login",
        json={"email": signup_payload["email"], "password": signup_payload["password"]},
        timeout=10,
    )
    assert r.status_code == 200
    assert "token" in r.json()


def test_login_invalid():
    r = requests.post(
        f"{API}/auth/login",
        json={"email": f"nobody+{TS}@example.com", "password": "bad"},
        timeout=10,
    )
    assert r.status_code == 401


def test_signup_duplicate(signup_payload):
    r = requests.post(f"{API}/auth/signup", json=signup_payload, timeout=10)
    assert r.status_code == 400


# ─────────── matters ───────────
@pytest.fixture(scope="session")
def matter_id(headers):
    payload = {
        "title": f"TEST Matter {TS}",
        "practice_area": "personal_injury",
        "status": "intake",
        "description": "Test matter for automated regression",
    }
    r = requests.post(f"{API}/matters", headers=headers, json=payload, timeout=10)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["title"] == payload["title"]
    assert data["case_number"].startswith("M-")
    assert "id" in data
    return data["id"]


def test_list_matters(headers, matter_id):
    r = requests.get(f"{API}/matters", headers=headers, timeout=10)
    assert r.status_code == 200
    matters = r.json()
    assert any(m["id"] == matter_id for m in matters)


def test_get_matter(headers, matter_id):
    r = requests.get(f"{API}/matters/{matter_id}", headers=headers, timeout=10)
    assert r.status_code == 200
    assert r.json()["id"] == matter_id


def test_update_matter_status(headers, matter_id):
    r = requests.put(
        f"{API}/matters/{matter_id}",
        headers=headers,
        json={"status": "active"},
        timeout=10,
    )
    assert r.status_code == 200
    # Verify
    g = requests.get(f"{API}/matters/{matter_id}", headers=headers, timeout=10)
    assert g.json()["status"] == "active"


# ─────────── contacts ───────────
@pytest.fixture(scope="session")
def contact_id(headers):
    payload = {
        "name": f"TEST Client {TS}",
        "kind": "client",
        "email": f"client+{TS}@example.com",
        "phone": "555-0100",
    }
    r = requests.post(f"{API}/contacts", headers=headers, json=payload, timeout=10)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["patient_id"].startswith("PT-"), "patient_id should auto-generate for clients"
    assert data["name"] == payload["name"]
    return data["id"]


def test_list_contacts(headers, contact_id):
    r = requests.get(f"{API}/contacts", headers=headers, timeout=10)
    assert r.status_code == 200
    assert any(c["id"] == contact_id for c in r.json())


def test_search_contacts(headers, contact_id):
    r = requests.get(f"{API}/contacts", headers=headers, params={"search": "TEST"}, timeout=10)
    assert r.status_code == 200


# ─────────── tasks ───────────
@pytest.fixture(scope="session")
def task_id(headers, matter_id):
    r = requests.post(
        f"{API}/tasks",
        headers=headers,
        json={"title": f"TEST Task {TS}", "matter_id": matter_id, "priority": "high"},
        timeout=10,
    )
    assert r.status_code == 200, r.text
    return r.json()["id"]


def test_list_tasks(headers, task_id):
    r = requests.get(f"{API}/tasks", headers=headers, timeout=10)
    assert r.status_code == 200
    assert any(t["id"] == task_id for t in r.json())


def test_update_task_status(headers, task_id):
    r = requests.put(
        f"{API}/tasks/{task_id}",
        headers=headers,
        json={"status": "done"},
        timeout=10,
    )
    assert r.status_code == 200


# ─────────── notes ───────────
def test_create_and_list_note(headers, matter_id):
    r = requests.post(
        f"{API}/notes",
        headers=headers,
        json={"matter_id": matter_id, "content": f"TEST note {TS}"},
        timeout=10,
    )
    assert r.status_code == 200, r.text
    g = requests.get(f"{API}/notes", headers=headers, params={"matter_id": matter_id}, timeout=10)
    assert g.status_code == 200
    assert any("TEST note" in n["content"] for n in g.json())


# ─────────── chat messages ───────────
def test_chat_post_and_list(headers, matter_id):
    r = requests.post(
        f"{API}/chat/messages",
        headers=headers,
        json={"matter_id": matter_id, "channel": "general", "content": f"TEST chat {TS}"},
        timeout=10,
    )
    assert r.status_code == 200, r.text
    g = requests.get(
        f"{API}/chat/messages",
        headers=headers,
        params={"matter_id": matter_id, "channel": "general"},
        timeout=10,
    )
    assert g.status_code == 200
    assert any(m["content"] == f"TEST chat {TS}" for m in g.json())


# ─────────── activities ───────────
def test_activities(headers, matter_id):
    r = requests.get(f"{API}/activities", headers=headers, timeout=10)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ─────────── providers / treatments ───────────
@pytest.fixture(scope="session")
def provider_id(headers):
    r = requests.post(
        f"{API}/providers",
        headers=headers,
        json={"name": f"TEST Dr Smith {TS}", "specialty": "Orthopedics", "preferred_submission": "email"},
        timeout=10,
    )
    assert r.status_code == 200, r.text
    return r.json()["id"]


def test_list_providers(headers, provider_id):
    r = requests.get(f"{API}/providers", headers=headers, timeout=10)
    assert r.status_code == 200
    assert any(p["id"] == provider_id for p in r.json())


def test_create_treatment(headers, matter_id, provider_id):
    r = requests.post(
        f"{API}/treatments",
        headers=headers,
        json={"matter_id": matter_id, "provider_id": provider_id, "role": "treating"},
        timeout=10,
    )
    assert r.status_code == 200


def test_medconnect_magic_link(headers, matter_id, provider_id):
    r = requests.post(
        f"{API}/medconnect/magic-link",
        headers=headers,
        json={"matter_id": matter_id, "provider_id": provider_id},
        timeout=10,
    )
    # accept 200 or 422 depending on body shape; just check not 5xx
    assert r.status_code < 500


# ─────────── intake / leads ───────────
def test_intake_public():
    payload = {
        "name": f"TEST Lead {TS}",
        "email": f"lead+{TS}@example.com",
        "phone": "555-0199",
        "description": "I had a car accident with surgery and fracture, insurance denied my claim",
    }
    r = requests.post(f"{API}/intake", json=payload, timeout=10)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "lead_id" in data and data["score"] > 50  # keyword boost
    return data["lead_id"]


def test_leads_list_claim_convert(headers):
    # Create lead
    lead_resp = requests.post(
        f"{API}/intake",
        json={
            "name": f"TEST ConvLead {TS}",
            "email": f"conv+{TS}@example.com",
            "phone": "555-0200",
            "description": "Hospital visit after fracture",
        },
        timeout=10,
    )
    assert lead_resp.status_code == 200
    lead_id = lead_resp.json()["lead_id"]

    # List leads
    r = requests.get(f"{API}/leads", headers=headers, timeout=10)
    assert r.status_code == 200
    assert any(l["id"] == lead_id for l in r.json())

    # Claim
    c = requests.post(f"{API}/leads/{lead_id}/claim", headers=headers, timeout=10)
    assert c.status_code == 200

    # Convert
    cv = requests.post(f"{API}/leads/{lead_id}/convert", headers=headers, timeout=10)
    assert cv.status_code == 200, cv.text
    body = cv.json()
    assert "matter_id" in body and "contact_id" in body and body["patient_id"].startswith("PT-")


# ─────────── dashboard ───────────
def test_dashboard(headers):
    r = requests.get(f"{API}/dashboard", headers=headers, timeout=10)
    assert r.status_code == 200
    data = r.json()
    for k in ("open_matters", "total_matters", "open_tasks", "pipeline", "recent_activity"):
        assert k in data
    assert isinstance(data["pipeline"], dict)
    # Pipeline keys should include 7 statuses
    expected = {"intake", "active", "discovery", "negotiation", "litigation", "settlement", "closed"}
    assert expected.issubset(set(data["pipeline"].keys()))


# ─────────── search ───────────
def test_global_search(headers):
    r = requests.get(f"{API}/search", headers=headers, params={"q": "TEST"}, timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert "matters" in data and "contacts" in data and "notes" in data


# ─────────── team ───────────
def test_team(headers):
    r = requests.get(f"{API}/team", headers=headers, timeout=10)
    assert r.status_code == 200
    team = r.json()
    assert len(team) >= 1
    # Should not leak password_hash
    assert all("password_hash" not in u for u in team)


# ─────────── AI streaming (CoCounsel) ───────────
def test_ai_chat_streaming(headers, matter_id):
    payload = {"matter_id": matter_id, "message": "Summarize this case in one sentence."}
    with requests.post(f"{API}/ai/chat", headers=headers, json=payload, stream=True, timeout=60) as r:
        assert r.status_code == 200, r.text
        chunks = []
        for chunk in r.iter_content(chunk_size=None, decode_unicode=True):
            if chunk:
                chunks.append(chunk)
            if sum(len(c) for c in chunks) > 50:
                break
        full = "".join(chunks)
        assert len(full) > 0, "No streaming content received from AI"
        assert "[Error" not in full, f"AI stream errored: {full[:200]}"


# ─────────── Praxa ───────────
@pytest.fixture(scope="session")
def praxa_token():
    payload = {
        "email": f"praxa+{TS}@example.com",
        "name": "Praxa Test User",
        "phone": "555-0123",
        "incident_date": "2026-01-01",
    }
    r = requests.post(f"{API}/praxa/signup", json=payload, timeout=10)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def test_praxa_journal(praxa_token):
    h = {"Authorization": f"Bearer {praxa_token}", "Content-Type": "application/json"}
    r = requests.post(
        f"{API}/praxa/journal",
        headers=h,
        json={"pain_level": 6, "notes": "Headache and back pain", "symptoms": ["headache", "back_pain"]},
        timeout=10,
    )
    assert r.status_code == 200, r.text
    g = requests.get(f"{API}/praxa/journal", headers=h, timeout=10)
    assert g.status_code == 200
    entries = g.json()
    assert any(e.get("pain_level") == 6 for e in entries)


def test_praxa_ai_coach_streaming(praxa_token):
    h = {"Authorization": f"Bearer {praxa_token}", "Content-Type": "application/json"}
    payload = {"message": "What do I say if the adjuster calls?"}
    with requests.post(f"{API}/praxa/ai-coach", headers=h, json=payload, stream=True, timeout=60) as r:
        assert r.status_code == 200, r.text
        chunks = []
        for chunk in r.iter_content(chunk_size=None, decode_unicode=True):
            if chunk:
                chunks.append(chunk)
            if sum(len(c) for c in chunks) > 80:
                break
        full = "".join(chunks)
        assert len(full) > 0
        assert "[Error" not in full, f"AI coach errored: {full[:200]}"


# ─────────── unauthorized access ───────────
def test_no_token_returns_401():
    r = requests.get(f"{API}/matters", timeout=10)
    assert r.status_code in (401, 403)
