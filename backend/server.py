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
    return {"user": user, "firm": firm}


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
    doc.pop("_id", None)
    return doc


@api.get("/matters")
async def list_matters(status: Optional[str] = None, user=Depends(get_current_user)):
    q = {"firm_id": user["firm_id"]}
    if status:
        q["status"] = status
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
    updates["updated_at"] = now()
    updates.pop("id", None)
    updates.pop("firm_id", None)
    res = await db.matters.update_one({"id": matter_id, "firm_id": user["firm_id"]}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(404, "Matter not found")
    return await db.matters.find_one({"id": matter_id}, {"_id": 0})


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
    matter_id: str = Form(...), name: str = Form(...), folder: str = Form("General"),
    file: UploadFile = File(...), user=Depends(get_current_user),
):
    contents = await file.read()
    if len(contents) > 25 * 1024 * 1024:
        raise HTTPException(413, "File too large (25MB max)")
    b64 = base64.b64encode(contents).decode()
    doc = {
        "id": new_id(), "firm_id": user["firm_id"], "matter_id": matter_id,
        "name": name, "folder": folder, "content_type": file.content_type or "application/octet-stream",
        "size_bytes": len(contents), "data_b64": b64,
        "uploaded_by": user["id"], "uploaded_by_name": user["name"],
        "uploaded_at": now(), "version": 1,
        "client_visible": False,
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
        context={"matter_id": matter_id, "folder": folder, "name": name},
        user_id=user["id"],
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

    return {
        "open_matters": open_matters, "total_matters": total_matters,
        "open_tasks": open_tasks, "overdue_tasks": len(overdue),
        "new_leads": new_leads, "contacts_count": contacts_count,
        "pipeline": pipeline_counts, "recent_activity": recent_activity,
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
@api.get("/")
async def root():
    return {"app": "Praxium Suite", "status": "ok", "version": "0.2.0"}


@api.get("/health")
async def health():
    return {"ok": True, "ts": now()}


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
from db_indexes import ensure_indexes

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
