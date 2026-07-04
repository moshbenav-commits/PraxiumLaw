"""
Praxium Suite — client portal (Filevine-style) + magic-link upload.

Magic-link auth for clients (no passwords). Portal JWT scopes all routes to contact + enabled matters.
"""
from __future__ import annotations

import base64
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, List, Optional

import jwt as pyjwt
from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Request, UploadFile
from pydantic import BaseModel, EmailStr

from email_util import send_portal_invite_email, send_portal_login_email


class PortalRequestLinkIn(BaseModel):
    email: EmailStr


class PortalVerifyIn(BaseModel):
    token: str


class PortalMessageIn(BaseModel):
    matter_id: str
    content: str


class MatterPortalPatch(BaseModel):
    portal_enabled: Optional[bool] = None
    send_invite: bool = False


class DocumentVisibilityPatch(BaseModel):
    client_visible: bool


class TaskClientVisiblePatch(BaseModel):
    client_visible: bool


def make_portal_token(
    jwt_secret: str,
    contact_id: str,
    firm_id: str,
    matter_ids: List[str],
    email: str,
    *,
    days: int = 7,
) -> str:
    payload = {
        "sub": contact_id,
        "firm": firm_id,
        "role": "client",
        "email": email.lower(),
        "matter_ids": matter_ids,
        "exp": datetime.now(timezone.utc) + timedelta(days=days),
        "iat": datetime.now(timezone.utc),
    }
    return pyjwt.encode(payload, jwt_secret, algorithm="HS256")


def decode_portal_token(jwt_secret: str, token: str) -> dict:
    payload = pyjwt.decode(token, jwt_secret, algorithms=["HS256"])
    if payload.get("role") != "client":
        raise HTTPException(401, "Not a portal session")
    return payload


async def _contact_portal_matters(db: Any, contact: dict) -> List[dict]:
    """Matters where this contact is client and portal is enabled."""
    fid = contact["firm_id"]
    cid = contact["id"]
    q = {
        "firm_id": fid,
        "portal_enabled": True,
        "$or": [{"client_id": cid}, {"client_contact_id": cid}],
    }
    return await db.matters.find(q, {"_id": 0}).sort("updated_at", -1).to_list(100)


def register_portal_routes(
    api: APIRouter,
    db: Any,
    jwt_secret: str,
    get_current_user: Callable,
    require_permission: Callable,
    new_id: Callable[[], str],
    now_iso: Callable[[], str],
    log_audit: Callable,
) -> None:
    frontend_url = os.environ.get("PRAXIUM_FRONTEND_URL", "http://localhost:3000").rstrip("/")
    portal_link_ttl_hours = float(os.environ.get("PRAXIUM_PORTAL_LINK_TTL_HOURS", "24"))
    portal_session_days = int(os.environ.get("PRAXIUM_PORTAL_SESSION_DAYS", "7"))

    async def get_current_portal_client(authorization: Optional[str] = Header(None)) -> dict:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(401, "Missing portal token")
        raw = authorization.replace("Bearer ", "")
        try:
            payload = decode_portal_token(jwt_secret, raw)
        except Exception:
            raise HTTPException(401, "Invalid or expired portal session")
        contact = await db.contacts.find_one(
            {"id": payload["sub"], "firm_id": payload["firm"]},
            {"_id": 0},
        )
        if not contact:
            raise HTTPException(401, "Contact not found")
        matters = await _contact_portal_matters(db, contact)
        matter_ids = [m["id"] for m in matters]
        if not matter_ids:
            raise HTTPException(403, "No portal access")
        return {
            "contact": contact,
            "firm_id": payload["firm"],
            "matter_ids": matter_ids,
            "email": payload.get("email") or contact.get("email"),
        }

    def _assert_matter_access(portal: dict, matter_id: str) -> None:
        if matter_id not in portal["matter_ids"]:
            raise HTTPException(403, "Matter not in your portal")

    # ── Public portal auth ──

    @api.post("/portal/request-link")
    async def portal_request_link(body: PortalRequestLinkIn, request: Request):
        email = body.email.lower()
        contacts = await db.contacts.find(
            {"email": email, "kind": "client"},
            {"_id": 0},
        ).to_list(20)
        eligible = []
        for c in contacts:
            matters = await _contact_portal_matters(db, c)
            if matters:
                eligible.append((c, matters))
        if not eligible:
            # Do not reveal whether email exists
            return {"ok": True, "message": "If portal access exists for this email, a link was sent."}

        # Use first firm/contact with portal matters (v1 — one link per email batch)
        contact, matters = eligible[0]
        token = secrets.token_urlsafe(32)
        expires_at = (datetime.now(timezone.utc) + timedelta(hours=portal_link_ttl_hours)).isoformat()
        link_doc = {
            "id": new_id(),
            "kind": "portal_login",
            "token": token,
            "contact_id": contact["id"],
            "firm_id": contact["firm_id"],
            "email": email,
            "matter_ids": [m["id"] for m in matters],
            "expires_at": expires_at,
            "used_at": None,
            "created_at": now_iso(),
        }
        await db.portal_magic_links.insert_one(link_doc)
        verify_url = f"{frontend_url}/portal/verify?token={token}"
        firm = await db.firms.find_one({"id": contact["firm_id"]}, {"_id": 0, "name": 1})
        firm_name = (firm or {}).get("name") or "Your firm"
        send_portal_login_email(email, verify_url, firm_name=firm_name)

        await log_audit(
            db,
            firm_id=contact["firm_id"],
            actor_id=contact["id"],
            actor_name=contact.get("name", "Client"),
            actor_email=email,
            action="portal.link_requested",
            resource_type="contact",
            resource_id=contact["id"],
            detail={"matter_count": len(matters)},
            new_id=new_id,
            now_iso=now_iso,
            request=request,
        )

        resp = {"ok": True, "message": "If portal access exists for this email, a link was sent."}
        if os.environ.get("PRAXIUM_PORTAL_DEV_RETURN_LINK", "").lower() in ("1", "true", "yes"):
            resp["dev_verify_url"] = verify_url
        return resp

    @api.post("/portal/verify")
    async def portal_verify(body: PortalVerifyIn, request: Request):
        link = await db.portal_magic_links.find_one(
            {"token": body.token, "kind": "portal_login", "used_at": None},
        )
        if not link:
            raise HTTPException(400, "Invalid or expired link")
        if datetime.fromisoformat(link["expires_at"]) < datetime.now(timezone.utc):
            raise HTTPException(400, "Link expired")
        contact = await db.contacts.find_one({"id": link["contact_id"]}, {"_id": 0})
        if not contact:
            raise HTTPException(400, "Contact not found")
        matters = await _contact_portal_matters(db, contact)
        matter_ids = [m["id"] for m in matters]
        if not matter_ids:
            raise HTTPException(403, "Portal access disabled")

        await db.portal_magic_links.update_one(
            {"id": link["id"]},
            {"$set": {"used_at": now_iso()}},
        )
        session_token = make_portal_token(
            jwt_secret,
            contact["id"],
            contact["firm_id"],
            matter_ids,
            contact.get("email") or link.get("email", ""),
            days=portal_session_days,
        )
        firm = await db.firms.find_one({"id": contact["firm_id"]}, {"_id": 0, "name": 1, "id": 1})
        await log_audit(
            db,
            firm_id=contact["firm_id"],
            actor_id=contact["id"],
            actor_name=contact.get("name", "Client"),
            actor_email=contact.get("email"),
            action="portal.login.success",
            resource_type="contact",
            resource_id=contact["id"],
            new_id=new_id,
            now_iso=now_iso,
            request=request,
        )
        return {
            "token": session_token,
            "contact": {
                "id": contact["id"],
                "name": contact.get("name"),
                "email": contact.get("email"),
            },
            "firm": firm,
            "matter_ids": matter_ids,
        }

    # ── Portal client routes ──

    @api.get("/portal/me")
    async def portal_me(portal=Depends(get_current_portal_client)):
        firm = await db.firms.find_one({"id": portal["firm_id"]}, {"_id": 0, "name": 1, "id": 1})
        return {
            "contact": portal["contact"],
            "firm": firm,
            "matter_ids": portal["matter_ids"],
        }

    @api.get("/portal/matters")
    async def portal_list_matters(portal=Depends(get_current_portal_client)):
        items = await db.matters.find(
            {"id": {"$in": portal["matter_ids"]}, "firm_id": portal["firm_id"]},
            {"_id": 0},
        ).sort("updated_at", -1).to_list(100)
        return {"items": items}

    @api.get("/portal/matters/{matter_id}")
    async def portal_get_matter(matter_id: str, portal=Depends(get_current_portal_client)):
        _assert_matter_access(portal, matter_id)
        m = await db.matters.find_one(
            {"id": matter_id, "firm_id": portal["firm_id"]},
            {"_id": 0},
        )
        if not m:
            raise HTTPException(404)
        return m

    @api.get("/portal/matters/{matter_id}/activities")
    async def portal_activities(matter_id: str, portal=Depends(get_current_portal_client)):
        _assert_matter_access(portal, matter_id)
        # Client-safe activity types only
        safe_types = {
            "matter_created",
            "document_uploaded",
            "portal_message",
            "status_changed",
        }
        items = await db.activities.find(
            {
                "firm_id": portal["firm_id"],
                "matter_id": matter_id,
                "type": {"$in": list(safe_types)},
            },
            {"_id": 0},
        ).sort("created_at", -1).to_list(100)
        return {"items": items}

    @api.get("/portal/matters/{matter_id}/documents")
    async def portal_documents(matter_id: str, portal=Depends(get_current_portal_client)):
        _assert_matter_access(portal, matter_id)
        items = await db.documents.find(
            {
                "firm_id": portal["firm_id"],
                "matter_id": matter_id,
                "client_visible": True,
            },
            {"_id": 0, "data_b64": 0},
        ).sort("uploaded_at", -1).to_list(200)
        return {"items": items}

    @api.get("/portal/documents/{doc_id}/download")
    async def portal_download_document(doc_id: str, portal=Depends(get_current_portal_client)):
        d = await db.documents.find_one(
            {
                "id": doc_id,
                "firm_id": portal["firm_id"],
                "client_visible": True,
                "matter_id": {"$in": portal["matter_ids"]},
            },
        )
        if not d:
            raise HTTPException(404)
        await log_audit(
            db,
            firm_id=portal["firm_id"],
            actor_id=portal["contact"]["id"],
            actor_name=portal["contact"].get("name", "Client"),
            actor_email=portal.get("email"),
            action="portal.document.downloaded",
            resource_type="document",
            resource_id=doc_id,
            detail={"name": d.get("name"), "matter_id": d.get("matter_id")},
            new_id=new_id,
            now_iso=now_iso,
        )
        return {"name": d["name"], "content_type": d["content_type"], "data_b64": d["data_b64"]}

    @api.get("/portal/matters/{matter_id}/tasks")
    async def portal_tasks(matter_id: str, portal=Depends(get_current_portal_client)):
        _assert_matter_access(portal, matter_id)
        items = await db.tasks.find(
            {
                "firm_id": portal["firm_id"],
                "matter_id": matter_id,
                "client_visible": True,
            },
            {"_id": 0},
        ).sort("due_date", 1).to_list(100)
        return {"items": items}

    @api.get("/portal/matters/{matter_id}/sign-requests")
    async def portal_pending_sign_requests(matter_id: str, portal=Depends(get_current_portal_client)):
        """Pending NativeSign envelopes for this client email on the matter."""
        _assert_matter_access(portal, matter_id)
        email = (portal.get("email") or portal["contact"].get("email") or "").lower()
        if not email:
            return {"items": []}
        now = datetime.now(timezone.utc).isoformat()
        items = await db.sign_requests.find(
            {
                "firm_id": portal["firm_id"],
                "matter_id": matter_id,
                "status": "pending",
                "signer_email": email,
                "expires_at": {"$gt": now},
            },
            {"_id": 0, "signed_pdf_b64": 0, "signature_png_b64": 0},
        ).sort("created_at", -1).to_list(20)
        frontend_url = os.environ.get("PRAXIUM_FRONTEND_URL", "http://localhost:3000").rstrip("/")
        sanitized = []
        for item in items:
            sign_url = item.get("sign_url") or f"{frontend_url}/sign/{item.get('token', '')}"
            sanitized.append({
                "id": item.get("id"),
                "title": item.get("title"),
                "document_title": item.get("document_title"),
                "status": item.get("status"),
                "expires_at": item.get("expires_at"),
                "sign_url": sign_url,
                "created_at": item.get("created_at"),
            })
        return {"items": sanitized}

    @api.get("/portal/messages")
    async def portal_list_messages(matter_id: Optional[str] = None, portal=Depends(get_current_portal_client)):
        q = {
            "firm_id": portal["firm_id"],
            "matter_id": {"$in": portal["matter_ids"]},
        }
        if matter_id:
            _assert_matter_access(portal, matter_id)
            q["matter_id"] = matter_id
        items = await db.portal_messages.find(q, {"_id": 0}).sort("created_at", 1).to_list(500)
        return {"items": items}

    @api.post("/portal/messages")
    async def portal_post_message(body: PortalMessageIn, portal=Depends(get_current_portal_client)):
        _assert_matter_access(portal, body.matter_id)
        if not body.content.strip():
            raise HTTPException(400, "Message required")
        doc = {
            "id": new_id(),
            "firm_id": portal["firm_id"],
            "matter_id": body.matter_id,
            "content": body.content.strip(),
            "author_kind": "client",
            "author_id": portal["contact"]["id"],
            "author_name": portal["contact"].get("name", "Client"),
            "read_by_staff": False,
            "created_at": now_iso(),
        }
        await db.portal_messages.insert_one(doc)
        await db.activities.insert_one({
            "id": new_id(),
            "firm_id": portal["firm_id"],
            "matter_id": body.matter_id,
            "actor_id": portal["contact"]["id"],
            "actor_name": portal["contact"].get("name", "Client"),
            "type": "portal_message",
            "description": "Client sent a message",
            "created_at": now_iso(),
        })
        doc.pop("_id", None)
        return doc

    # ── Staff portal management ──

    write_guard = require_permission("matters.write", get_current_user)

    @api.patch("/matters/{matter_id}/portal")
    async def patch_matter_portal(
        matter_id: str,
        body: MatterPortalPatch,
        user=Depends(write_guard),
    ):
        m = await db.matters.find_one({"id": matter_id, "firm_id": user["firm_id"]})
        if not m:
            raise HTTPException(404, "Matter not found")
        updates = {}
        if body.portal_enabled is not None:
            updates["portal_enabled"] = body.portal_enabled
        if updates:
            updates["updated_at"] = now_iso()
            await db.matters.update_one({"id": matter_id}, {"$set": updates})

        invite_url = None
        if body.send_invite:
            client_id = m.get("client_id") or m.get("client_contact_id")
            if not client_id:
                raise HTTPException(400, "Link a client contact before sending portal invite")
            contact = await db.contacts.find_one({"id": client_id, "firm_id": user["firm_id"]})
            if not contact or not contact.get("email"):
                raise HTTPException(400, "Client contact needs an email for portal invite")
            await db.matters.update_one(
                {"id": matter_id},
                {"$set": {"portal_enabled": True, "updated_at": now_iso()}},
            )
            token = secrets.token_urlsafe(32)
            expires_at = (datetime.now(timezone.utc) + timedelta(hours=portal_link_ttl_hours)).isoformat()
            await db.portal_magic_links.insert_one({
                "id": new_id(),
                "kind": "portal_login",
                "token": token,
                "contact_id": contact["id"],
                "firm_id": user["firm_id"],
                "email": contact["email"].lower(),
                "matter_ids": [matter_id],
                "expires_at": expires_at,
                "used_at": None,
                "created_at": now_iso(),
                "invited_by": user["id"],
            })
            invite_url = f"{frontend_url}/portal/verify?token={token}"
            firm = await db.firms.find_one({"id": user["firm_id"]}, {"_id": 0, "name": 1})
            firm_name = (firm or {}).get("name") or "Your firm"
            send_portal_invite_email(
                contact["email"],
                invite_url,
                firm_name=firm_name,
                matter_title=m.get("title") or m.get("case_number") or matter_id,
            )
            await log_audit(
                db,
                firm_id=user["firm_id"],
                actor_id=user["id"],
                actor_name=user["name"],
                action="portal.invite_sent",
                resource_type="matter",
                resource_id=matter_id,
                detail={"contact_id": contact["id"], "email": contact["email"]},
                new_id=new_id,
                now_iso=now_iso,
            )

        updated = await db.matters.find_one({"id": matter_id}, {"_id": 0})
        out = {"matter": updated}
        if invite_url:
            out["invite_url"] = invite_url
            if os.environ.get("PRAXIUM_PORTAL_DEV_RETURN_LINK", "").lower() in ("1", "true", "yes"):
                out["dev_invite_url"] = invite_url
        return out

    @api.patch("/documents/{doc_id}/visibility")
    async def patch_document_visibility(
        doc_id: str,
        body: DocumentVisibilityPatch,
        user=Depends(require_permission("documents.write", get_current_user)),
    ):
        res = await db.documents.update_one(
            {"id": doc_id, "firm_id": user["firm_id"]},
            {"$set": {"client_visible": body.client_visible}},
        )
        if res.matched_count == 0:
            raise HTTPException(404)
        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user["name"],
            action="document.visibility_updated",
            resource_type="document",
            resource_id=doc_id,
            detail={"client_visible": body.client_visible},
            new_id=new_id,
            now_iso=now_iso,
        )
        d = await db.documents.find_one({"id": doc_id}, {"_id": 0, "data_b64": 0})
        return d

    @api.patch("/tasks/{task_id}/client-visible")
    async def patch_task_client_visible(
        task_id: str,
        body: TaskClientVisiblePatch,
        user=Depends(require_permission("tasks.write", get_current_user)),
    ):
        res = await db.tasks.update_one(
            {"id": task_id, "firm_id": user["firm_id"]},
            {"$set": {"client_visible": body.client_visible}},
        )
        if res.matched_count == 0:
            raise HTTPException(404)
        return await db.tasks.find_one({"id": task_id}, {"_id": 0})

    @api.get("/portal/staff/messages")
    async def staff_portal_messages(
        unread_only: bool = False,
        matter_id: Optional[str] = None,
        user=Depends(get_current_user),
    ):
        q: dict = {"firm_id": user["firm_id"]}
        if matter_id:
            m = await db.matters.find_one({"id": matter_id, "firm_id": user["firm_id"]})
            if not m:
                raise HTTPException(404, "Matter not found")
            q["matter_id"] = matter_id
        else:
            q["author_kind"] = "client"
            if unread_only:
                q["read_by_staff"] = False
        items = await db.portal_messages.find(q, {"_id": 0}).sort(
            "created_at", 1 if matter_id else -1
        ).to_list(500)
        if matter_id:
            await db.portal_messages.update_many(
                {
                    "firm_id": user["firm_id"],
                    "matter_id": matter_id,
                    "author_kind": "client",
                    "read_by_staff": False,
                },
                {"$set": {"read_by_staff": True}},
            )
        return {"items": items}

    @api.post("/portal/staff/messages")
    async def staff_reply_portal_message(body: PortalMessageIn, user=Depends(get_current_user)):
        m = await db.matters.find_one({"id": body.matter_id, "firm_id": user["firm_id"]})
        if not m:
            raise HTTPException(404)
        doc = {
            "id": new_id(),
            "firm_id": user["firm_id"],
            "matter_id": body.matter_id,
            "content": body.content.strip(),
            "author_kind": "staff",
            "author_id": user["id"],
            "author_name": user["name"],
            "read_by_staff": True,
            "created_at": now_iso(),
        }
        await db.portal_messages.insert_one(doc)
        await db.portal_messages.update_many(
            {
                "firm_id": user["firm_id"],
                "matter_id": body.matter_id,
                "author_kind": "client",
                "read_by_staff": False,
            },
            {"$set": {"read_by_staff": True}},
        )
        doc.pop("_id", None)
        return doc

    @api.post("/portal/staff/messages/{message_id}/read")
    async def staff_mark_message_read(message_id: str, user=Depends(get_current_user)):
        await db.portal_messages.update_one(
            {"id": message_id, "firm_id": user["firm_id"]},
            {"$set": {"read_by_staff": True}},
        )
        return {"ok": True}


def register_upload_routes(
    api: APIRouter,
    db: Any,
    new_id: Callable[[], str],
    now_iso: Callable[[], str],
    log_audit: Callable,
) -> None:
    """Public magic-link file upload (MedConnect + portal)."""

    @api.get("/upload/{token}/info")
    async def upload_token_info(token: str):
        from pi_documents import DOC_TYPES, MEDICAL_CODES

        link = await db.magic_links.find_one({"token": token})
        if not link:
            raise HTTPException(404, "Invalid upload link")
        if datetime.fromisoformat(link["expires_at"]) < datetime.now(timezone.utc):
            raise HTTPException(410, "Upload link expired")
        matter = await db.matters.find_one(
            {"id": link["matter_id"], "firm_id": link["firm_id"]},
            {"_id": 0, "title": 1, "case_number": 1, "id": 1},
        )
        return {
            "matter": matter,
            "kind": link.get("kind", "med_upload"),
            "expires_at": link["expires_at"],
            "taxonomy_catalog": {
                "doc_types": list(DOC_TYPES),
                "medical_codes": list(MEDICAL_CODES),
            },
        }

    @api.post("/upload/{token}")
    async def consume_upload_token(
        token: str,
        request: Request,
        file: UploadFile = File(...),
        name: Optional[str] = Form(None),
        doc_type: Optional[str] = Form("misc"),
        medical_code: Optional[str] = Form(None),
        provider_label: Optional[str] = Form(None),
    ):
        from pi_documents import folder_for_doc_type, merge_doc_taxonomy, validate_upload_taxonomy

        link = await db.magic_links.find_one({"token": token})
        if not link:
            raise HTTPException(404, "Invalid upload link")
        if datetime.fromisoformat(link["expires_at"]) < datetime.now(timezone.utc):
            raise HTTPException(410, "Upload link expired")

        contents = await file.read()
        if len(contents) > 25 * 1024 * 1024:
            raise HTTPException(413, "File too large (25MB max)")

        doc_name = name or file.filename or "upload"
        b64 = base64.b64encode(contents).decode()
        dt = (doc_type or "misc").strip()
        taxonomy = validate_upload_taxonomy(dt, medical_code or None)
        if provider_label:
            taxonomy["provider_label"] = provider_label.strip()[:200]
        taxonomy = merge_doc_taxonomy(taxonomy)
        folder = folder_for_doc_type(taxonomy["doc_type"])
        if link.get("kind") == "med_upload" and taxonomy["doc_type"] == "misc":
            folder = "Client Upload"
        doc = {
            "id": new_id(),
            "firm_id": link["firm_id"],
            "matter_id": link["matter_id"],
            "name": doc_name,
            "folder": folder,
            "content_type": file.content_type or "application/octet-stream",
            "size_bytes": len(contents),
            "data_b64": b64,
            "uploaded_by": "_upload_link",
            "uploaded_by_name": "Magic link upload",
            "uploaded_at": now_iso(),
            "version": 1,
            "client_visible": False,
            "source": link.get("kind", "med_upload"),
            "taxonomy": taxonomy,
        }
        await db.documents.insert_one(doc)
        await db.magic_links.update_one(
            {"id": link["id"]},
            {"$inc": {"uses": 1}, "$set": {"last_used_at": now_iso()}},
        )
        await db.activities.insert_one({
            "id": new_id(),
            "firm_id": link["firm_id"],
            "matter_id": link["matter_id"],
            "actor_id": "_upload_link",
            "actor_name": "Upload link",
            "type": "document_uploaded",
            "description": f"Uploaded via magic link: {doc_name}",
            "created_at": now_iso(),
        })
        await log_audit(
            db,
            firm_id=link["firm_id"],
            actor_id="_upload_link",
            actor_name="Magic link upload",
            action="upload.magic_link.used",
            resource_type="document",
            resource_id=doc["id"],
            detail={"matter_id": link["matter_id"], "name": doc_name},
            new_id=new_id,
            now_iso=now_iso,
            request=request,
        )
        from outgoing_webhooks import emit_webhook_event

        await emit_webhook_event(
            db,
            firm_id=link["firm_id"],
            event_type="document.uploaded",
            data={
                "document_id": doc["id"],
                "matter_id": link["matter_id"],
                "name": doc_name,
                "folder": folder,
                "source": "magic_link",
            },
            new_id=new_id,
            now_iso=now_iso,
        )
        doc.pop("data_b64")
        doc.pop("_id", None)
        return {"ok": True, "document": doc}
