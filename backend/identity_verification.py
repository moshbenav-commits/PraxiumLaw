"""
Praxium Suite — identity verification (live face scan + government ID).
Mirrors Expedia Parts /verify-id flow for client/matter intake.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import random
from datetime import datetime, timezone
from typing import Any, Callable, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

POSE_ORDER = ("center", "left", "right")
MAX_BYTES = 10 * 1024 * 1024
ALLOWED_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
}


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def _b64url_decode(raw: str) -> bytes:
    pad = "=" * (-len(raw) % 4)
    return base64.urlsafe_b64decode(raw + pad)


def generate_liveness_challenge() -> dict:
    jitter = 0.85 + random.randint(0, 30) / 100
    return {
        "minMotionScore": round(0.008 * jitter, 4),
        "minDurationMs": 1800 + random.randint(0, 800),
    }


def sign_idv_token(payload: dict, secret: str) -> str:
    data = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode())
    sig = hmac.new(secret.encode(), data.encode(), hashlib.sha256).digest()
    return f"{data}.{_b64url_encode(sig)}"


def verify_idv_token(token: str, secret: str) -> Optional[dict]:
    parts = token.split(".")
    if len(parts) != 2:
        return None
    data, sig = parts
    expected = _b64url_encode(
        hmac.new(secret.encode(), data.encode(), hashlib.sha256).digest()
    )
    if not hmac.compare_digest(sig, expected):
        return None
    try:
        payload = json.loads(_b64url_decode(data))
    except (json.JSONDecodeError, ValueError):
        return None
    if not payload.get("sessionId") or not payload.get("exp"):
        return None
    if datetime.now(timezone.utc).timestamp() * 1000 > float(payload["exp"]):
        return None
    return payload


def is_demo_enabled() -> bool:
    flag = os.environ.get("PRAXIUM_IDV_DEMO_ENABLED", "").strip().lower()
    if flag == "true":
        return True
    if flag == "false":
        return False
    return os.environ.get("VERCEL_ENV") != "production"


def register_identity_verification_routes(
    api: APIRouter,
    db: Any,
    jwt_secret: str,
    get_current_user: Callable,
    new_id: Callable[[], str],
    now_iso: Callable[[], str],
) -> None:
    """Mount /api/identity-verification/* on the shared API router."""

    token_secret = os.environ.get("PRAXIUM_IDV_TOKEN_SECRET", jwt_secret)
    storefront = os.environ.get("PRAXIUM_FRONTEND_URL", "http://localhost:3000").rstrip("/")

    def token_ttl_ms() -> int:
        hours = float(os.environ.get("PRAXIUM_IDV_TOKEN_TTL_HOURS", "168"))
        return int(hours * 3600 * 1000)

    async def load_session(session_id: str) -> dict:
        doc = await db.identity_verification_sessions.find_one({"id": session_id}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Verification session not found or expired")
        return doc

    def build_steps(doc: dict) -> dict:
        selfies = doc.get("selfies") or {}
        return {
            "idDocument": bool(doc.get("id_document")),
            "selfies": {pose: bool(selfies.get(pose)) for pose in POSE_ORDER},
        }

    def assert_file(file: UploadFile, contents: bytes) -> None:
        if not contents:
            raise HTTPException(400, "No file provided")
        if len(contents) > MAX_BYTES:
            raise HTTPException(400, "File too large (10MB max)")
        mime = file.content_type or "application/octet-stream"
        if mime not in ALLOWED_TYPES:
            raise HTTPException(400, "Invalid file type — use JPEG, PNG, or WebP")

    def parse_liveness_meta(raw: Optional[str]) -> Optional[dict]:
        if not raw:
            return None
        try:
            meta = json.loads(raw)
        except json.JSONDecodeError:
            raise HTTPException(400, "Invalid liveness metadata")
        if meta.get("captureMode") not in ("live_camera", "upload"):
            return None
        return meta

    def pose_order_error(pose: str, selfies: dict) -> Optional[str]:
        if pose not in POSE_ORDER:
            return "Invalid pose — use center, left, or right"
        idx = POSE_ORDER.index(pose)
        for prior in POSE_ORDER[:idx]:
            if not selfies.get(prior):
                return f"Complete the {prior} pose first"
        if selfies.get(pose):
            return f"The {pose} pose is already captured"
        return None

    async def create_session(
        *,
        demo: bool = False,
        firm_id: Optional[str] = None,
        matter_id: Optional[str] = None,
        label: Optional[str] = None,
    ) -> dict:
        session_id = new_id()
        order_number = (
            f"DEMO-{session_id[:8].upper()}"
            if demo
            else label or f"PLX-IDV-{session_id[:8].upper()}"
        )
        doc = {
            "id": session_id,
            "demo": demo,
            "firm_id": firm_id,
            "matter_id": matter_id,
            "order_number": order_number,
            "status": "pending",
            "id_document": None,
            "selfies": {},
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        await db.identity_verification_sessions.insert_one(doc)
        exp = int(datetime.now(timezone.utc).timestamp() * 1000) + token_ttl_ms()
        token = sign_idv_token(
            {"sessionId": session_id, "exp": exp, "challenge": generate_liveness_challenge()},
            token_secret,
        )
        return {
            "token": token,
            "verifyUrl": f"{storefront}/verify-identity/{token}",
            "orderNumber": order_number,
            "demo": demo,
        }

    @api.post("/identity-verification/demo/session")
    async def create_demo_session():
        if not is_demo_enabled():
            raise HTTPException(403, "Identity verification demo is disabled")
        return await create_session(demo=True)

    @api.post("/identity-verification/sessions")
    async def create_firm_session(
        matter_id: Optional[str] = Form(None),
        label: Optional[str] = Form(None),
        user=Depends(get_current_user),
    ):
        return await create_session(
            demo=False,
            firm_id=user["firm_id"],
            matter_id=matter_id,
            label=label,
        )

    @api.get("/identity-verification/admin/queue")
    async def admin_queue(user=Depends(get_current_user)):
        items = await db.identity_verification_sessions.find(
            {"firm_id": user["firm_id"], "status": "submitted"},
            {"_id": 0, "id_document.data_b64": 0, "selfies": 0},
        ).sort("submitted_at", -1).to_list(100)
        return {"items": items}

    @api.post("/identity-verification/admin/{session_id}/approve")
    async def admin_approve(session_id: str, user=Depends(get_current_user)):
        doc = await load_session(session_id)
        if doc.get("firm_id") and doc["firm_id"] != user["firm_id"]:
            raise HTTPException(403, "Forbidden")
        await db.identity_verification_sessions.update_one(
            {"id": session_id},
            {"$set": {"status": "verified", "verified_at": now_iso(), "verified_by": user["id"]}},
        )
        return {"status": "verified"}

    @api.post("/identity-verification/admin/{session_id}/reject")
    async def admin_reject(session_id: str, user=Depends(get_current_user)):
        doc = await load_session(session_id)
        if doc.get("firm_id") and doc["firm_id"] != user["firm_id"]:
            raise HTTPException(403, "Forbidden")
        await db.identity_verification_sessions.update_one(
            {"id": session_id},
            {"$set": {"status": "rejected", "rejected_at": now_iso(), "rejected_by": user["id"]}},
        )
        return {"status": "rejected"}

    @api.get("/identity-verification/{token}/bootstrap")
    async def bootstrap(token: str):
        payload = verify_idv_token(token, token_secret)
        if not payload:
            raise HTTPException(400, "Invalid or expired verification link")
        doc = await load_session(payload["sessionId"])
        steps = build_steps(doc)
        return {
            "orderNumber": doc["order_number"],
            "status": doc["status"],
            "reasons": ["demo_session"] if doc.get("demo") else ["client_verification"],
            "billingName": doc.get("billing_name"),
            "steps": steps,
            "canSubmit": steps["idDocument"] and all(steps["selfies"][p] for p in POSE_ORDER),
            "submittedAt": doc.get("submitted_at"),
            "livenessChallenge": payload.get("challenge"),
            "demo": bool(doc.get("demo")),
        }

    @api.post("/identity-verification/{token}/selfie")
    async def upload_selfie(
        token: str,
        file: UploadFile = File(...),
        pose: str = Form(...),
        livenessMeta: Optional[str] = Form(None),
    ):
        payload = verify_idv_token(token, token_secret)
        if not payload:
            raise HTTPException(400, "Invalid or expired verification link")
        doc = await load_session(payload["sessionId"])
        if doc["status"] not in ("pending", "submitted"):
            raise HTTPException(400, "Session is closed")

        pose_key = pose.strip().lower()
        err = pose_order_error(pose_key, doc.get("selfies") or {})
        if err:
            raise HTTPException(400, err)

        meta = parse_liveness_meta(livenessMeta)
        if not meta or meta.get("captureMode") != "live_camera":
            raise HTTPException(400, "Face scan must be captured live from your camera")

        contents = await file.read()
        assert_file(file, contents)

        asset = {
            "mime": file.content_type or "image/jpeg",
            "file_name": file.filename or f"{pose_key}-selfie.jpg",
            "data_b64": base64.b64encode(contents).decode(),
            "liveness_meta": meta,
            "uploaded_at": now_iso(),
        }
        selfies = doc.get("selfies") or {}
        selfies[pose_key] = asset
        await db.identity_verification_sessions.update_one(
            {"id": doc["id"]},
            {"$set": {"selfies": selfies, "updated_at": now_iso()}},
        )
        return {"ok": True, "steps": build_steps({**doc, "selfies": selfies})}

    @api.post("/identity-verification/{token}/id-document")
    async def upload_id_document(
        token: str,
        file: UploadFile = File(...),
        livenessMeta: Optional[str] = Form(None),
    ):
        payload = verify_idv_token(token, token_secret)
        if not payload:
            raise HTTPException(400, "Invalid or expired verification link")
        doc = await load_session(payload["sessionId"])
        if doc["status"] not in ("pending", "submitted"):
            raise HTTPException(400, "Session is closed")

        selfies = doc.get("selfies") or {}
        if not all(selfies.get(p) for p in POSE_ORDER):
            raise HTTPException(400, "Complete all face scan poses before uploading your ID")

        contents = await file.read()
        assert_file(file, contents)

        asset = {
            "mime": file.content_type or "image/jpeg",
            "file_name": file.filename or "government-id.jpg",
            "data_b64": base64.b64encode(contents).decode(),
            "liveness_meta": parse_liveness_meta(livenessMeta),
            "uploaded_at": now_iso(),
        }
        await db.identity_verification_sessions.update_one(
            {"id": doc["id"]},
            {"$set": {"id_document": asset, "updated_at": now_iso()}},
        )
        updated = {**doc, "id_document": asset}
        return {"ok": True, "steps": build_steps(updated)}

    @api.post("/identity-verification/{token}/submit")
    async def submit(token: str):
        payload = verify_idv_token(token, token_secret)
        if not payload:
            raise HTTPException(400, "Invalid or expired verification link")
        doc = await load_session(payload["sessionId"])
        steps = build_steps(doc)
        if not steps["idDocument"] or not all(steps["selfies"][p] for p in POSE_ORDER):
            raise HTTPException(
                400,
                "Complete the live face scan and upload your government ID before submitting",
            )
        await db.identity_verification_sessions.update_one(
            {"id": doc["id"]},
            {"$set": {"status": "submitted", "submitted_at": now_iso(), "updated_at": now_iso()}},
        )
        msg = (
            "Demo complete — face scan and ID received."
            if doc.get("demo")
            else "Thanks — our team will review your ID and face scan."
        )
        return {"status": "submitted", "message": msg}
