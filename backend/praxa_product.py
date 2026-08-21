"""
Praxa HQ — consumer companion API (journal, coach helpers, doctor match).

Registered from server.py. Auth: Bearer praxa JWT (firm claim "praxa").
"""
from __future__ import annotations

import base64
import csv
import io
import os
import re
from typing import Any, Callable, Optional

from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from praxa_stripe import (
    SKU_PREMIUM,
    SKU_SECOND_OPINION,
    apply_checkout_completed,
    checkout_disabled_message,
    checkout_enabled,
    create_checkout_session,
    frontend_base_url,
    verify_and_parse_webhook,
)


MAX_PHOTO_BYTES = 280_000  # ~280KB data URL payload after base64
MAX_DOCUMENT_DATA_URL = 400_000  # data URL char cap — same spirit as photo limits
_OPINION_URGENCY = {"normal", "soon", "urgent"}
# Free tier: one educational estimate. Premium: unlimited. No live Stripe yet.
FREE_ESTIMATE_RUNS = 1
_DEFAULT_PREMIUM_CODES = "PRAXA-PREMIUM"
SYMPTOM_ALLOW = {
    "neck",
    "back",
    "headache",
    "shoulder",
    "knee",
    "hip",
    "sleep",
    "anxiety",
    "numbness",
    "dizziness",
    "other",
}


class PraxaProfilePatch(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    incident_date: Optional[str] = None


class PraxaJournalIn(BaseModel):
    pain_level: int = Field(ge=0, le=10)
    notes: str = ""
    symptoms: list[str] = Field(default_factory=list)
    sleep_quality: Optional[int] = Field(default=None, ge=1, le=5)
    activities_affected: str = ""
    photo_data_url: Optional[str] = None


class DoctorMatchIn(BaseModel):
    zip_code: str
    specialty: str = "general"
    notes: str = ""
    prefer_lop: bool = True


class SettlementEstimateIn(BaseModel):
    """Educational band inputs — not a case valuation."""

    injury_category: str = Field(
        description="soft_tissue | fracture | disc | surgery | catastrophic"
    )
    severity: int = Field(ge=1, le=5, description="1 mild … 5 severe within category")
    treatment: str = Field(description="none | conservative | ongoing | surgery_done")
    liability: str = Field(description="disputed | unclear | clear")
    state: str = "CA"


class UpgradeInterestIn(BaseModel):
    note: str = ""


class RedeemCodeIn(BaseModel):
    code: str


class SecondOpinionIn(BaseModel):
    summary: str
    goals: str = ""
    urgency: str = "normal"  # normal | soon | urgent


class CheckoutIn(BaseModel):
    sku: str  # premium | second_opinion


class DocumentIn(BaseModel):
    name: str
    data_url: str
    mime: Optional[str] = None


def _premium_codes() -> set[str]:
    raw = os.environ.get("PRAXA_PREMIUM_CODES", _DEFAULT_PREMIUM_CODES)
    return {c.strip().upper() for c in raw.split(",") if c.strip()}


def _normalize_plan(user: Optional[dict]) -> str:
    if not user:
        return "free"
    plan = (user.get("plan") or "free").strip().lower()
    return plan if plan in {"free", "premium"} else "free"


# Educational midpoint anchors (USD). Wide bands on purpose — not market comps DB.
_ESTIMATE_BASE = {
    "soft_tissue": (8_000, 18_000, 40_000),
    "fracture": (25_000, 75_000, 180_000),
    "disc": (50_000, 125_000, 275_000),
    "surgery": (100_000, 250_000, 550_000),
    "catastrophic": (500_000, 1_500_000, 5_000_000),
}

_TREATMENT_MULT = {
    "none": 0.65,
    "conservative": 1.0,
    "ongoing": 1.15,
    "surgery_done": 1.35,
}

_LIABILITY_MULT = {
    "disputed": 0.55,
    "unclear": 0.85,
    "clear": 1.15,
}


def compute_settlement_estimate(body: SettlementEstimateIn) -> dict:
    cat = (body.injury_category or "").strip().lower()
    if cat not in _ESTIMATE_BASE:
        raise HTTPException(
            400,
            f"injury_category must be one of {sorted(_ESTIMATE_BASE)}",
        )
    treatment = (body.treatment or "").strip().lower()
    if treatment not in _TREATMENT_MULT:
        raise HTTPException(400, f"treatment must be one of {sorted(_TREATMENT_MULT)}")
    liability = (body.liability or "").strip().lower()
    if liability not in _LIABILITY_MULT:
        raise HTTPException(400, f"liability must be one of {sorted(_LIABILITY_MULT)}")

    low0, mid0, high0 = _ESTIMATE_BASE[cat]
    # Severity 1→0.75 … 5→1.35 of mid-band spread
    sev = 0.75 + (body.severity - 1) * 0.15
    t_m = _TREATMENT_MULT[treatment]
    l_m = _LIABILITY_MULT[liability]
    factor = sev * t_m * l_m

    def _round_band(n: float) -> int:
        if n >= 1_000_000:
            return int(round(n / 50_000) * 50_000)
        if n >= 100_000:
            return int(round(n / 5_000) * 5_000)
        return int(round(n / 1_000) * 1_000)

    low = _round_band(low0 * factor)
    mid = _round_band(mid0 * factor)
    high = _round_band(high0 * factor)
    if low > mid:
        low = mid
    if high < mid:
        high = mid

    return {
        "currency": "USD",
        "band": {"low": low, "mid": mid, "high": high},
        "inputs": {
            "injury_category": cat,
            "severity": body.severity,
            "treatment": treatment,
            "liability": liability,
            "state": (body.state or "CA").upper()[:2],
        },
        "methodology": (
            "Deterministic educational ranges from category anchors × severity × "
            "treatment × liability clarity. Not pulled from a live verdicts database."
        ),
        "disclaimer": (
            "This is NOT a settlement valuation, demand number, or legal advice. "
            "Real outcomes depend on medical proof, venue, insurance limits, liens, "
            "comparative fault, and counsel strategy. Talk to a licensed attorney "
            "before relying on any number."
        ),
        "next_steps": [
            "Keep your symptom journal accurate and exportable",
            "Do not sign a release without attorney review",
            "For a free case review: goldmedalinjury.com/free-consultation",
        ],
    }


def register_praxa_product_routes(
    api: APIRouter,
    db: Any,
    *,
    new_id: Callable[[], str],
    now: Callable[[], str],
    decode_token: Callable[[str], dict],
) -> None:
    def _auth(authorization: Optional[str]) -> dict:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(401, "Sign in to Praxa to continue")
        try:
            payload = decode_token(authorization.replace("Bearer ", ""))
        except Exception as e:  # noqa: BLE001
            raise HTTPException(401, "Invalid or expired session") from e
        if payload.get("firm") != "praxa":
            raise HTTPException(401, "Praxa session required")
        return payload

    def _clean_symptoms(raw: list[str]) -> list[str]:
        out = []
        for s in raw or []:
            key = re.sub(r"[^a-z]", "", str(s).lower())
            if key in SYMPTOM_ALLOW and key not in out:
                out.append(key)
        return out[:12]

    def _validate_photo(data_url: Optional[str]) -> Optional[str]:
        if not data_url:
            return None
        if not isinstance(data_url, str) or not data_url.startswith("data:image/"):
            raise HTTPException(400, "Photo must be an image data URL")
        if len(data_url) > MAX_PHOTO_BYTES:
            raise HTTPException(400, "Photo too large — use a smaller image")
        try:
            header, b64 = data_url.split(",", 1)
            if "base64" not in header:
                raise ValueError("not base64")
            raw = base64.b64decode(b64, validate=False)
            if len(raw) > 200_000:
                raise HTTPException(400, "Photo too large after decode")
        except HTTPException:
            raise
        except Exception as e:  # noqa: BLE001
            raise HTTPException(400, f"Invalid photo: {e}") from e
        return data_url

    def _validate_document_data_url(data_url: str) -> str:
        if not isinstance(data_url, str) or not data_url.startswith("data:"):
            raise HTTPException(400, "File must be a data URL (data:*;base64,…)")
        if len(data_url) > MAX_DOCUMENT_DATA_URL:
            raise HTTPException(400, "File too large — use a smaller attachment")
        if ";base64," not in data_url:
            raise HTTPException(400, "File must be base64-encoded in the data URL")
        try:
            _, b64 = data_url.split(",", 1)
            base64.b64decode(b64, validate=False)
        except Exception as e:  # noqa: BLE001
            raise HTTPException(400, f"Invalid file data: {e}") from e
        return data_url

    def _normalize_urgency(raw: str) -> str:
        u = (raw or "normal").strip().lower()
        if u not in _OPINION_URGENCY:
            raise HTTPException(400, f"urgency must be one of {sorted(_OPINION_URGENCY)}")
        return u

    async def _load_user(uid: str) -> dict:
        user = await db.praxa_users.find_one({"id": uid}, {"_id": 0})
        if not user:
            raise HTTPException(404, "Account not found")
        plan = _normalize_plan(user)
        if user.get("plan") != plan:
            await db.praxa_users.update_one({"id": uid}, {"$set": {"plan": plan}})
            user["plan"] = plan
        return user

    @api.get("/praxa/me")
    async def praxa_me(authorization: Optional[str] = Header(None)):
        payload = _auth(authorization)
        user = await _load_user(payload["sub"])
        runs = await db.praxa_estimate_runs.count_documents({"user_id": payload["sub"]})
        card_checkout = checkout_enabled()
        return {
            "user": user,
            "entitlements": {
                "plan": _normalize_plan(user),
                "estimate_runs_used": runs,
                "estimate_runs_free_limit": FREE_ESTIMATE_RUNS,
                "estimates_unlimited": _normalize_plan(user) == "premium",
                "card_checkout": card_checkout,
                "checkout_note": (
                    "Subscribe with card from Account — Premium $9.99/mo or Second Opinion $99."
                    if card_checkout
                    else "Card billing is not live yet. Request Premium interest or redeem a code."
                ),
            },
        }

    @api.patch("/praxa/me")
    async def praxa_patch_me(body: PraxaProfilePatch, authorization: Optional[str] = Header(None)):
        payload = _auth(authorization)
        update = {k: v for k, v in body.model_dump().items() if v is not None and str(v).strip()}
        if not update:
            raise HTTPException(400, "Nothing to update")
        if "name" in update:
            update["name"] = update["name"].strip()[:120]
        if "phone" in update:
            update["phone"] = update["phone"].strip()[:40]
        await db.praxa_users.update_one({"id": payload["sub"]}, {"$set": update})
        user = await _load_user(payload["sub"])
        return {"user": user}

    @api.post("/praxa/upgrade-interest")
    async def praxa_upgrade_interest(
        body: UpgradeInterestIn, authorization: Optional[str] = Header(None)
    ):
        """Honest waitlist — no Stripe charge. Staff can later grant plan=premium."""
        payload = _auth(authorization)
        user = await _load_user(payload["sub"])
        if _normalize_plan(user) == "premium":
            return {"ok": True, "already_premium": True, "message": "You already have Premium."}
        doc = {
            "id": new_id(),
            "user_id": payload["sub"],
            "email": user.get("email"),
            "name": user.get("name"),
            "note": (body.note or "").strip()[:1000],
            "created_at": now(),
            "status": "queued",
        }
        await db.praxa_upgrade_interest.insert_one(doc)
        doc.pop("_id", None)
        if checkout_enabled():
            msg = (
                "Thanks — we recorded your interest. You can also subscribe instantly from "
                "Account when card checkout is enabled on this environment."
            )
        else:
            msg = (
                "Thanks — we recorded your Premium interest. Card checkout is not live yet; "
                "a coordinator can unlock Premium when you're ready."
            )
        return {"ok": True, "interest": doc, "message": msg}

    @api.post("/praxa/redeem-code")
    async def praxa_redeem_code(
        body: RedeemCodeIn, authorization: Optional[str] = Header(None)
    ):
        payload = _auth(authorization)
        code = (body.code or "").strip().upper()
        if not code or code not in _premium_codes():
            raise HTTPException(400, "Invalid or expired code")
        await db.praxa_users.update_one(
            {"id": payload["sub"]},
            {"$set": {"plan": "premium", "premium_unlocked_at": now(), "premium_code": code}},
        )
        user = await _load_user(payload["sub"])
        return {"ok": True, "user": user, "message": "Premium unlocked."}

    @api.post("/praxa/checkout")
    async def praxa_checkout(body: CheckoutIn, authorization: Optional[str] = Header(None)):
        if not checkout_enabled():
            raise HTTPException(503, checkout_disabled_message())
        payload = _auth(authorization)
        user = await _load_user(payload["sub"])
        sku = (body.sku or "").strip().lower()
        if sku not in {SKU_PREMIUM, SKU_SECOND_OPINION}:
            raise HTTPException(400, f"sku must be premium or second_opinion")
        if sku == SKU_PREMIUM and _normalize_plan(user) == "premium":
            raise HTTPException(400, "You already have Premium.")
        base = frontend_base_url()
        success_url = f"{base}/praxa/app?checkout=success&session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{base}/praxa/app?checkout=cancel"
        try:
            session = create_checkout_session(user, sku, success_url, cancel_url)
        except ValueError as e:
            raise HTTPException(400, str(e)) from e
        except RuntimeError as e:
            raise HTTPException(502, str(e)) from e
        return session

    @api.post("/praxa/stripe/webhook")
    async def praxa_stripe_webhook(request: Request):
        payload = await request.body()
        sig = request.headers.get("stripe-signature") or request.headers.get("Stripe-Signature")
        try:
            event = verify_and_parse_webhook(payload, sig)
        except ValueError as e:
            raise HTTPException(400, str(e)) from e
        if event.get("type") == "checkout.session.completed":
            session_obj = (event.get("data") or {}).get("object") or {}
            try:
                await apply_checkout_completed(db, session_obj, now())
            except ValueError as e:
                raise HTTPException(400, str(e)) from e
        return {"received": True}

    @api.post("/praxa/journal")
    async def praxa_journal_create(entry: PraxaJournalIn, authorization: Optional[str] = Header(None)):
        payload = _auth(authorization)
        photo = _validate_photo(entry.photo_data_url)
        doc = {
            "id": new_id(),
            "user_id": payload["sub"],
            "pain_level": entry.pain_level,
            "notes": (entry.notes or "").strip()[:4000],
            "symptoms": _clean_symptoms(entry.symptoms),
            "sleep_quality": entry.sleep_quality,
            "activities_affected": (entry.activities_affected or "").strip()[:500],
            "photo_data_url": photo,
            "has_photo": bool(photo),
            "created_at": now(),
        }
        await db.praxa_journal.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @api.get("/praxa/journal")
    async def praxa_journal_list(authorization: Optional[str] = Header(None)):
        payload = _auth(authorization)
        rows = await db.praxa_journal.find(
            {"user_id": payload["sub"]},
            {"_id": 0, "photo_data_url": 0},
        ).sort("created_at", -1).to_list(500)
        for r in rows:
            r["has_photo"] = bool(r.get("has_photo"))
        return rows

    @api.get("/praxa/journal/export.csv")
    async def praxa_journal_export(authorization: Optional[str] = Header(None)):
        payload = _auth(authorization)
        rows = await db.praxa_journal.find(
            {"user_id": payload["sub"]}, {"_id": 0, "photo_data_url": 0}
        ).sort("created_at", 1).to_list(2000)
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(
            [
                "created_at",
                "pain_level",
                "sleep_quality",
                "symptoms",
                "activities_affected",
                "notes",
                "has_photo",
            ]
        )
        for r in rows:
            w.writerow(
                [
                    r.get("created_at", ""),
                    r.get("pain_level", ""),
                    r.get("sleep_quality", ""),
                    ";".join(r.get("symptoms") or []),
                    r.get("activities_affected", ""),
                    (r.get("notes") or "").replace("\n", " "),
                    "yes" if r.get("has_photo") else "no",
                ]
            )
        return StreamingResponse(
            iter([buf.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="praxa-journal.csv"'},
        )

    @api.get("/praxa/journal/{entry_id}")
    async def praxa_journal_one(entry_id: str, authorization: Optional[str] = Header(None)):
        payload = _auth(authorization)
        doc = await db.praxa_journal.find_one(
            {"id": entry_id, "user_id": payload["sub"]}, {"_id": 0}
        )
        if not doc:
            raise HTTPException(404)
        return doc

    @api.delete("/praxa/journal/{entry_id}")
    async def praxa_journal_delete(entry_id: str, authorization: Optional[str] = Header(None)):
        payload = _auth(authorization)
        res = await db.praxa_journal.delete_one({"id": entry_id, "user_id": payload["sub"]})
        if res.deleted_count == 0:
            raise HTTPException(404)
        return {"ok": True}

    @api.post("/praxa/doctor-match")
    async def praxa_doctor_match(body: DoctorMatchIn, authorization: Optional[str] = Header(None)):
        payload = _auth(authorization)
        user = await _load_user(payload["sub"])
        consumer_plan = _normalize_plan(user)
        zip_code = re.sub(r"[^0-9]", "", body.zip_code)[:10]
        if len(zip_code) < 5:
            raise HTTPException(400, "Enter a valid ZIP code")
        doc = {
            "id": new_id(),
            "user_id": payload["sub"],
            "zip_code": zip_code,
            "specialty": (body.specialty or "general").strip()[:80],
            "notes": (body.notes or "").strip()[:2000],
            "prefer_lop": bool(body.prefer_lop),
            "status": "queued",
            "created_at": now(),
            "consumer_plan": consumer_plan,
            "priority": consumer_plan == "premium",
        }
        await db.praxa_doctor_requests.insert_one(doc)
        doc.pop("_id", None)
        return {
            "ok": True,
            "request": doc,
            "message": (
                "Match request received. A coordinator will follow up with vetted options "
                "near your ZIP. This is not an instant directory listing."
            ),
        }

    _MATCH_CONSUMER_PROJ = {
        "_id": 0,
        "staff_notes": 0,
        "assigned_to": 0,
        "updated_by": 0,
        "updated_by_email": 0,
    }

    @api.get("/praxa/doctor-match")
    async def praxa_doctor_match_list(authorization: Optional[str] = Header(None)):
        payload = _auth(authorization)
        return await db.praxa_doctor_requests.find(
            {"user_id": payload["sub"]}, _MATCH_CONSUMER_PROJ
        ).sort("created_at", -1).to_list(50)

    _OPINION_CONSUMER_PROJ = {
        "_id": 0,
        "staff_notes": 0,
        "updated_by": 0,
        "updated_by_email": 0,
    }

    @api.post("/praxa/second-opinion")
    async def praxa_second_opinion_create(
        body: SecondOpinionIn, authorization: Optional[str] = Header(None)
    ):
        payload = _auth(authorization)
        user = await _load_user(payload["sub"])
        summary = (body.summary or "").strip()
        if len(summary) < 10:
            raise HTTPException(400, "Add a short summary (at least 10 characters)")
        plan = _normalize_plan(user)
        doc = {
            "id": new_id(),
            "user_id": payload["sub"],
            "email": user.get("email"),
            "name": user.get("name"),
            "summary": summary[:4000],
            "goals": (body.goals or "").strip()[:2000],
            "urgency": _normalize_urgency(body.urgency),
            "status": "queued",
            "created_at": now(),
            "plan": plan,
        }
        await db.praxa_second_opinion.insert_one(doc)
        doc.pop("_id", None)
        return {
            "ok": True,
            "request": doc,
            "message": (
                "Second opinion request queued. A coordinator will review — "
                "no card charge from this app. Partner review is arranged separately."
            ),
        }

    @api.get("/praxa/second-opinion")
    async def praxa_second_opinion_list(authorization: Optional[str] = Header(None)):
        payload = _auth(authorization)
        return await db.praxa_second_opinion.find(
            {"user_id": payload["sub"]}, _OPINION_CONSUMER_PROJ
        ).sort("created_at", -1).to_list(50)

    @api.post("/praxa/documents")
    async def praxa_document_create(body: DocumentIn, authorization: Optional[str] = Header(None)):
        payload = _auth(authorization)
        await _load_user(payload["sub"])
        name = (body.name or "").strip()[:200]
        if not name:
            raise HTTPException(400, "Document name required")
        data_url = _validate_document_data_url(body.data_url)
        mime = (body.mime or "").strip()[:120] or None
        if not mime and ";" in data_url.split(",", 1)[0]:
            mime = data_url.split(",", 1)[0].replace("data:", "").split(";")[0] or None
        doc = {
            "id": new_id(),
            "user_id": payload["sub"],
            "name": name,
            "data_url": data_url,
            "mime": mime,
            "has_file": True,
            "created_at": now(),
        }
        await db.praxa_documents.insert_one(doc)
        doc.pop("_id", None)
        doc.pop("data_url", None)
        return doc

    @api.get("/praxa/documents")
    async def praxa_document_list(authorization: Optional[str] = Header(None)):
        payload = _auth(authorization)
        rows = await db.praxa_documents.find(
            {"user_id": payload["sub"]}, {"_id": 0, "data_url": 0}
        ).sort("created_at", -1).to_list(200)
        for r in rows:
            r["has_file"] = bool(r.get("has_file", True))
        return rows

    @api.get("/praxa/documents/{doc_id}")
    async def praxa_document_one(doc_id: str, authorization: Optional[str] = Header(None)):
        payload = _auth(authorization)
        doc = await db.praxa_documents.find_one(
            {"id": doc_id, "user_id": payload["sub"]}, {"_id": 0}
        )
        if not doc:
            raise HTTPException(404)
        return doc

    @api.delete("/praxa/documents/{doc_id}")
    async def praxa_document_delete(doc_id: str, authorization: Optional[str] = Header(None)):
        payload = _auth(authorization)
        res = await db.praxa_documents.delete_one({"id": doc_id, "user_id": payload["sub"]})
        if res.deleted_count == 0:
            raise HTTPException(404)
        return {"ok": True}

    @api.get("/praxa/export.json")
    async def praxa_full_export(authorization: Optional[str] = Header(None)):
        payload = _auth(authorization)
        user = await db.praxa_users.find_one({"id": payload["sub"]}, {"_id": 0})
        journal = await db.praxa_journal.find(
            {"user_id": payload["sub"]}, {"_id": 0, "photo_data_url": 0}
        ).sort("created_at", 1).to_list(2000)
        matches = await db.praxa_doctor_requests.find(
            {"user_id": payload["sub"]}, _MATCH_CONSUMER_PROJ
        ).sort("created_at", 1).to_list(100)
        estimates = await db.praxa_estimate_runs.find(
            {"user_id": payload["sub"]}, {"_id": 0}
        ).sort("created_at", 1).to_list(100)
        opinions = await db.praxa_second_opinion.find(
            {"user_id": payload["sub"]}, _OPINION_CONSUMER_PROJ
        ).sort("created_at", 1).to_list(100)
        documents = await db.praxa_documents.find(
            {"user_id": payload["sub"]},
            {"_id": 0, "id": 1, "name": 1, "mime": 1, "created_at": 1, "has_file": 1},
        ).sort("created_at", 1).to_list(500)
        return {
            "exported_at": now(),
            "user": user,
            "journal": journal,
            "doctor_match_requests": matches,
            "settlement_estimates": estimates,
            "second_opinion": opinions,
            "documents": documents,
            "notice": (
                "Photos and file blobs omitted from bulk export — open an entry or document "
                "to view attachments. Estimates are educational only."
            ),
        }

    @api.get("/praxa/settlement-estimate")
    async def praxa_settlement_estimate_list(authorization: Optional[str] = Header(None)):
        payload = _auth(authorization)
        return await db.praxa_estimate_runs.find(
            {"user_id": payload["sub"]}, {"_id": 0}
        ).sort("created_at", -1).to_list(30)

    @api.post("/praxa/settlement-estimate")
    async def praxa_settlement_estimate(
        body: SettlementEstimateIn, authorization: Optional[str] = Header(None)
    ):
        payload = _auth(authorization)
        user = await _load_user(payload["sub"])
        plan = _normalize_plan(user)
        used = await db.praxa_estimate_runs.count_documents({"user_id": payload["sub"]})
        if plan != "premium" and used >= FREE_ESTIMATE_RUNS:
            card_checkout = checkout_enabled()
            raise HTTPException(
                status_code=402,
                detail={
                    "code": "premium_required",
                    "message": (
                        "Free includes one educational estimate. Subscribe to Premium "
                        "($9.99/mo) from Account for unlimited runs."
                        if card_checkout
                        else (
                            "Free includes one educational estimate. Upgrade to Premium for "
                            "unlimited runs — card checkout is not live yet; request Premium "
                            "or redeem a code."
                        )
                    ),
                    "estimate_runs_used": used,
                    "estimate_runs_free_limit": FREE_ESTIMATE_RUNS,
                    "card_checkout": card_checkout,
                },
            )
        result = compute_settlement_estimate(body)
        run_id = new_id()
        await db.praxa_estimate_runs.insert_one(
            {
                "id": run_id,
                "user_id": payload["sub"],
                "created_at": now(),
                "inputs": result["inputs"],
                "band": result["band"],
            }
        )
        return {
            **result,
            "id": run_id,
            "plan": plan,
            "estimate_runs_remaining": None
            if plan == "premium"
            else max(0, FREE_ESTIMATE_RUNS - used - 1),
        }
