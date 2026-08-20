"""
Praxa HQ — firm ops for consumer doctor-match requests.

Staff use firm JWT (praxium_token). Consumer requests live in praxa_doctor_requests
without firm_id — this is an operator queue for the platform (GMI / Praxium staff).
"""
from __future__ import annotations

from typing import Any, Callable, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field


ALLOWED_STATUS = {"queued", "contacted", "matched", "closed", "declined"}


class DoctorMatchPatch(BaseModel):
    status: Optional[str] = None
    staff_notes: Optional[str] = None
    assigned_to: Optional[str] = None


def register_praxa_ops_routes(
    api: APIRouter,
    db: Any,
    get_current_user: Callable,
    *,
    now: Callable[[], str],
) -> None:
    @api.get("/praxa-ops/doctor-match")
    async def ops_list_doctor_match(
        status: Optional[str] = None,
        user=Depends(get_current_user),
    ):
        q: dict[str, Any] = {}
        if status and status != "all":
            if status not in ALLOWED_STATUS:
                raise HTTPException(400, f"status must be one of {sorted(ALLOWED_STATUS)}")
            q["status"] = status
        rows = await db.praxa_doctor_requests.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
        user_ids = list({r.get("user_id") for r in rows if r.get("user_id")})
        users_by_id = {}
        if user_ids:
            async for u in db.praxa_users.find(
                {"id": {"$in": user_ids}},
                {"_id": 0, "id": 1, "email": 1, "name": 1, "phone": 1},
            ):
                users_by_id[u["id"]] = u
        for r in rows:
            cu = users_by_id.get(r.get("user_id")) or {}
            r["consumer"] = {
                "name": cu.get("name"),
                "email": cu.get("email"),
                "phone": cu.get("phone"),
            }
        return {"requests": rows, "count": len(rows)}

    @api.get("/praxa-ops/doctor-match/summary")
    async def ops_doctor_match_summary(user=Depends(get_current_user)):
        pipeline = [{"$group": {"_id": "$status", "n": {"$sum": 1}}}]
        by_status = {}
        async for row in db.praxa_doctor_requests.aggregate(pipeline):
            by_status[row["_id"] or "unknown"] = row["n"]
        return {"by_status": by_status}

    @api.patch("/praxa-ops/doctor-match/{request_id}")
    async def ops_patch_doctor_match(
        request_id: str,
        body: DoctorMatchPatch,
        user=Depends(get_current_user),
    ):
        doc = await db.praxa_doctor_requests.find_one({"id": request_id}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Request not found")
        update: dict[str, Any] = {
            "updated_at": now(),
            "updated_by": user.get("id"),
            "updated_by_email": user.get("email"),
        }
        if body.status is not None:
            if body.status not in ALLOWED_STATUS:
                raise HTTPException(400, f"status must be one of {sorted(ALLOWED_STATUS)}")
            update["status"] = body.status
        if body.staff_notes is not None:
            update["staff_notes"] = body.staff_notes.strip()[:4000]
        if body.assigned_to is not None:
            update["assigned_to"] = body.assigned_to.strip()[:120]
        await db.praxa_doctor_requests.update_one({"id": request_id}, {"$set": update})
        out = await db.praxa_doctor_requests.find_one({"id": request_id}, {"_id": 0})
        return {"ok": True, "request": out}
