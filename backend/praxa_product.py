"""
Praxa HQ — consumer companion API (journal, coach helpers, doctor match).

Registered from server.py. Auth: Bearer praxa JWT (firm claim "praxa").
"""
from __future__ import annotations

import base64
import csv
import io
import re
from typing import Any, Callable, Optional

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field


MAX_PHOTO_BYTES = 280_000  # ~280KB data URL payload after base64
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
        payload = decode_token(authorization.replace("Bearer ", ""))
        if payload.get("firm") not in (None, "praxa") and payload.get("firm") != "praxa":
            # make_token(uid, "praxa") stores firm="praxa"
            pass
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

    @api.get("/praxa/me")
    async def praxa_me(authorization: Optional[str] = Header(None)):
        payload = _auth(authorization)
        user = await db.praxa_users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(404, "Account not found")
        return {"user": user}

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
        user = await db.praxa_users.find_one({"id": payload["sub"]}, {"_id": 0})
        return {"user": user}

    @api.post("/praxa/journal")
    async def praxa_journal_v2(entry: PraxaJournalIn, authorization: Optional[str] = Header(None)):
        """Supersedes loose dict handler when this module is registered after — see server wiring."""
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
            "created_at": now(),
        }
        await db.praxa_journal.insert_one(doc)
        doc.pop("_id", None)
        # Never return huge photo twice in list views — include once here
        return doc

    @api.get("/praxa/journal")
    async def praxa_get_journal_v2(authorization: Optional[str] = Header(None)):
        payload = _auth(authorization)
        rows = await db.praxa_journal.find(
            {"user_id": payload["sub"]},
            {"_id": 0, "photo_data_url": 0},
        ).sort("created_at", -1).to_list(500)
        # Attach has_photo flag via second pass for entries that have photos
        ids = [r["id"] for r in rows]
        if ids:
            with_photo = {
                d["id"]
                for d in await db.praxa_journal.find(
                    {"id": {"$in": ids}, "photo_data_url": {"$exists": True, "$ne": None}},
                    {"id": 1, "_id": 0},
                ).to_list(500)
            }
            for r in rows:
                r["has_photo"] = r["id"] in with_photo
        return rows

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
        # has_photo not on docs without second query — compute
        data = buf.getvalue()
        # Fix has_photo column properly
        buf2 = io.StringIO()
        w2 = csv.writer(buf2)
        w2.writerow(
            [
                "created_at",
                "pain_level",
                "sleep_quality",
                "symptoms",
                "activities_affected",
                "notes",
            ]
        )
        for r in rows:
            w2.writerow(
                [
                    r.get("created_at", ""),
                    r.get("pain_level", ""),
                    r.get("sleep_quality", ""),
                    ";".join(r.get("symptoms") or []),
                    r.get("activities_affected", ""),
                    (r.get("notes") or "").replace("\n", " "),
                ]
            )
        data = buf2.getvalue()
        return StreamingResponse(
            iter([data]),
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="praxa-journal.csv"'},
        )

    @api.post("/praxa/doctor-match")
    async def praxa_doctor_match(body: DoctorMatchIn, authorization: Optional[str] = Header(None)):
        payload = _auth(authorization)
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
        }
        await db.praxa_doctor_requests.insert_one(doc)
        doc.pop("_id", None)
        return {
            "ok": True,
            "request": doc,
            "message": (
                "Match request received. A coordinator will follow up with vetted options "
                "near your ZIP. This is not a live directory listing."
            ),
        }

    @api.get("/praxa/doctor-match")
    async def praxa_doctor_match_list(authorization: Optional[str] = Header(None)):
        payload = _auth(authorization)
        return await db.praxa_doctor_requests.find(
            {"user_id": payload["sub"]}, {"_id": 0}
        ).sort("created_at", -1).to_list(50)

    @api.get("/praxa/export.json")
    async def praxa_full_export(authorization: Optional[str] = Header(None)):
        payload = _auth(authorization)
        user = await db.praxa_users.find_one({"id": payload["sub"]}, {"_id": 0})
        journal = await db.praxa_journal.find(
            {"user_id": payload["sub"]}, {"_id": 0, "photo_data_url": 0}
        ).sort("created_at", 1).to_list(2000)
        matches = await db.praxa_doctor_requests.find(
            {"user_id": payload["sub"]}, {"_id": 0}
        ).sort("created_at", 1).to_list(100)
        return {
            "exported_at": now(),
            "user": user,
            "journal": journal,
            "doctor_match_requests": matches,
            "notice": "Photos omitted from bulk export — open individual entries to download images.",
        }
