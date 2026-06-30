"""NativeSign v1 — in-app signature capture + real PDF merge (no DocuSign required)."""
from __future__ import annotations

import base64
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

from email_util import send_esign_invite_email
from pdf_util import create_blank_pdf, is_pdf, merge_signature_fields, page_count


class SignField(BaseModel):
    id: str = Field(default_factory=lambda: secrets.token_hex(4))
    type: str = "signature"  # signature | date | text
    page: int = 0
    x: float = 0.1
    y: float = 0.75
    w: float = 0.3
    h: float = 0.08
    label: str = ""


class SignRequestCreate(BaseModel):
    title: str
    signer_name: str
    signer_email: EmailStr
    document_title: str = "Agreement"
    document_id: Optional[str] = None
    fields: List[SignField] = Field(default_factory=list)


class SignFieldsPatch(BaseModel):
    fields: List[SignField]


class SignSubmitIn(BaseModel):
    signature_png_b64: str
    signer_name: Optional[str] = None


def _default_fields() -> List[dict]:
    return [
        {
            "id": "sig1",
            "type": "signature",
            "page": 0,
            "x": 0.12,
            "y": 0.78,
            "w": 0.35,
            "h": 0.08,
            "label": "Signature",
        },
        {
            "id": "date1",
            "type": "date",
            "page": 0,
            "x": 0.55,
            "y": 0.78,
            "w": 0.25,
            "h": 0.06,
            "label": "Date",
        },
    ]


async def _load_source_pdf(db: Any, sign_req: dict) -> tuple[bytes, str]:
    doc_id = sign_req.get("document_id")
    if doc_id:
        doc = await db.documents.find_one({"id": doc_id, "firm_id": sign_req["firm_id"]})
        if not doc or not doc.get("data_b64"):
            raise HTTPException(404, "Source document not found")
        if not is_pdf(doc.get("content_type"), doc.get("name", "")):
            raise HTTPException(400, "Sign request document must be a PDF")
        return base64.b64decode(doc["data_b64"]), doc.get("name") or "document.pdf"
    title = sign_req.get("document_title") or sign_req.get("title") or "Document"
    blank = create_blank_pdf(
        title,
        [
            "Please review the terms of this agreement.",
            "By signing below you acknowledge receipt and acceptance.",
            "",
            f"Signer: {sign_req.get('signer_name', '')}",
        ],
    )
    return blank, f"{title[:40]}.pdf"


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
    read_guard = require_permission("matters.read", get_current_user)

    async def _get_sign_request_by_token(token: str, include_sensitive: bool = False):
        projection = {"_id": 0}
        if not include_sensitive:
            projection["signature_png_b64"] = 0
            projection["signed_pdf_b64"] = 0
        req = await db.sign_requests.find_one({"token": token}, projection)
        if not req:
            raise HTTPException(404, "Invalid sign link")
        if datetime.fromisoformat(req["expires_at"]) < datetime.now(timezone.utc):
            raise HTTPException(410, "Sign link expired")
        return req

    async def _matter_label(matter_id: str, firm_id: str) -> str:
        matter = await db.matters.find_one({"id": matter_id, "firm_id": firm_id}, {"_id": 0, "case_number": 1, "title": 1})
        if not matter:
            return matter_id
        return matter.get("case_number") or matter.get("title") or matter_id

    async def _send_sign_invite(
        sign_req: dict,
        *,
        actor_id: str,
        actor_name: str,
        resend: bool = False,
    ) -> bool:
        firm = await db.firms.find_one({"id": sign_req["firm_id"]}, {"_id": 0, "name": 1})
        firm_name = (firm or {}).get("name") or "Your firm"
        matter_label = await _matter_label(sign_req["matter_id"], sign_req["firm_id"])
        expires_date = sign_req["expires_at"][:10]
        sent = send_esign_invite_email(
            sign_req["signer_email"],
            sign_req["sign_url"],
            firm_name=firm_name,
            document_title=sign_req.get("document_title") or sign_req.get("title") or "Document",
            matter_label=matter_label,
            signer_name=sign_req.get("signer_name") or "",
            expires_date=expires_date,
        )
        await log_audit(
            db,
            firm_id=sign_req["firm_id"],
            actor_id=actor_id,
            actor_name=actor_name,
            action="esign.invite_sent",
            resource_type="sign_request",
            resource_id=sign_req["id"],
            detail={
                "matter_id": sign_req["matter_id"],
                "email_sent": sent,
                "signer_email": sign_req.get("signer_email"),
                "resend": resend,
            },
            new_id=new_id,
            now_iso=now_iso,
        )
        return sent

    @api.get("/sign-requests")
    async def list_sign_requests(
        matter_id: Optional[str] = None,
        user=Depends(get_current_user),
    ):
        q: dict = {"firm_id": user["firm_id"]}
        if matter_id:
            q["matter_id"] = matter_id
        items = await db.sign_requests.find(q, {"_id": 0, "signed_pdf_b64": 0, "signature_png_b64": 0}).sort(
            "created_at", -1
        ).to_list(200)
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
        fields = [f.model_dump() for f in body.fields] if body.fields else _default_fields()
        if body.document_id:
            src = await db.documents.find_one(
                {"id": body.document_id, "firm_id": user["firm_id"], "matter_id": matter_id},
            )
            if not src:
                raise HTTPException(404, "Document not found on this matter")
            if not is_pdf(src.get("content_type"), src.get("name", "")):
                raise HTTPException(400, "Only PDF documents can be sent for signature")
        token = secrets.token_urlsafe(24)
        expires_at = (datetime.now(timezone.utc) + timedelta(days=link_ttl_days)).isoformat()
        sign_url = f"{frontend_url}/sign/{token}"
        doc = {
            "id": new_id(),
            "firm_id": user["firm_id"],
            "matter_id": matter_id,
            "title": body.title.strip(),
            "document_title": body.document_title.strip(),
            "document_id": body.document_id,
            "fields": fields,
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
        sent = await _send_sign_invite(doc, actor_id=user["id"], actor_name=user["name"])
        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user["name"],
            action="esign.request_created",
            resource_type="sign_request",
            resource_id=doc["id"],
            detail={"matter_id": matter_id, "email_sent": sent, "document_id": body.document_id},
            new_id=new_id,
            now_iso=now_iso,
        )
        doc.pop("_id", None)
        out = {"sign_request": doc, "email_sent": sent}
        if os.environ.get("PRAXIUM_PORTAL_DEV_RETURN_LINK", "").lower() in ("1", "true", "yes"):
            out["dev_sign_url"] = sign_url
        return out

    @api.post("/sign-requests/{sign_id}/resend")
    async def resend_sign_invite(sign_id: str, user=Depends(write_guard)):
        req = await db.sign_requests.find_one(
            {"id": sign_id, "firm_id": user["firm_id"]},
            {"_id": 0},
        )
        if not req:
            raise HTTPException(404, "Sign request not found")
        if req.get("status") != "pending":
            raise HTTPException(400, "Only pending sign requests can be resent")
        if datetime.fromisoformat(req["expires_at"]) < datetime.now(timezone.utc):
            raise HTTPException(410, "Sign link expired — create a new request")
        sent = await _send_sign_invite(req, actor_id=user["id"], actor_name=user["name"], resend=True)
        out = {"ok": True, "email_sent": sent}
        if os.environ.get("PRAXIUM_PORTAL_DEV_RETURN_LINK", "").lower() in ("1", "true", "yes"):
            out["dev_sign_url"] = req.get("sign_url")
        return out

    @api.patch("/sign-requests/{sign_id}/fields")
    async def patch_sign_fields(sign_id: str, body: SignFieldsPatch, user=Depends(write_guard)):
        fields = [f.model_dump() for f in body.fields]
        res = await db.sign_requests.update_one(
            {"id": sign_id, "firm_id": user["firm_id"], "status": "pending"},
            {"$set": {"fields": fields}},
        )
        if res.matched_count == 0:
            raise HTTPException(404, "Sign request not found or already signed")
        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user["name"],
            action="esign.fields_updated",
            resource_type="sign_request",
            resource_id=sign_id,
            detail={"field_count": len(fields)},
            new_id=new_id,
            now_iso=now_iso,
        )
        req = await db.sign_requests.find_one(
            {"id": sign_id},
            {"_id": 0, "signed_pdf_b64": 0, "signature_png_b64": 0},
        )
        return {"sign_request": req}

    @api.get("/sign-requests/{sign_id}/signed-pdf")
    async def download_signed_pdf_staff(sign_id: str, request: Request, user=Depends(read_guard)):
        req = await db.sign_requests.find_one({"id": sign_id, "firm_id": user["firm_id"]})
        if not req or req.get("status") != "signed" or not req.get("signed_pdf_b64"):
            raise HTTPException(404, "Signed PDF not available")
        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user["name"],
            action="esign.signed_pdf_downloaded",
            resource_type="sign_request",
            resource_id=sign_id,
            detail={"matter_id": req.get("matter_id")},
            new_id=new_id,
            now_iso=now_iso,
            request=request,
        )
        name = (req.get("document_title") or "signed").replace(" ", "_") + "_signed.pdf"
        return {
            "name": name,
            "content_type": "application/pdf",
            "data_b64": req["signed_pdf_b64"],
        }

    @api.get("/sign/{token}/info")
    async def sign_token_info(token: str):
        req = await _get_sign_request_by_token(token)
        matter = await db.matters.find_one(
            {"id": req["matter_id"]},
            {"_id": 0, "title": 1, "case_number": 1},
        )
        page_total = None
        if req.get("document_id"):
            src = await db.documents.find_one({"id": req["document_id"]}, {"_id": 0, "page_count": 1, "name": 1})
            page_total = (src or {}).get("page_count")
        return {
            "title": req["title"],
            "document_title": req["document_title"],
            "signer_name": req["signer_name"],
            "status": req["status"],
            "expires_at": req["expires_at"],
            "matter": matter,
            "has_document": bool(req.get("document_id")),
            "document_name": req.get("document_title"),
            "page_count": page_total,
            "fields": req.get("fields") or _default_fields(),
        }

    @api.get("/sign/{token}/document")
    async def sign_token_document(token: str, request: Request):
        req = await db.sign_requests.find_one({"token": token})
        if not req:
            raise HTTPException(404, "Invalid sign link")
        if datetime.fromisoformat(req["expires_at"]) < datetime.now(timezone.utc):
            raise HTTPException(410, "Sign link expired")
        pdf_bytes, filename = await _load_source_pdf(db, req)
        await log_audit(
            db,
            firm_id=req["firm_id"],
            actor_id="_sign_link",
            actor_name=req.get("signer_name") or "Signer",
            action="esign.document_viewed",
            resource_type="sign_request",
            resource_id=req["id"],
            detail={"matter_id": req.get("matter_id"), "token": token[:8] + "…"},
            new_id=new_id,
            now_iso=now_iso,
            request=request,
        )
        return {
            "name": filename,
            "content_type": "application/pdf",
            "data_b64": base64.b64encode(pdf_bytes).decode(),
            "page_count": page_count(pdf_bytes),
        }

    @api.get("/sign/{token}/signed-pdf")
    async def sign_token_signed_pdf(token: str):
        req = await db.sign_requests.find_one({"token": token})
        if not req:
            raise HTTPException(404, "Invalid sign link")
        if req.get("status") != "signed" or not req.get("signed_pdf_b64"):
            raise HTTPException(404, "Signed PDF not ready")
        name = (req.get("document_title") or "signed").replace(" ", "_") + "_signed.pdf"
        return {
            "name": name,
            "content_type": "application/pdf",
            "data_b64": req["signed_pdf_b64"],
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
        source_pdf, _ = await _load_source_pdf(db, req)
        fields = req.get("fields") or _default_fields()
        signed_bytes = merge_signature_fields(
            source_pdf,
            body.signature_png_b64.strip(),
            fields,
            signer,
            signed_at,
        )
        pdf_b64 = base64.b64encode(signed_bytes).decode()
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
        signed_doc = {
            "id": new_id(),
            "firm_id": req["firm_id"],
            "matter_id": req["matter_id"],
            "name": f"{req.get('document_title', 'Document')}_signed.pdf",
            "folder": "Signed",
            "content_type": "application/pdf",
            "size_bytes": len(signed_bytes),
            "data_b64": pdf_b64,
            "uploaded_by": "_nativesign",
            "uploaded_by_name": signer,
            "uploaded_at": signed_at,
            "version": 1,
            "client_visible": True,
            "source_sign_request_id": req["id"],
        }
        await db.documents.insert_one(signed_doc)
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
            detail={"matter_id": req["matter_id"], "signed_document_id": signed_doc["id"]},
            new_id=new_id,
            now_iso=now_iso,
            request=request,
        )
        from outgoing_webhooks import emit_webhook_event

        await emit_webhook_event(
            db,
            firm_id=req["firm_id"],
            event_type="signature.completed",
            data={
                "sign_request_id": req["id"],
                "matter_id": req["matter_id"],
                "signed_document_id": signed_doc["id"],
                "signer_email": req.get("signer_email"),
                "signed_at": signed_at,
            },
            new_id=new_id,
            now_iso=now_iso,
        )
        return {"ok": True, "signed_at": signed_at, "download_available": True}

    @api.get("/integrations/docusign/status")
    async def docusign_integration_status(user=Depends(get_current_user)):
        from docusign_bridge import DocuSignBridge

        bridge = DocuSignBridge()
        return {
            "provider": "docusign",
            "available": bridge.is_available(),
            "primary": "nativesign",
            "message": "NativeSign in-app signing is primary; DocuSign OAuth ships in v2.",
        }
