"""NativeSign v1 — in-app signature capture + signed PDF stub (no DocuSign)."""
from __future__ import annotations

import base64
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr

from email_util import send_transactional_email


class SignRequestCreate(BaseModel):
    title: str
    signer_name: str
    signer_email: EmailStr
    document_title: str = "Agreement"


class SignSubmitIn(BaseModel):
    signature_png_b64: str
    signer_name: Optional[str] = None


def _pdf_stub(title: str, signer_name: str, signed_at: str) -> str:
    """Minimal PDF bytes as base64 — placeholder until full PDF merge ships."""
    # Single-page PDF with title + signer + timestamp (ASCII-safe stub)
    content = (
        f"%PDF-1.4\n"
        f"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        f"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
        f"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R"
        f"/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n"
        f"4 0 obj<</Length 200>>stream\n"
        f"BT /F1 14 Tf 72 720 Td ({title[:60]}) Tj 0 -24 Td (Signed by: {signer_name[:40]}) Tj "
        f"0 -24 Td (At: {signed_at[:30]}) Tj ET\n"
        f"endstream endobj\n"
        f"5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n"
        f"xref\n0 6\n0000000000 65535 f \n"
        f"trailer<</Size 6/Root 1 0 R>>\nstartxref\n0\n%%EOF"
    )
    return base64.b64encode(content.encode("latin-1", errors="replace")).decode()


def register_esign_routes(
    api: APIRouter,
    db: Any,
    get_current_user: Callable,
    require_permission: Callable,
    new_id: Callable[[], str],
    now_iso: Callable[[], str],
    log_audit: Callable,
) -> None:
    frontend_url = os.environ.get("PRAXIUM_FRONTEND_URL", "http://localhost:3000").rstrip("/")
    link_ttl_days = int(os.environ.get("PRAXIUM_SIGN_LINK_TTL_DAYS", "14"))
    write_guard = require_permission("matters.write", get_current_user)

    @api.get("/sign-requests")
    async def list_sign_requests(
        matter_id: Optional[str] = None,
        user=Depends(get_current_user),
    ):
        q: dict = {"firm_id": user["firm_id"]}
        if matter_id:
            q["matter_id"] = matter_id
        items = await db.sign_requests.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
        return {"items": items}

    @api.post("/matters/{matter_id}/sign-requests")
    async def create_sign_request(
        matter_id: str,
        body: SignRequestCreate,
        user=Depends(write_guard),
    ):
        matter = await db.matters.find_one({"id": matter_id, "firm_id": user["firm_id"]})
        if not matter:
            raise HTTPException(404, "Matter not found")
        token = secrets.token_urlsafe(24)
        expires_at = (datetime.now(timezone.utc) + timedelta(days=link_ttl_days)).isoformat()
        sign_url = f"{frontend_url}/sign/{token}"
        doc = {
            "id": new_id(),
            "firm_id": user["firm_id"],
            "matter_id": matter_id,
            "title": body.title.strip(),
            "document_title": body.document_title.strip(),
            "signer_name": body.signer_name.strip(),
            "signer_email": body.signer_email.lower(),
            "token": token,
            "status": "pending",
            "sign_url": sign_url,
            "expires_at": expires_at,
            "signature_png_b64": None,
            "signed_pdf_b64": None,
            "signed_at": None,
            "signed_ip": None,
            "created_by": user["id"],
            "created_at": now_iso(),
        }
        await db.sign_requests.insert_one(doc)
        firm = await db.firms.find_one({"id": user["firm_id"]}, {"_id": 0, "name": 1})
        firm_name = (firm or {}).get("name") or "Your firm"
        matter_label = matter.get("case_number") or matter.get("title") or matter_id
        sent = send_transactional_email(
            doc["signer_email"],
            f"{firm_name} — signature requested: {doc['title']}",
            (
                f"Please sign \"{doc['document_title']}\" for matter {matter_label}.\n\n"
                f"Open this link to sign (no account required):\n{sign_url}\n\n"
                f"Link expires {expires_at[:10]}."
            ),
            html=(
                f"<p>Please sign <strong>{doc['document_title']}</strong> "
                f"for matter <strong>{matter_label}</strong>.</p>"
                f'<p><a href="{sign_url}">Review and sign</a></p>'
            ),
        )
        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user["name"],
            action="esign.request_created",
            resource_type="sign_request",
            resource_id=doc["id"],
            detail={"matter_id": matter_id, "email_sent": sent},
            new_id=new_id,
            now_iso=now_iso,
        )
        doc.pop("_id", None)
        out = {"sign_request": doc}
        if os.environ.get("PRAXIUM_PORTAL_DEV_RETURN_LINK", "").lower() in ("1", "true", "yes"):
            out["dev_sign_url"] = sign_url
        return out

    @api.get("/sign/{token}/info")
    async def sign_token_info(token: str):
        req = await db.sign_requests.find_one({"token": token}, {"_id": 0, "signature_png_b64": 0, "signed_pdf_b64": 0})
        if not req:
            raise HTTPException(404, "Invalid sign link")
        if datetime.fromisoformat(req["expires_at"]) < datetime.now(timezone.utc):
            raise HTTPException(410, "Sign link expired")
        matter = await db.matters.find_one(
            {"id": req["matter_id"]},
            {"_id": 0, "title": 1, "case_number": 1},
        )
        return {
            "title": req["title"],
            "document_title": req["document_title"],
            "signer_name": req["signer_name"],
            "status": req["status"],
            "expires_at": req["expires_at"],
            "matter": matter,
        }

    @api.post("/sign/{token}")
    async def submit_signature(token: str, body: SignSubmitIn, request: Request):
        req = await db.sign_requests.find_one({"token": token})
        if not req:
            raise HTTPException(404, "Invalid sign link")
        if req.get("status") == "signed":
            raise HTTPException(400, "Already signed")
        if datetime.fromisoformat(req["expires_at"]) < datetime.now(timezone.utc):
            raise HTTPException(410, "Sign link expired")
        if not body.signature_png_b64.strip():
            raise HTTPException(400, "Signature required")

        signed_at = now_iso()
        signer = (body.signer_name or req.get("signer_name") or "Signer").strip()
        pdf_b64 = _pdf_stub(req.get("document_title") or req.get("title") or "Document", signer, signed_at)
        client_ip = request.client.host if request.client else None

        await db.sign_requests.update_one(
            {"id": req["id"]},
            {
                "$set": {
                    "status": "signed",
                    "signature_png_b64": body.signature_png_b64.strip(),
                    "signed_pdf_b64": pdf_b64,
                    "signed_at": signed_at,
                    "signed_ip": client_ip,
                    "signer_name": signer,
                }
            },
        )
        await db.activities.insert_one({
            "id": new_id(),
            "firm_id": req["firm_id"],
            "matter_id": req["matter_id"],
            "actor_id": "_sign_link",
            "actor_name": signer,
            "type": "document_signed",
            "description": f"Signed via NativeSign: {req.get('title')}",
            "created_at": signed_at,
        })
        await log_audit(
            db,
            firm_id=req["firm_id"],
            actor_id="_sign_link",
            actor_name=signer,
            action="esign.signed",
            resource_type="sign_request",
            resource_id=req["id"],
            detail={"matter_id": req["matter_id"]},
            new_id=new_id,
            now_iso=now_iso,
            request=request,
        )
        return {"ok": True, "signed_at": signed_at}
