"""
Partner vault (D23) — API-level tests. The server never sees a passphrase,
a Recovery Key, or a DEK; these tests send already-"encrypted" (opaque,
fake-for-testing) blobs, the same shape a real browser client would send
after running packages/creytix-vault-crypto/ client-side.
"""
import pytest
from fastapi.testclient import TestClient

from server import app

client = TestClient(app)

FAKE_ENVELOPE = {"iv_b64": "aaaa", "tag_b64": "bbbb", "ciphertext_b64": "cccc"}


@pytest.fixture
def auth_headers():
    # int(time.time()) is second-granularity — this whole file's suite runs
    # in well under a second against the shared in-memory mongomock DB
    # (conftest.py), so two tests calling this fixture in the same second
    # collided on the same signup email ("Email already registered"),
    # failing every test after the first. uuid4 makes each call unique
    # regardless of timing.
    import uuid

    unique = uuid.uuid4().hex[:12]
    r = client.post(
        "/api/auth/signup",
        json={
            "email": f"vault+{unique}@praxium.law",
            "password": "Demo1234!",
            "name": "Vault Test",
            "firm_name": f"Vault Firm {unique}",
        },
    )
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    return {"Authorization": f"Bearer {token}"}


def _create_scope(headers, auth_key="correct-authkey-b64"):
    r = client.post(
        "/api/vault/scopes",
        headers=headers,
        json={
            "name": "Vendor payments",
            "salt_b64": "c2FsdA==",
            "auth_key_b64": auth_key,
            "wrapped_dek_passphrase": FAKE_ENVELOPE,
            "wrapped_dek_recovery": FAKE_ENVELOPE,
        },
    )
    assert r.status_code == 200, r.text
    return r.json()


def test_create_and_list_scope_never_returns_ciphertext(auth_headers):
    scope = _create_scope(auth_headers)
    assert "wrapped_dek_passphrase" not in scope
    assert "auth_key_hash" not in scope

    r = client.get("/api/vault/scopes", headers=auth_headers)
    assert r.status_code == 200
    items = r.json()["items"]
    assert any(i["id"] == scope["id"] for i in items)
    assert all("wrapped_dek_passphrase" not in i for i in items)


def test_unlock_with_correct_authkey_returns_wrapped_dek(auth_headers):
    scope = _create_scope(auth_headers, auth_key="my-authkey")
    r = client.post(
        f"/api/vault/scopes/{scope['id']}/unlock",
        headers=auth_headers,
        json={"auth_key_b64": "my-authkey"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["wrapped_dek_passphrase"] == FAKE_ENVELOPE


def test_unlock_with_wrong_authkey_fails_and_records_a_failure(auth_headers):
    scope = _create_scope(auth_headers, auth_key="my-authkey")
    r = client.post(
        f"/api/vault/scopes/{scope['id']}/unlock",
        headers=auth_headers,
        json={"auth_key_b64": "wrong-authkey"},
    )
    assert r.status_code == 401

    scopes = client.get("/api/vault/scopes", headers=auth_headers).json()["items"]
    this_scope = next(s for s in scopes if s["id"] == scope["id"])
    assert this_scope["lockout"]["failure_count"] == 1


def test_lockout_ladder_blocks_after_free_attempts_exhausted(auth_headers):
    scope = _create_scope(auth_headers, auth_key="my-authkey")
    for _ in range(3):
        r = client.post(
            f"/api/vault/scopes/{scope['id']}/unlock",
            headers=auth_headers,
            json={"auth_key_b64": "wrong"},
        )
        assert r.status_code == 401
    r = client.post(
        f"/api/vault/scopes/{scope['id']}/unlock",
        headers=auth_headers,
        json={"auth_key_b64": "wrong"},
    )
    assert r.status_code == 423
    assert r.json()["detail"]["reason"] == "lockout"


def test_lockout_never_destroys_the_scope_only_blocks_unlock(auth_headers):
    scope = _create_scope(auth_headers, auth_key="my-authkey")
    for _ in range(15):  # well past the freeze threshold
        client.post(
            f"/api/vault/scopes/{scope['id']}/unlock",
            headers=auth_headers,
            json={"auth_key_b64": "wrong"},
        )
    scopes = client.get("/api/vault/scopes", headers=auth_headers).json()["items"]
    this_scope = next(s for s in scopes if s["id"] == scope["id"])
    assert this_scope["status"] == "active"  # still there — locked, not destroyed
    assert this_scope["lockout"]["frozen"] is True


def test_recovery_blob_bypasses_the_lockout_ladder(auth_headers):
    scope = _create_scope(auth_headers, auth_key="my-authkey")
    for _ in range(15):
        client.post(
            f"/api/vault/scopes/{scope['id']}/unlock",
            headers=auth_headers,
            json={"auth_key_b64": "wrong"},
        )
    # scope is frozen for the passphrase path, but the recovery blob is still fetchable
    r = client.get(f"/api/vault/scopes/{scope['id']}/recovery-blob", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["wrapped_dek_recovery"] == FAKE_ENVELOPE


def test_vault_item_crud_is_opaque_to_the_server(auth_headers):
    scope = _create_scope(auth_headers)
    r = client.post(
        f"/api/vault/scopes/{scope['id']}/items",
        headers=auth_headers,
        json={"label": "Q3 vendor invoice", "envelope": FAKE_ENVELOPE},
    )
    assert r.status_code == 200
    item_id = r.json()["id"]

    listed = client.get(f"/api/vault/scopes/{scope['id']}/items", headers=auth_headers).json()["items"]
    assert "envelope" not in listed[0]

    fetched = client.get(f"/api/vault/scopes/{scope['id']}/items/{item_id}", headers=auth_headers).json()
    assert fetched["envelope"] == FAKE_ENVELOPE

    r = client.delete(f"/api/vault/scopes/{scope['id']}/items/{item_id}", headers=auth_headers)
    assert r.status_code == 200


def test_destroy_requires_reauth_and_gives_an_undo_window(auth_headers):
    scope = _create_scope(auth_headers, auth_key="my-authkey")

    denied = client.post(
        f"/api/vault/scopes/{scope['id']}/destroy",
        headers=auth_headers,
        json={"auth_key_b64": "wrong"},
    )
    assert denied.status_code == 401

    ok = client.post(
        f"/api/vault/scopes/{scope['id']}/destroy",
        headers=auth_headers,
        json={"auth_key_b64": "my-authkey"},
    )
    assert ok.status_code == 200
    assert ok.json()["status"] == "pending_destroy"

    undo = client.post(f"/api/vault/scopes/{scope['id']}/undo-destroy", headers=auth_headers)
    assert undo.status_code == 200
    assert undo.json()["status"] == "active"


def test_another_users_scope_is_not_visible_or_operable(auth_headers):
    scope = _create_scope(auth_headers, auth_key="my-authkey")

    import time
    ts = int(time.time())
    other = client.post(
        "/api/auth/signup",
        json={
            "email": f"vault-other+{ts}@praxium.law",
            "password": "Demo1234!",
            "name": "Other User",
            "firm_name": f"Other Firm {ts}",
        },
    ).json()
    other_headers = {"Authorization": f"Bearer {other['token']}"}

    r = client.post(
        f"/api/vault/scopes/{scope['id']}/unlock",
        headers=other_headers,
        json={"auth_key_b64": "my-authkey"},
    )
    assert r.status_code == 404  # different firm — not even visible, let alone 403
