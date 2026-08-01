"""
Praxium Suite — partner zero-knowledge vault (Sean/GMI scopes).

D23, docs/creytix/CREYTIX_RICARDO_DECISION_DASHBOARD_PLAN_2026-08-01.md §22
and docs/creytix/VAULT_CRYPTO_IMPLEMENTATION_NOTES.md. This is the backend
wiring half — the crypto itself (KDF, envelope encryption) runs client-side
(packages/creytix-vault-crypto/ is the reference design; the browser port
is a separate, not-yet-written piece — see the implementation notes doc).
This module never sees a passphrase, a Recovery Key, or a DEK. It stores
ciphertext, verifies a bcrypt-hashed authKey, and enforces the lockout
ladder — that's the entire server-side trust boundary.

Zero-knowledge, no exceptions: do NOT reuse provider_secrets.py's Fernet
helper here — its key is derived from JWT_SECRET (server-held), which is
the exact opposite of what this module exists to guarantee. If a future
edit imports `_fernet` from provider_secrets into this file, that edit is
wrong regardless of how convenient it looks.

Ownership model: a vault scope belongs to exactly one user (owner_user_id),
not to the firm generally — this is Sean's private layer, not shared
partner data. Every route checks the caller is the scope's owner; being
role="partner" is necessary but not sufficient.
"""
from __future__ import annotations

import time
from typing import Any, Callable, Optional

import bcrypt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from vault_lockout import (
    check_unlock_allowed,
    fresh_lockout_state,
    record_failure,
    record_success,
)


# ──────────────── models ────────────────
class VaultCreateScopeIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    salt_b64: str
    auth_key_b64: str
    wrapped_dek_passphrase: dict  # {iv_b64, tag_b64, ciphertext_b64}
    wrapped_dek_recovery: dict  # {iv_b64, tag_b64, ciphertext_b64}


class VaultUnlockIn(BaseModel):
    auth_key_b64: str


class VaultItemIn(BaseModel):
    label: str = Field(..., min_length=1, max_length=200)
    envelope: dict  # {iv_b64, tag_b64, ciphertext_b64} — opaque to the server


def _new_scope_doc(*, scope_id, firm_id, owner_user_id, now_iso, body: VaultCreateScopeIn) -> dict:
    return {
        "id": scope_id,
        "firm_id": firm_id,
        "owner_user_id": owner_user_id,
        "name": body.name,
        "salt_b64": body.salt_b64,
        "auth_key_hash": bcrypt.hashpw(body.auth_key_b64.encode(), bcrypt.gensalt()).decode(),
        "wrapped_dek_passphrase": body.wrapped_dek_passphrase,
        "wrapped_dek_recovery": body.wrapped_dek_recovery,
        "lockout": fresh_lockout_state(),
        "status": "active",  # active | pending_destroy
        "deleted_at": None,
        "created_at": now_iso,
        "updated_at": now_iso,
    }


def register_partner_vault_routes(
    api: APIRouter,
    db: Any,
    get_current_user: Callable,
    new_id: Callable[[], str],
    now_iso: Callable[[], str],
    log_audit: Callable,
    *,
    destroy_undo_window_seconds: int = 24 * 60 * 60,
) -> None:
    async def _owned_scope(scope_id: str, user: dict) -> dict:
        scope = await db.vault_scopes.find_one({"id": scope_id, "firm_id": user["firm_id"]})
        if not scope:
            raise HTTPException(404, "Vault scope not found")
        if scope["owner_user_id"] != user["id"]:
            raise HTTPException(403, "Not the owner of this vault scope")
        return scope

    def _public_scope(scope: dict) -> dict:
        """Metadata only — never the wrapped-DEK blobs or the auth hash."""
        return {
            "id": scope["id"],
            "name": scope["name"],
            "status": scope["status"],
            "created_at": scope["created_at"],
            "updated_at": scope["updated_at"],
            "lockout": {
                "failure_count": scope["lockout"]["failure_count"],
                "frozen": scope["lockout"]["frozen"],
            },
        }

    @api.post("/vault/scopes")
    async def create_vault_scope(body: VaultCreateScopeIn, user=Depends(get_current_user)):
        scope_id = new_id()
        doc = _new_scope_doc(
            scope_id=scope_id, firm_id=user["firm_id"], owner_user_id=user["id"],
            now_iso=now_iso(), body=body,
        )
        await db.vault_scopes.insert_one(doc)
        await log_audit(
            db, firm_id=user["firm_id"], actor_id=user["id"], actor_name=user["name"],
            action="vault_scope.created", resource_type="vault_scope", resource_id=scope_id,
            new_id=new_id, now_iso=now_iso,
        )
        return _public_scope(doc)

    @api.get("/vault/scopes")
    async def list_vault_scopes(user=Depends(get_current_user)):
        rows = await db.vault_scopes.find(
            {"firm_id": user["firm_id"], "owner_user_id": user["id"]}
        ).sort("created_at", -1).to_list(200)
        return {"items": [_public_scope(r) for r in rows]}

    @api.post("/vault/scopes/{scope_id}/unlock")
    async def unlock_vault_scope(scope_id: str, body: VaultUnlockIn, user=Depends(get_current_user)):
        scope = await _owned_scope(scope_id, user)
        now = time.time()
        check = check_unlock_allowed(scope["lockout"], now)
        if not check["allowed"]:
            await log_audit(
                db, firm_id=user["firm_id"], actor_id=user["id"], actor_name=user["name"],
                action="vault_scope.unlock_blocked", resource_type="vault_scope", resource_id=scope_id,
                detail={"reason": check["reason"]}, outcome="failure", new_id=new_id, now_iso=now_iso,
            )
            raise HTTPException(423, {"reason": check["reason"], "retry_after": check["retry_after"]})

        verified = bcrypt.checkpw(body.auth_key_b64.encode(), scope["auth_key_hash"].encode())
        if not verified:
            new_lockout = record_failure(scope["lockout"], now)
            await db.vault_scopes.update_one({"id": scope_id}, {"$set": {"lockout": new_lockout, "updated_at": now_iso()}})
            await log_audit(
                db, firm_id=user["firm_id"], actor_id=user["id"], actor_name=user["name"],
                action="vault_scope.unlock_failed", resource_type="vault_scope", resource_id=scope_id,
                detail={"failure_count": new_lockout["failure_count"], "frozen": new_lockout["frozen"]},
                outcome="failure", new_id=new_id, now_iso=now_iso,
            )
            raise HTTPException(401, "Incorrect passphrase verifier")

        new_lockout = record_success(scope["lockout"])
        await db.vault_scopes.update_one({"id": scope_id}, {"$set": {"lockout": new_lockout, "updated_at": now_iso()}})
        await log_audit(
            db, firm_id=user["firm_id"], actor_id=user["id"], actor_name=user["name"],
            action="vault_scope.unlocked", resource_type="vault_scope", resource_id=scope_id,
            new_id=new_id, now_iso=now_iso,
        )
        # Only the wrapped DEK is returned — unwrapping happens client-side with encKey,
        # which this server has never seen and never will.
        return {"wrapped_dek_passphrase": scope["wrapped_dek_passphrase"]}

    @api.get("/vault/scopes/{scope_id}/recovery-blob")
    async def get_vault_recovery_blob(scope_id: str, user=Depends(get_current_user)):
        """
        Recovery-Key path bypasses the lockout ladder by design (dashboard
        plan §22d.4/"Tradeoffs iii") — there is no server-side verifier for
        the Recovery Key at all (the server never receives it), so there is
        nothing to rate-limit here. The returned blob is ciphertext, inert
        without the physical Recovery Key.
        """
        scope = await _owned_scope(scope_id, user)
        await log_audit(
            db, firm_id=user["firm_id"], actor_id=user["id"], actor_name=user["name"],
            action="vault_scope.recovery_blob_fetched", resource_type="vault_scope", resource_id=scope_id,
            new_id=new_id, now_iso=now_iso,
        )
        return {"wrapped_dek_recovery": scope["wrapped_dek_recovery"]}

    @api.post("/vault/scopes/{scope_id}/items")
    async def add_vault_item(scope_id: str, body: VaultItemIn, user=Depends(get_current_user)):
        scope = await _owned_scope(scope_id, user)
        if scope["status"] != "active":
            raise HTTPException(409, "Scope is pending destruction")
        item_id = new_id()
        await db.vault_items.insert_one({
            "id": item_id,
            "scope_id": scope_id,
            "firm_id": user["firm_id"],
            "label": body.label,
            "envelope": body.envelope,
            "created_at": now_iso(),
        })
        return {"id": item_id}

    @api.get("/vault/scopes/{scope_id}/items")
    async def list_vault_items(scope_id: str, user=Depends(get_current_user)):
        await _owned_scope(scope_id, user)
        rows = await db.vault_items.find(
            {"scope_id": scope_id, "firm_id": user["firm_id"]}, {"_id": 0, "envelope": 0}
        ).sort("created_at", -1).to_list(500)
        return {"items": rows}

    @api.get("/vault/scopes/{scope_id}/items/{item_id}")
    async def get_vault_item(scope_id: str, item_id: str, user=Depends(get_current_user)):
        await _owned_scope(scope_id, user)
        item = await db.vault_items.find_one({"id": item_id, "scope_id": scope_id, "firm_id": user["firm_id"]}, {"_id": 0})
        if not item:
            raise HTTPException(404, "Vault item not found")
        return item

    @api.delete("/vault/scopes/{scope_id}/items/{item_id}")
    async def delete_vault_item(scope_id: str, item_id: str, user=Depends(get_current_user)):
        await _owned_scope(scope_id, user)
        res = await db.vault_items.delete_one({"id": item_id, "scope_id": scope_id, "firm_id": user["firm_id"]})
        if res.deleted_count == 0:
            raise HTTPException(404, "Vault item not found")
        return {"ok": True}

    @api.post("/vault/scopes/{scope_id}/destroy")
    async def destroy_vault_scope(scope_id: str, body: VaultUnlockIn, user=Depends(get_current_user)):
        """
        Manual, deliberate destruction — the replacement for destroy-on-N
        (dashboard plan §22c's own recommendation). Requires re-auth via
        the same authKey verifier, is audit-logged, and gives a 24h undo
        window rather than deleting immediately.
        """
        scope = await _owned_scope(scope_id, user)
        if not bcrypt.checkpw(body.auth_key_b64.encode(), scope["auth_key_hash"].encode()):
            await log_audit(
                db, firm_id=user["firm_id"], actor_id=user["id"], actor_name=user["name"],
                action="vault_scope.destroy_denied", resource_type="vault_scope", resource_id=scope_id,
                outcome="failure", new_id=new_id, now_iso=now_iso,
            )
            raise HTTPException(401, "Incorrect passphrase verifier — destroy requires re-authentication")
        await db.vault_scopes.update_one(
            {"id": scope_id}, {"$set": {"status": "pending_destroy", "deleted_at": time.time(), "updated_at": now_iso()}}
        )
        await log_audit(
            db, firm_id=user["firm_id"], actor_id=user["id"], actor_name=user["name"],
            action="vault_scope.destroy_requested", resource_type="vault_scope", resource_id=scope_id,
            detail={"undo_window_seconds": destroy_undo_window_seconds}, new_id=new_id, now_iso=now_iso,
        )
        return {"status": "pending_destroy", "undo_window_seconds": destroy_undo_window_seconds}

    @api.post("/vault/scopes/{scope_id}/undo-destroy")
    async def undo_destroy_vault_scope(scope_id: str, user=Depends(get_current_user)):
        scope = await _owned_scope(scope_id, user)
        if scope["status"] != "pending_destroy":
            raise HTTPException(409, "Scope is not pending destruction")
        elapsed = time.time() - (scope["deleted_at"] or 0)
        if elapsed > destroy_undo_window_seconds:
            raise HTTPException(410, "Undo window has expired")
        await db.vault_scopes.update_one(
            {"id": scope_id}, {"$set": {"status": "active", "deleted_at": None, "updated_at": now_iso()}}
        )
        await log_audit(
            db, firm_id=user["firm_id"], actor_id=user["id"], actor_name=user["name"],
            action="vault_scope.destroy_undone", resource_type="vault_scope", resource_id=scope_id,
            new_id=new_id, now_iso=now_iso,
        )
        return _public_scope({**scope, "status": "active"})
