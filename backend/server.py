"""
Praxium Suite — Legal OS backend.
FastAPI + MongoDB + JWT auth + Claude Sonnet 4.5 (Emergent Universal Key).
"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, UploadFile, File, Form, Request
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
import base64
import secrets
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt as pyjwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
mongo_client = AsyncIOMotorClient(mongo_url)
db = mongo_client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ.get("JWT_SECRET", "praxium-dev-secret-change-in-prod")
JWT_ALGO = "HS256"
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

app = FastAPI(title="Praxium Suite API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("praxium")


# ──────────────── helpers ────────────────
def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def check_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def make_token(user_id: str, firm_id: str) -> str:
    payload = {
        "sub": user_id,
        "firm": firm_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
        "iat": datetime.now(timezone.utc),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def decode_token(token: str) -> dict:
    return pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    token = authorization.replace("Bearer ", "")
    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


# ──────────────── models ────────────────
class SignupReq(BaseModel):
    email: EmailStr
    password: str
    name: str
    firm_name: str


class LoginReq(BaseModel):
    email: EmailStr
    password: str


class MatterIn(BaseModel):
    title: str
    practice_area: str = "personal_injury"
    case_number: Optional[str] = None
    client_id: Optional[str] = None
    status: str = "intake"
    description: Optional[str] = None
    lead_attorney_id: Optional[str] = None
    value_estimate: Optional[float] = None
    sol_date: Optional[str] = None
    incident_date: Optional[str] = None
    custom: dict = {}


class ContactIn(BaseModel):
    name: str
    kind: str = "client"  # client | opposing | witness | expert | judge | adjuster | provider | vendor
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    organization: Optional[str] = None
    notes: Optional[str] = None
    language: Optional[str] = "en"
    patient_id: Optional[str] = None  # auto-set for clients
    date_of_birth: Optional[str] = None


class TaskIn(BaseModel):
    title: str
    matter_id: Optional[str] = None
    assignee_id: Optional[str] = None
    description: Optional[str] = None
    priority: str = "medium"  # low | medium | high | urgent
    status: str = "open"  # open | in_progress | done
    due_date: Optional[str] = None


class NoteIn(BaseModel):
    matter_id: str
    content: str
    pinned: bool = False


class ChatMsgIn(BaseModel):
    matter_id: Optional[str] = None
    channel: str = "general"
    content: str


class AiChatReq(BaseModel):
    matter_id: Optional[str] = None
    message: str
    session_id: Optional[str] = None


class IntakeReq(BaseModel):
    name: str
    email: str
    phone: str
    incident_date: Optional[str] = None
    case_type: str = "personal_injury"
    description: str
    source: Optional[str] = "website"
    firm_slug: Optional[str] = None


class ProviderIn(BaseModel):
    name: str
    specialty: str
    phone: Optional[str] = None
    fax: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    npi: Optional[str] = None
    preferred_submission: str = "email"  # email | fax | portal | mail
    notes: Optional[str] = None


class TreatmentIn(BaseModel):
    matter_id: str
    provider_id: str
    role: str = "treating"  # treating | consulting | ime | expert
    first_visit: Optional[str] = None
    records_status: str = "not_requested"
    billed_total: float = 0
    paid_total: float = 0
    lien_amount: float = 0


class FilingIn(BaseModel):
    matter_id: str
    court: str
    document_type: str
    title: str
    filed_date: Optional[str] = None
    status: str = "draft"  # draft | reviewed | filed | accepted | rejected | served


class PartnerInquiry(BaseModel):
    firm_name: str
    contact_name: str
    email: str
    phone: Optional[str] = None
    state: str
    practice_areas: List[str]
    bar_number: Optional[str] = None


class PraxaUserIn(BaseModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None
    incident_date: Optional[str] = None


# ──────────────── auth routes ────────────────
@api.post("/auth/signup")
async def signup(req: SignupReq):
    existing = await db.users.find_one({"email": req.email.lower()})
    if existing:
        raise HTTPException(400, "Email already registered")

    firm_id = new_id()
    user_id = new_id()
    await db.firms.insert_one({
        "id": firm_id,
        "name": req.firm_name,
        "slug": req.firm_name.lower().replace(" ", "-")[:32] + "-" + firm_id[:6],
        "subscription_tier": "starter",
        "owner_id": user_id,
        "created_at": now(),
        "settings": {"timezone": "America/New_York"},
    })
    await db.users.insert_one({
        "id": user_id,
        "firm_id": firm_id,
        "email": req.email.lower(),
        "password_hash": hash_pw(req.password),
        "name": req.name,
        "role": "admin",
        "title": "Managing Attorney",
        "created_at": now(),
    })
    from workflows import ensure_firm_workflows
    await ensure_firm_workflows(db, firm_id, new_id, now)
    token = make_token(user_id, firm_id)
    return {
        "token": token,
        "user": {"id": user_id, "email": req.email.lower(), "name": req.name, "role": "admin", "firm_id": firm_id},
        "firm": {"id": firm_id, "name": req.firm_name},
    }


@api.post("/auth/login")
async def login(req: LoginReq, request: Request):
    user = await db.users.find_one({"email": req.email.lower()})
    if not user or not check_pw(req.password, user["password_hash"]):
        from audit import log_audit as _log_audit

        await _log_audit(
            db,
            firm_id=user["firm_id"] if user else "_unauthenticated",
            actor_id=user["id"] if user else "_anonymous",
            actor_name=user.get("name", "Unknown") if user else "Anonymous",
            actor_email=req.email.lower(),
            action="auth.login.failed",
            resource_type="session",
            outcome="failure",
            detail={"email": req.email.lower()},
            new_id=new_id,
            now_iso=now,
            request=request,
        )
        raise HTTPException(401, "Invalid credentials")
    firm = await db.firms.find_one({"id": user["firm_id"]}, {"_id": 0})
    token = make_token(user["id"], user["firm_id"])
    from audit import log_audit as _log_audit

    await _log_audit(
        db,
        firm_id=user["firm_id"],
        actor_id=user["id"],
        actor_name=user["name"],
        actor_email=user["email"],
        action="auth.login.success",
        resource_type="session",
        outcome="success",
        new_id=new_id,
        now_iso=now,
        request=request,
    )
    return {
        "token": token,
        "user": {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"], "firm_id": user["firm_id"]},
        "firm": firm,
    }


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    firm = await db.firms.find_one({"id": user["firm_id"]}, {"_id": 0})
    return {
        "user": user,
        "firm": firm,
        "disclosure_required": user_needs_disclosure(user),
    }


# ──────────────── matters ────────────────
@api.post("/matters")
async def create_matter(m: MatterIn, user=Depends(get_current_user)):
    doc = m.model_dump()
    matter_id = new_id()
    # Generate case number if not provided
    if not doc.get("case_number"):
        count = await db.matters.count_documents({"firm_id": user["firm_id"]})
        doc["case_number"] = f"M-{datetime.now().year}-{count + 1:04d}"
    doc.update({
        "id": matter_id,
        "firm_id": user["firm_id"],
        "lead_attorney_id": doc.get("lead_attorney_id") or user["id"],
        "team_ids": [user["id"]],
        "created_by": user["id"],
        "portal_enabled": doc.get("portal_enabled", False),
        "created_at": now(),
        "updated_at": now(),
    })
    doc["pi_intake"] = default_pi_intake()
    doc["pi_insurance"] = default_pi_insurance()
    from pi_phases import default_pi_phase

    doc["pi_phase"] = default_pi_phase()
    from pi_demand import default_pi_demand

    doc["pi_demand"] = default_pi_demand()
    from pi_settlement import default_pi_settlement

    doc["pi_settlement"] = default_pi_settlement()
    from pi_property_damage import default_pi_property_damage

    doc["pi_property_damage"] = default_pi_property_damage()
    from pi_client_comms import default_pi_comms

    doc["pi_comms"] = default_pi_comms()
    doc["pi_subrogation"] = default_pi_subrogation()
    await db.matters.insert_one(doc)
    # Activity
    await db.activities.insert_one({
        "id": new_id(), "firm_id": user["firm_id"], "matter_id": matter_id,
        "actor_id": user["id"], "actor_name": user["name"],
        "type": "matter_created", "description": f"Created matter: {m.title}", "created_at": now(),
    })
    from workflows import run_workflow_trigger
    await run_workflow_trigger(
        db,
        firm_id=user["firm_id"],
        trigger="matter.created",
        context={"matter_id": matter_id, "title": m.title},
        user_id=user["id"],
        new_id=new_id,
        now_iso=now,
    )
    from outgoing_webhooks import emit_webhook_event

    await emit_webhook_event(
        db,
        firm_id=user["firm_id"],
        event_type="matter.created",
        data={
            "matter_id": matter_id,
            "title": m.title,
            "case_number": doc.get("case_number"),
            "status": doc.get("status"),
        },
        new_id=new_id,
        now_iso=now,
    )
    doc.pop("_id", None)
    return doc


@api.get("/matters")
async def list_matters(status: Optional[str] = None, pi_phase: Optional[str] = None, user=Depends(get_current_user)):
    q = {"firm_id": user["firm_id"]}
    if status:
        q["status"] = status
    if pi_phase:
        q["pi_phase.current"] = pi_phase
    matters = await db.matters.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return matters


@api.get("/matters/{matter_id}")
async def get_matter(matter_id: str, request: Request, user=Depends(get_current_user)):
    m = await db.matters.find_one({"id": matter_id, "firm_id": user["firm_id"]}, {"_id": 0})
    if not m:
        raise HTTPException(404, "Matter not found")
    from audit import log_audit as _log_audit

    await _log_audit(
        db,
        firm_id=user["firm_id"],
        actor_id=user["id"],
        actor_name=user["name"],
        actor_email=user.get("email"),
        action="matter.viewed",
        resource_type="matter",
        resource_id=matter_id,
        detail={"title": m.get("title"), "case_number": m.get("case_number")},
        new_id=new_id,
        now_iso=now,
        request=request,
    )
    return m


@api.put("/matters/{matter_id}")
async def update_matter(matter_id: str, updates: dict, user=Depends(get_current_user)):
    before = await db.matters.find_one({"id": matter_id, "firm_id": user["firm_id"]}, {"_id": 0})
    if not before:
        raise HTTPException(404, "Matter not found")
    updates["updated_at"] = now()
    updates.pop("id", None)
    updates.pop("firm_id", None)
    res = await db.matters.update_one({"id": matter_id, "firm_id": user["firm_id"]}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(404, "Matter not found")
    updated = await db.matters.find_one({"id": matter_id}, {"_id": 0})
    if "status" in updates and before.get("status") != updates.get("status"):
        from outgoing_webhooks import emit_webhook_event

        await emit_webhook_event(
            db,
            firm_id=user["firm_id"],
            event_type="matter.status_changed",
            data={
                "matter_id": matter_id,
                "from_status": before.get("status"),
                "to_status": updates.get("status"),
                "title": updated.get("title"),
                "case_number": updated.get("case_number"),
            },
            new_id=new_id,
            now_iso=now,
        )
    return updated


@api.delete("/matters/{matter_id}")
async def delete_matter(matter_id: str, user=Depends(get_current_user)):
    await db.matters.delete_one({"id": matter_id, "firm_id": user["firm_id"]})
    return {"ok": True}


# ──────────────── contacts ────────────────
def gen_patient_id() -> str:
    return f"PT-{secrets.token_hex(3).upper()}"


@api.post("/contacts")
async def create_contact(c: ContactIn, user=Depends(get_current_user)):
    doc = c.model_dump()
    doc.update({
        "id": new_id(), "firm_id": user["firm_id"], "created_by": user["id"],
        "created_at": now(),
    })
    if c.kind == "client" and not c.patient_id:
        doc["patient_id"] = gen_patient_id()
    await db.contacts.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/contacts")
async def list_contacts(kind: Optional[str] = None, search: Optional[str] = None, user=Depends(get_current_user)):
    q = {"firm_id": user["firm_id"]}
    if kind:
        q["kind"] = kind
    if search:
        q["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"patient_id": {"$regex": search, "$options": "i"}},
        ]
    items = await db.contacts.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@api.get("/contacts/{cid}")
async def get_contact(cid: str, user=Depends(get_current_user)):
    c = await db.contacts.find_one({"id": cid, "firm_id": user["firm_id"]}, {"_id": 0})
    if not c:
        raise HTTPException(404)
    return c


@api.put("/contacts/{cid}")
async def update_contact(cid: str, updates: dict, user=Depends(get_current_user)):
    updates.pop("id", None)
    updates.pop("firm_id", None)
    await db.contacts.update_one({"id": cid, "firm_id": user["firm_id"]}, {"$set": updates})
    return await db.contacts.find_one({"id": cid}, {"_id": 0})


@api.delete("/contacts/{cid}")
async def delete_contact(cid: str, user=Depends(get_current_user)):
    await db.contacts.delete_one({"id": cid, "firm_id": user["firm_id"]})
    return {"ok": True}


# ──────────────── tasks ────────────────
@api.post("/tasks")
async def create_task(t: TaskIn, user=Depends(get_current_user)):
    doc = t.model_dump()
    doc.update({
        "id": new_id(), "firm_id": user["firm_id"], "created_by": user["id"],
        "assignee_id": doc.get("assignee_id") or user["id"],
        "created_at": now(),
    })
    await db.tasks.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/tasks")
async def list_tasks(status: Optional[str] = None, matter_id: Optional[str] = None, user=Depends(get_current_user)):
    q = {"firm_id": user["firm_id"]}
    if status:
        q["status"] = status
    if matter_id:
        q["matter_id"] = matter_id
    items = await db.tasks.find(q, {"_id": 0}).sort("due_date", 1).to_list(500)
    return items


@api.put("/tasks/{tid}")
async def update_task(tid: str, updates: dict, user=Depends(get_current_user)):
    updates.pop("id", None)
    await db.tasks.update_one({"id": tid, "firm_id": user["firm_id"]}, {"$set": updates})
    return await db.tasks.find_one({"id": tid}, {"_id": 0})


@api.delete("/tasks/{tid}")
async def delete_task(tid: str, user=Depends(get_current_user)):
    await db.tasks.delete_one({"id": tid, "firm_id": user["firm_id"]})
    return {"ok": True}


# ──────────────── notes ────────────────
@api.post("/notes")
async def create_note(n: NoteIn, user=Depends(get_current_user)):
    doc = n.model_dump()
    doc.update({
        "id": new_id(), "firm_id": user["firm_id"], "author_id": user["id"],
        "author_name": user["name"], "created_at": now(),
    })
    await db.notes.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/notes")
async def list_notes(matter_id: Optional[str] = None, user=Depends(get_current_user)):
    q = {"firm_id": user["firm_id"]}
    if matter_id:
        q["matter_id"] = matter_id
    return await db.notes.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)


# ──────────────── activity ────────────────
@api.get("/activities")
async def list_activities(matter_id: Optional[str] = None, limit: int = 50, user=Depends(get_current_user)):
    q = {"firm_id": user["firm_id"]}
    if matter_id:
        q["matter_id"] = matter_id
    return await db.activities.find(q, {"_id": 0}).sort("created_at", -1).to_list(limit)


# ──────────────── documents ────────────────
@api.post("/documents")
async def upload_document(
    matter_id: str = Form(...),
    name: str = Form(...),
    folder: str = Form("General"),
    doc_type: str = Form("misc"),
    medical_code: Optional[str] = Form(None),
    provider_label: Optional[str] = Form(None),
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    contents = await file.read()
    if len(contents) > 25 * 1024 * 1024:
        raise HTTPException(413, "File too large (25MB max)")
    b64 = base64.b64encode(contents).decode()
    content_type = file.content_type or "application/octet-stream"
    extracted_text = None
    pdf_pages = None
    from pdf_util import extract_text_from_pdf_bytes, is_pdf, page_count

    if is_pdf(content_type, name):
        extracted_text = extract_text_from_pdf_bytes(contents)
        pdf_pages = page_count(contents)

    taxonomy = validate_upload_taxonomy(doc_type, medical_code or None)
    if provider_label:
        taxonomy["provider_label"] = provider_label.strip()[:200]
    folder = folder_for_doc_type(taxonomy["doc_type"])

    doc = {
        "id": new_id(), "firm_id": user["firm_id"], "matter_id": matter_id,
        "name": name, "folder": folder, "content_type": content_type,
        "size_bytes": len(contents), "data_b64": b64,
        "uploaded_by": user["id"], "uploaded_by_name": user["name"],
        "uploaded_at": now(), "version": 1,
        "client_visible": False,
        "extracted_text": extracted_text,
        "page_count": pdf_pages,
        "taxonomy": taxonomy,
    }
    await db.documents.insert_one(doc)
    await db.activities.insert_one({
        "id": new_id(), "firm_id": user["firm_id"], "matter_id": matter_id,
        "actor_id": user["id"], "actor_name": user["name"],
        "type": "document_uploaded", "description": f"Uploaded {name}", "created_at": now(),
    })
    from workflows import run_workflow_trigger
    await run_workflow_trigger(
        db,
        firm_id=user["firm_id"],
        trigger="document.uploaded",
        context={"matter_id": matter_id, "folder": folder, "name": name, "doc_type": taxonomy["doc_type"]},
        user_id=user["id"],
        new_id=new_id,
        now_iso=now,
    )
    from outgoing_webhooks import emit_webhook_event

    await emit_webhook_event(
        db,
        firm_id=user["firm_id"],
        event_type="document.uploaded",
        data={
            "document_id": doc["id"],
            "matter_id": matter_id,
            "name": name,
            "folder": folder,
            "content_type": content_type,
            "doc_type": taxonomy["doc_type"],
        },
        new_id=new_id,
        now_iso=now,
    )
    doc.pop("data_b64")
    doc.pop("_id", None)
    return doc


@api.get("/documents")
async def list_documents(matter_id: Optional[str] = None, user=Depends(get_current_user)):
    q = {"firm_id": user["firm_id"]}
    if matter_id:
        q["matter_id"] = matter_id
    items = await db.documents.find(q, {"_id": 0, "data_b64": 0}).sort("uploaded_at", -1).to_list(500)
    for item in items:
        item["taxonomy"] = merge_doc_taxonomy(item.get("taxonomy"))
    return items


@api.get("/documents/{doc_id}/download")
async def download_document(doc_id: str, request: Request, user=Depends(get_current_user)):
    d = await db.documents.find_one({"id": doc_id, "firm_id": user["firm_id"]})
    if not d:
        raise HTTPException(404)
    from audit import log_audit as _log_audit

    await _log_audit(
        db,
        firm_id=user["firm_id"],
        actor_id=user["id"],
        actor_name=user["name"],
        actor_email=user.get("email"),
        action="document.exported",
        resource_type="document",
        resource_id=doc_id,
        detail={"name": d.get("name"), "matter_id": d.get("matter_id")},
        new_id=new_id,
        now_iso=now,
        request=request,
    )
    return {"name": d["name"], "content_type": d["content_type"], "data_b64": d["data_b64"]}


# DELETE /documents/{doc_id} registered after RBAC imports (see bottom of file)


# ──────────────── medical providers / treatments ────────────────
@api.post("/providers")
async def create_provider(p: ProviderIn, user=Depends(get_current_user)):
    doc = p.model_dump()
    doc.update({"id": new_id(), "firm_id": user["firm_id"], "created_at": now()})
    await db.providers.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/providers")
async def list_providers(user=Depends(get_current_user)):
    return await db.providers.find({"firm_id": user["firm_id"]}, {"_id": 0}).to_list(500)


@api.post("/treatments")
async def create_treatment(t: TreatmentIn, user=Depends(get_current_user)):
    doc = t.model_dump()
    doc.update({"id": new_id(), "firm_id": user["firm_id"], "created_at": now()})
    await db.treatments.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/treatments")
async def list_treatments(matter_id: Optional[str] = None, user=Depends(get_current_user)):
    q = {"firm_id": user["firm_id"]}
    if matter_id:
        q["matter_id"] = matter_id
    return await db.treatments.find(q, {"_id": 0}).to_list(500)


class MagicLinkIn(BaseModel):
    matter_id: str
    expires_days: int = 30
    send_email: bool = True
    recipient_email: Optional[str] = None


@api.post("/medconnect/magic-link")
async def create_magic_link(body: MagicLinkIn, user=Depends(get_current_user)):
    matter_id = body.matter_id
    expires_days = body.expires_days
    token = secrets.token_urlsafe(16)
    doc = {
        "id": new_id(), "firm_id": user["firm_id"], "matter_id": matter_id,
        "token": token, "kind": "med_upload",
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=expires_days)).isoformat(),
        "uses": 0, "created_at": now(),
    }
    await db.magic_links.insert_one(doc)
    frontend_url = os.environ.get("PRAXIUM_FRONTEND_URL", "http://localhost:3000").rstrip("/")
    full_url = f"{frontend_url}/upload/{token}"
    if body.send_email:
        from email_util import send_upload_link_email

        email = body.recipient_email
        if not email:
            matter = await db.matters.find_one({"id": matter_id, "firm_id": user["firm_id"]})
            if matter:
                client_id = matter.get("client_id") or matter.get("client_contact_id")
                if client_id:
                    contact = await db.contacts.find_one({"id": client_id})
                    email = (contact or {}).get("email")
        if email:
            firm = await db.firms.find_one({"id": user["firm_id"]}, {"_id": 0, "name": 1})
            matter = await db.matters.find_one({"id": matter_id}, {"_id": 0, "title": 1, "case_number": 1})
            firm_name = (firm or {}).get("name") or "Your firm"
            matter_label = (matter or {}).get("case_number") or (matter or {}).get("title") or matter_id
            send_upload_link_email(email, full_url, firm_name=firm_name, matter_label=matter_label)
    out = {"token": token, "url": f"/upload/{token}", "full_url": full_url, "expires_at": doc["expires_at"]}
    if os.environ.get("PRAXIUM_PORTAL_DEV_RETURN_LINK", "").lower() in ("1", "true", "yes"):
        out["dev_upload_url"] = full_url
    return out


# ──────────────── filings (CourtFile) ────────────────
@api.post("/filings")
async def create_filing(f: FilingIn, user=Depends(get_current_user)):
    doc = f.model_dump()
    doc.update({"id": new_id(), "firm_id": user["firm_id"], "created_at": now()})
    await db.filings.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/filings")
async def list_filings(matter_id: Optional[str] = None, user=Depends(get_current_user)):
    q = {"firm_id": user["firm_id"]}
    if matter_id:
        q["matter_id"] = matter_id
    return await db.filings.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)


# ──────────────── intake (LawMatch) ────────────────
@api.post("/intake")
async def submit_intake(req: IntakeReq):
    """Public endpoint for consumer intake. Routes to firm or partner network."""
    doc = req.model_dump()
    doc.update({"id": new_id(), "status": "new", "ai_score": None, "created_at": now()})
    # Try resolve firm by slug
    firm = None
    if req.firm_slug:
        firm = await db.firms.find_one({"slug": req.firm_slug}, {"_id": 0})
    if firm:
        doc["firm_id"] = firm["id"]
        doc["assigned_to"] = "firm"
    else:
        doc["assigned_to"] = "marketplace"
    # Simple keyword-based AI score for Phase 1
    score = 50
    desc = (req.description or "").lower()
    if any(w in desc for w in ["surgery", "hospital", "broken", "fracture", "permanent", "disability"]):
        score += 25
    if any(w in desc for w in ["insurance refused", "denied", "lawsuit", "filed"]):
        score += 10
    if any(w in desc for w in ["minor", "scratch", "no injury", "fine"]):
        score -= 20
    doc["ai_score"] = max(0, min(100, score))
    await db.leads.insert_one(doc)
    doc.pop("_id", None)
    return {"ok": True, "lead_id": doc["id"], "score": doc["ai_score"]}


@api.get("/leads")
async def list_leads(user=Depends(get_current_user)):
    q = {"$or": [{"firm_id": user["firm_id"]}, {"assigned_to": "marketplace"}]}
    return await db.leads.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.post("/leads/{lid}/claim")
async def claim_lead(lid: str, user=Depends(get_current_user)):
    await db.leads.update_one(
        {"id": lid},
        {"$set": {"status": "claimed", "firm_id": user["firm_id"], "claimed_by": user["id"], "claimed_at": now()}},
    )
    return {"ok": True}


@api.post("/leads/{lid}/convert")
async def convert_lead(lid: str, user=Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lid, "firm_id": user["firm_id"]})
    if not lead:
        raise HTTPException(404)
    if lead.get("status") == "converted" and lead.get("matter_id"):
        m = await db.matters.find_one({"id": lead["matter_id"]}, {"_id": 0})
        return {"matter_id": lead["matter_id"], "contact_id": lead.get("contact_id"), "already_converted": True, "matter": m}
    # Create contact (client)
    contact_id = new_id()
    patient_id = gen_patient_id()
    await db.contacts.insert_one({
        "id": contact_id, "firm_id": user["firm_id"], "kind": "client",
        "name": lead["name"], "email": lead.get("email"), "phone": lead.get("phone"),
        "patient_id": patient_id, "created_at": now(), "created_by": user["id"],
    })
    # Create matter
    matter_id = new_id()
    count = await db.matters.count_documents({"firm_id": user["firm_id"]})
    await db.matters.insert_one({
        "id": matter_id, "firm_id": user["firm_id"],
        "case_number": f"M-{datetime.now().year}-{count + 1:04d}",
        "title": f"{lead['name']} — {lead.get('case_type', 'Personal Injury')}",
        "practice_area": lead.get("case_type", "personal_injury"),
        "status": "intake", "client_id": contact_id, "lead_attorney_id": user["id"],
        "team_ids": [user["id"]], "description": lead.get("description"),
        "incident_date": lead.get("incident_date"), "created_by": user["id"],
        "portal_enabled": False,
        "created_at": now(), "updated_at": now(),
    })
    await db.leads.update_one({"id": lid}, {"$set": {"status": "converted", "matter_id": matter_id}})
    return {"matter_id": matter_id, "contact_id": contact_id, "patient_id": patient_id}


# ──────────────── CoCounsel AI (Claude Sonnet 4.5) ────────────────
@api.post("/ai/chat")
async def ai_chat(req: AiChatReq, user=Depends(get_current_user)):
    """Streaming chat with Claude Sonnet 4.5 via Emergent Universal Key."""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "AI not configured")

    from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

    session_id = req.session_id or new_id()

    # Build system message with matter context
    context_blurb = "You are CoCounsel, the AI legal assistant inside Praxium Suite. You help lawyers and paralegals manage cases. Be concise, action-oriented, and cite the matter context when relevant."
    if req.matter_id:
        m = await db.matters.find_one({"id": req.matter_id, "firm_id": user["firm_id"]}, {"_id": 0})
        if m:
            ctx = {
                "case": m.get("case_number"), "title": m.get("title"),
                "practice_area": m.get("practice_area"), "status": m.get("status"),
                "incident_date": m.get("incident_date"), "description": m.get("description"),
            }
            context_blurb += f"\n\nCurrent matter context:\n{json.dumps(ctx, indent=2)}"

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=context_blurb,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    # Persist user message
    await db.ai_messages.insert_one({
        "id": new_id(), "firm_id": user["firm_id"], "user_id": user["id"],
        "session_id": session_id, "matter_id": req.matter_id,
        "role": "user", "content": req.message, "created_at": now(),
    })

    async def gen():
        collected = ""
        try:
            async for ev in chat.stream_message(UserMessage(text=req.message)):
                if isinstance(ev, TextDelta):
                    collected += ev.content
                    yield ev.content
                elif isinstance(ev, StreamDone):
                    break
        except Exception as e:
            log.exception("AI stream failed")
            yield f"\n\n[Error: {e}]"
        # persist assistant reply
        await db.ai_messages.insert_one({
            "id": new_id(), "firm_id": user["firm_id"], "user_id": user["id"],
            "session_id": session_id, "matter_id": req.matter_id,
            "role": "assistant", "content": collected, "created_at": now(),
        })

    return StreamingResponse(
        gen(), media_type="text/plain",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "X-Session-Id": session_id},
    )


@api.get("/ai/sessions/{session_id}")
async def get_session_messages(session_id: str, user=Depends(get_current_user)):
    msgs = await db.ai_messages.find(
        {"firm_id": user["firm_id"], "session_id": session_id}, {"_id": 0},
    ).sort("created_at", 1).to_list(500)
    return msgs


# ──────────────── chat (CaseChat) ────────────────
@api.post("/chat/messages")
async def post_chat(msg: ChatMsgIn, user=Depends(get_current_user)):
    doc = {
        "id": new_id(), "firm_id": user["firm_id"], "matter_id": msg.matter_id,
        "channel": msg.channel, "content": msg.content,
        "author_id": user["id"], "author_name": user["name"], "created_at": now(),
    }
    await db.chat_messages.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/chat/messages")
async def list_chat(matter_id: Optional[str] = None, channel: str = "general", user=Depends(get_current_user)):
    q = {"firm_id": user["firm_id"], "channel": channel}
    if matter_id:
        q["matter_id"] = matter_id
    items = await db.chat_messages.find(q, {"_id": 0}).sort("created_at", 1).to_list(500)
    return items


# ──────────────── partner network ────────────────
@api.post("/partners/inquiry")
async def partner_inquiry(req: PartnerInquiry):
    doc = req.model_dump()
    doc.update({"id": new_id(), "status": "pending_review", "created_at": now()})
    await db.partner_inquiries.insert_one(doc)
    return {"ok": True}


# ──────────────── Praxa consumer-side ────────────────
@api.post("/praxa/signup")
async def praxa_signup(req: PraxaUserIn):
    existing = await db.praxa_users.find_one({"email": req.email.lower()})
    if existing:
        token = make_token(existing["id"], "praxa")
        return {"token": token, "user": {"id": existing["id"], "email": existing["email"], "name": existing["name"]}}
    uid = new_id()
    doc = {
        "id": uid, "email": req.email.lower(), "name": req.name, "phone": req.phone,
        "incident_date": req.incident_date, "created_at": now(), "case_stage": "discovery",
    }
    await db.praxa_users.insert_one(doc)
    token = make_token(uid, "praxa")
    return {"token": token, "user": {"id": uid, "email": req.email.lower(), "name": req.name}}


@api.post("/praxa/journal")
async def praxa_journal(entry: dict, authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401)
    payload = decode_token(authorization.replace("Bearer ", ""))
    doc = {
        "id": new_id(), "user_id": payload["sub"],
        "pain_level": entry.get("pain_level"), "notes": entry.get("notes"),
        "symptoms": entry.get("symptoms", []), "created_at": now(),
    }
    await db.praxa_journal.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/praxa/journal")
async def praxa_get_journal(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401)
    payload = decode_token(authorization.replace("Bearer ", ""))
    return await db.praxa_journal.find({"user_id": payload["sub"]}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.post("/praxa/ai-coach")
async def praxa_ai_coach(req: dict, authorization: Optional[str] = Header(None)):
    """Insurance coaching for Praxa consumers — claude with care-not-legal-advice guardrails."""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "AI not configured")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401)
    decode_token(authorization.replace("Bearer ", ""))

    from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

    session_id = req.get("session_id") or new_id()
    msg = req.get("message", "")
    sys = (
        "You are Praxa — a streetwise, confident friend with deep know-how about insurance claims and "
        "the personal-injury process. You speak plainly, never legalese. Your job: arm the user with "
        "information so insurance companies don't take advantage of them.\n\n"
        "Hard rules:\n"
        "1. NEVER give legal advice for the user's specific case. Give GENERAL INFORMATION.\n"
        "2. End each response with: 'For specific legal advice, talk to a licensed attorney.'\n"
        "3. Remind the user to be ACCURATE about injuries, not strong — minimizing now hurts later.\n"
        "4. Insurance adjusters are NOT their friends, even when nice.\n"
        "5. Tone: confident, anti-BS, supportive. Never preachy.\n"
    )
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=sys) \
        .with_model("anthropic", "claude-sonnet-4-5-20250929")

    async def gen():
        try:
            async for ev in chat.stream_message(UserMessage(text=msg)):
                if isinstance(ev, TextDelta):
                    yield ev.content
                elif isinstance(ev, StreamDone):
                    break
        except Exception as e:
            yield f"\n\n[Error: {e}]"

    return StreamingResponse(
        gen(), media_type="text/plain",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "X-Session-Id": session_id},
    )


# ──────────────── dashboard ────────────────
@api.get("/dashboard")
async def dashboard(user=Depends(get_current_user)):
    fid = user["firm_id"]
    open_matters = await db.matters.count_documents({"firm_id": fid, "status": {"$nin": ["closed", "settled"]}})
    total_matters = await db.matters.count_documents({"firm_id": fid})
    open_tasks = await db.tasks.count_documents({"firm_id": fid, "status": {"$ne": "done"}})
    overdue_tasks_cursor = db.tasks.find({"firm_id": fid, "status": {"$ne": "done"}, "due_date": {"$lt": now()}})
    overdue = await overdue_tasks_cursor.to_list(500)
    new_leads = await db.leads.count_documents({"$or": [{"firm_id": fid}, {"assigned_to": "marketplace"}], "status": "new"})
    recent_activity = await db.activities.find({"firm_id": fid}, {"_id": 0}).sort("created_at", -1).to_list(10)
    contacts_count = await db.contacts.count_documents({"firm_id": fid})

    # status pipeline
    pipeline_counts = {}
    for s in ["intake", "active", "discovery", "negotiation", "litigation", "settlement", "closed"]:
        pipeline_counts[s] = await db.matters.count_documents({"firm_id": fid, "status": s})

    from pi_phases import PI_PHASES, merge_pi_phase

    pi_pipeline: dict[str, int] = {p["id"]: 0 for p in PI_PHASES}
    pi_cursor = db.matters.find({"firm_id": fid, "practice_area": "personal_injury"}, {"pi_phase": 1})
    async for row in pi_cursor:
        pid = merge_pi_phase(row.get("pi_phase")).get("current", "intake")
        if pid in pi_pipeline:
            pi_pipeline[pid] += 1

    return {
        "open_matters": open_matters, "total_matters": total_matters,
        "open_tasks": open_tasks, "overdue_tasks": len(overdue),
        "new_leads": new_leads, "contacts_count": contacts_count,
        "pipeline": pipeline_counts, "pi_pipeline": pi_pipeline,
        "recent_activity": recent_activity,
    }


# ──────────────── team ────────────────
@api.get("/team")
async def team(user=Depends(get_current_user)):
    users = await db.users.find({"firm_id": user["firm_id"]}, {"_id": 0, "password_hash": 0}).to_list(200)
    return users


# ──────────────── search ────────────────
@api.get("/search")
async def global_search(q: str, user=Depends(get_current_user)):
    fid = user["firm_id"]
    rx = {"$regex": q, "$options": "i"}
    matters = await db.matters.find({"firm_id": fid, "$or": [{"title": rx}, {"case_number": rx}, {"description": rx}]}, {"_id": 0}).limit(8).to_list(8)
    contacts = await db.contacts.find({"firm_id": fid, "$or": [{"name": rx}, {"email": rx}, {"phone": rx}, {"patient_id": rx}]}, {"_id": 0}).limit(8).to_list(8)
    notes = await db.notes.find({"firm_id": fid, "content": rx}, {"_id": 0}).limit(8).to_list(8)
    return {"matters": matters, "contacts": contacts, "notes": notes}


# ──────────────── health ────────────────
PROGRAM_PHASE = 20
MAX_PROGRAM_PHASE = 20
API_VERSION = "0.3.0"

BACKEND_MODULES = (
    "auth",
    "matters",
    "contacts",
    "documents",
    "rbac",
    "audit",
    "billing",
    "workflows",
    "marketplace",
    "team",
    "portal",
    "nativesign",
    "identity_verification",
    "csv_import",
    "webhooks",
    "api_keys",
    "analytics",
    "training",
    "pi_intake",
    "pi_insurance",
    "pi_meds",
    "pi_documents",
    "pi_phases",
    "pi_demand",
    "pi_settlement",
    "pi_property_damage",
    "pi_comms",
    "pi_audit",
    "pi_subrogation",
    "disclosure",
)


@api.get("/")
async def root():
    return {
        "app": "Praxium Suite",
        "status": "ok",
        "version": API_VERSION,
        "programPhase": PROGRAM_PHASE,
        "maxProgramPhase": MAX_PROGRAM_PHASE,
    }


@api.get("/health")
async def health():
    mongo_ok = False
    try:
        await db.command("ping")
        mongo_ok = True
    except Exception:
        mongo_ok = False
    return {
        "ok": mongo_ok,
        "ts": now(),
        "version": API_VERSION,
        "programPhase": PROGRAM_PHASE,
        "maxProgramPhase": MAX_PROGRAM_PHASE,
        "modules": list(BACKEND_MODULES),
        "mongo": mongo_ok,
    }


@api.get("/analytics/summary")
async def analytics_summary(user=Depends(get_current_user)):
    fid = user["firm_id"]
    webhook_endpoints = await db.webhook_endpoints.count_documents({"firm_id": fid, "active": True})
    webhook_deliveries_24h = await db.webhook_deliveries.count_documents({"firm_id": fid})
    portal_messages_unread = await db.portal_messages.count_documents(
        {"firm_id": fid, "author_kind": "client", "read_by_staff": False},
    )
    pending_signatures = await db.sign_requests.count_documents({"firm_id": fid, "status": "pending"})
    return {
        "matters_total": await db.matters.count_documents({"firm_id": fid}),
        "contacts_total": await db.contacts.count_documents({"firm_id": fid}),
        "documents_total": await db.documents.count_documents({"firm_id": fid}),
        "open_tasks": await db.tasks.count_documents({"firm_id": fid, "status": {"$ne": "done"}}),
        "webhook_endpoints_active": webhook_endpoints,
        "webhook_deliveries_logged": webhook_deliveries_24h,
        "portal_messages_unread": portal_messages_unread,
        "pending_sign_requests": pending_signatures,
        "programPhase": PROGRAM_PHASE,
    }


# include + middleware
from identity_verification import register_identity_verification_routes
from rbac import require_permission
from audit import log_audit, register_audit_routes
from billing import register_billing_routes
from workflows import ensure_firm_workflows, register_workflow_routes, run_workflow_trigger
from marketplace_tools import register_marketplace_routes
from team_mgmt import register_team_routes
from portal import register_portal_routes, register_upload_routes
from esign import register_esign_routes
from document_pdf import register_document_pdf_routes
from db_indexes import ensure_indexes
from outgoing_webhooks import register_webhook_routes
from csv_import import register_csv_import_routes
from api_keys import register_api_key_routes
from training import register_training_routes
from training_templates import register_training_template_routes
from pi_documents import register_pi_document_routes, validate_upload_taxonomy, folder_for_doc_type, merge_doc_taxonomy
from pi_phases import default_pi_phase, register_pi_phase_routes, merge_pi_phase, compute_phase_audit
from pi_demand import default_pi_demand, register_pi_demand_routes, merge_pi_demand
from pi_settlement import default_pi_settlement, register_pi_settlement_routes
from pi_property_damage import default_pi_property_damage, register_pi_property_damage_routes, merge_pi_property_damage, compute_pd_summary
from pi_client_comms import default_pi_comms, register_pi_comms_routes, merge_pi_comms, compute_comms_cadence
from pi_audit_dashboard import register_pi_audit_routes
from pi_subrogation import default_pi_subrogation, register_pi_subrogation_routes, merge_pi_subrogation, compute_subrogation_alerts
from disclosure import register_disclosure_routes, require_disclosure_ack, user_needs_disclosure
from pi_meds import (
    register_pi_meds_routes,
    summarize_ledger,
    compute_matter_treatment_alerts,
    enrich_ledger_items,
    merge_ledger_row,
)
from pi_intake import default_pi_intake, register_pi_intake_routes, merge_pi_intake
from pi_insurance import default_pi_insurance, register_pi_insurance_routes, merge_pi_insurance

register_identity_verification_routes(api, db, JWT_SECRET, get_current_user, new_id, now)
register_audit_routes(api, db, get_current_user, require_permission, new_id, now)
register_billing_routes(api, db, get_current_user, require_permission, new_id, now, log_audit)
register_workflow_routes(api, db, get_current_user, require_permission, new_id, now, log_audit)
register_marketplace_routes(api, db, get_current_user, require_permission, new_id, now, log_audit)
register_team_routes(
    api, db, get_current_user, require_permission, hash_pw, make_token,
    new_id, now, log_audit, ensure_firm_workflows,
)
register_portal_routes(
    api, db, JWT_SECRET, get_current_user, require_permission, new_id, now, log_audit,
)
register_upload_routes(api, db, new_id, now, log_audit)
register_esign_routes(
    api, db, get_current_user, require_permission, new_id, now, log_audit,
)
register_document_pdf_routes(
    api, db, get_current_user, require_permission, new_id, now, log_audit,
)
register_webhook_routes(
    api, db, get_current_user, require_permission, new_id, now, log_audit,
)
register_csv_import_routes(
    api, db, get_current_user, require_permission, new_id, now, log_audit, gen_patient_id,
)
register_api_key_routes(
    api, db, get_current_user, require_permission, new_id, now, log_audit,
)
register_training_routes(api, get_current_user)


async def _firm_name_for_user(user: dict) -> Optional[str]:
    firm = await _firm_for_user(user)
    return firm.get("name") if firm else None


async def _firm_for_user(user: dict) -> Optional[dict]:
    firm_id = user.get("firm_id")
    if not firm_id:
        return None
    return await db.firms.find_one({"id": firm_id}, {"_id": 0})


register_training_template_routes(
    api, get_current_user, get_firm_name=_firm_name_for_user, get_firm_for_user=_firm_for_user
)
register_pi_intake_routes(api, db, get_current_user, now_iso=now)
register_pi_insurance_routes(api, db, get_current_user, now_iso=now)
register_pi_meds_routes(api, db, get_current_user, new_id=new_id, now_iso=now)
register_pi_document_routes(api, db, get_current_user, now_iso=now)
register_pi_phase_routes(
    api,
    db,
    get_current_user,
    new_id=new_id,
    now_iso=now,
    merge_pi_intake=merge_pi_intake,
    merge_pi_insurance=merge_pi_insurance,
    summarize_ledger=summarize_ledger,
    compute_matter_treatment_alerts=compute_matter_treatment_alerts,
    enrich_ledger_items=enrich_ledger_items,
)
register_pi_demand_routes(
    api,
    db,
    get_current_user,
    new_id=new_id,
    now_iso=now,
    merge_pi_insurance=merge_pi_insurance,
    merge_ledger_row=merge_ledger_row,
)
register_pi_settlement_routes(
    api,
    db,
    get_current_user,
    new_id=new_id,
    now_iso=now,
    merge_ledger_row=merge_ledger_row,
)
register_pi_property_damage_routes(
    api,
    db,
    get_current_user,
    new_id=new_id,
    now_iso=now,
)
register_pi_comms_routes(
    api,
    db,
    get_current_user,
    new_id=new_id,
    now_iso=now,
    merge_pi_property_damage=merge_pi_property_damage,
    compute_pd_summary=compute_pd_summary,
)
register_pi_audit_routes(
    api,
    db,
    get_current_user,
    merge_pi_intake=merge_pi_intake,
    merge_pi_insurance=merge_pi_insurance,
    merge_pi_phase=merge_pi_phase,
    merge_pi_demand=merge_pi_demand,
    merge_pi_property_damage=merge_pi_property_damage,
    merge_pi_comms=merge_pi_comms,
    merge_pi_subrogation=merge_pi_subrogation,
    merge_ledger_row=merge_ledger_row,
    summarize_ledger=summarize_ledger,
    compute_matter_treatment_alerts=compute_matter_treatment_alerts,
    compute_phase_audit=compute_phase_audit,
    compute_pd_summary=compute_pd_summary,
    compute_comms_cadence=compute_comms_cadence,
    compute_subrogation_alerts=compute_subrogation_alerts,
)
register_pi_subrogation_routes(
    api,
    db,
    get_current_user,
    now_iso=now,
    merge_pi_intake=merge_pi_intake,
)
register_disclosure_routes(
    api,
    db,
    get_current_user,
    new_id=new_id,
    now_iso=now,
    log_audit=log_audit,
)


@api.get("/firm/white-label")
async def get_firm_white_label(user=Depends(get_current_user)):
    from training_templates import WHITE_LABEL_PLACEHOLDERS, build_firm_merge_tokens

    firm = await _firm_for_user(user)
    wl = ((firm or {}).get("settings") or {}).get("white_label") or {}
    return {
        "white_label": wl,
        "tokens_preview": build_firm_merge_tokens(firm, user),
        "keys": list(WHITE_LABEL_PLACEHOLDERS),
    }


@api.patch("/firm/white-label")
async def patch_firm_white_label(body: dict, user=Depends(require_permission("settings.write", get_current_user))):
    from training_templates import WHITE_LABEL_PROFILE_FIELDS

    allowed = set(WHITE_LABEL_PROFILE_FIELDS)
    patch = {k: str(v)[:500] for k, v in body.items() if k in allowed}
    firm = await db.firms.find_one({"id": user["firm_id"]}, {"_id": 0, "settings": 1})
    settings = firm.get("settings") or {}
    wl = settings.get("white_label") or {}
    wl.update(patch)
    settings["white_label"] = wl
    await db.firms.update_one({"id": user["firm_id"]}, {"$set": {"settings": settings}})
    await log_audit(
        db,
        firm_id=user["firm_id"],
        actor_id=user["id"],
        actor_name=user["name"],
        action="firm.white_label_updated",
        resource_type="firm",
        resource_id=user["firm_id"],
        detail={"keys": list(patch.keys())},
        new_id=new_id,
        now_iso=now,
    )
    return await get_firm_white_label(user)


@api.patch("/firm/settings")
async def patch_firm_settings(
    updates: dict,
    user=Depends(require_permission("settings.write", get_current_user)),
):
    allowed = {"name", "settings", "subscription_tier", "billing_contact"}
    patch = {k: v for k, v in updates.items() if k in allowed}
    if not patch:
        return await db.firms.find_one({"id": user["firm_id"]}, {"_id": 0})
    await db.firms.update_one({"id": user["firm_id"]}, {"$set": patch})
    await log_audit(
        db,
        firm_id=user["firm_id"],
        actor_id=user["id"],
        actor_name=user["name"],
        action="firm.settings_updated",
        resource_type="firm",
        resource_id=user["firm_id"],
        detail={"keys": list(patch.keys())},
        new_id=new_id,
        now_iso=now,
    )
    return await db.firms.find_one({"id": user["firm_id"]}, {"_id": 0})


@api.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: str,
    user=Depends(require_permission("documents.write", get_current_user)),
):
    res = await db.documents.delete_one({"id": doc_id, "firm_id": user["firm_id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Document not found")
    await log_audit(
        db,
        firm_id=user["firm_id"],
        actor_id=user["id"],
        actor_name=user["name"],
        action="document.deleted",
        resource_type="document",
        resource_id=doc_id,
        new_id=new_id,
        now_iso=now,
    )
    return {"ok": True}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_db():
    try:
        await ensure_indexes(db)
        log.info("MongoDB indexes ensured")
    except Exception as e:
        log.warning("Index setup skipped: %s", e)


@app.on_event("shutdown")
async def shutdown_db():
    mongo_client.close()
