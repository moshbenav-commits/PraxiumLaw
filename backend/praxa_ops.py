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
UPGRADE_INTEREST_STATUS = {"queued", "contacted", "granted", "closed"}
OPINION_OPS_STATUS = {"queued", "reviewing", "delivered", "closed", "declined"}


class DoctorMatchPatch(BaseModel):
    status: Optional[str] = None
    staff_notes: Optional[str] = None
    # Shown to the consumer in Praxa (keep short; not internal staff notes)
    consumer_message: Optional[str] = None
    assigned_to: Optional[str] = None


class ConsumerPlanPatch(BaseModel):
    plan: str = Field(description="free | premium")
    note: Optional[str] = None


class UpgradeInterestPatch(BaseModel):
    status: str


class SecondOpinionPatch(BaseModel):
    status: Optional[str] = None
    staff_notes: Optional[str] = None
    consumer_message: Optional[str] = None


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
                {"_id": 0, "id": 1, "email": 1, "name": 1, "phone": 1, "plan": 1},
            ):
                users_by_id[u["id"]] = u
        for r in rows:
            cu = users_by_id.get(r.get("user_id")) or {}
            plan = (cu.get("plan") or r.get("consumer_plan") or "free").strip().lower()
            if plan not in {"free", "premium"}:
                plan = "free"
            r["consumer"] = {
                "name": cu.get("name"),
                "email": cu.get("email"),
                "phone": cu.get("phone"),
                "plan": plan,
            }
            r["consumer_plan"] = plan
            if "priority" not in r:
                r["priority"] = plan == "premium"

        def _is_premium(row: dict) -> bool:
            return bool(
                row.get("priority")
                or row.get("consumer_plan") == "premium"
                or (row.get("consumer") or {}).get("plan") == "premium"
            )

        premium_rows = [r for r in rows if _is_premium(r)]
        other_rows = [r for r in rows if not _is_premium(r)]
        premium_rows.sort(key=lambda r: r.get("created_at") or "", reverse=True)
        other_rows.sort(key=lambda r: r.get("created_at") or "", reverse=True)
        rows = premium_rows + other_rows
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
        if body.consumer_message is not None:
            update["consumer_message"] = body.consumer_message.strip()[:500]
        if body.assigned_to is not None:
            update["assigned_to"] = body.assigned_to.strip()[:120]
        await db.praxa_doctor_requests.update_one({"id": request_id}, {"$set": update})
        out = await db.praxa_doctor_requests.find_one({"id": request_id}, {"_id": 0})
        return {"ok": True, "request": out}

    @api.get("/praxa-ops/upgrade-interest")
    async def ops_list_upgrade_interest(user=Depends(get_current_user)):
        rows = await db.praxa_upgrade_interest.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
        return {"interests": rows, "count": len(rows)}

    @api.patch("/praxa-ops/upgrade-interest/{interest_id}")
    async def ops_patch_upgrade_interest(
        interest_id: str,
        body: UpgradeInterestPatch,
        user=Depends(get_current_user),
    ):
        status = (body.status or "").strip().lower()
        if status not in UPGRADE_INTEREST_STATUS:
            raise HTTPException(
                400,
                f"status must be one of {sorted(UPGRADE_INTEREST_STATUS)}",
            )
        doc = await db.praxa_upgrade_interest.find_one({"id": interest_id}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Upgrade interest not found")
        update: dict[str, Any] = {
            "status": status,
            "updated_at": now(),
            "updated_by": user.get("id"),
            "updated_by_email": user.get("email"),
        }
        await db.praxa_upgrade_interest.update_one({"id": interest_id}, {"$set": update})
        if status == "granted" and doc.get("user_id"):
            await db.praxa_users.update_one(
                {"id": doc["user_id"]},
                {
                    "$set": {
                        "plan": "premium",
                        "plan_updated_at": now(),
                        "plan_updated_by": user.get("id"),
                        "plan_updated_by_email": user.get("email"),
                        "premium_unlocked_at": now(),
                    }
                },
            )
        out = await db.praxa_upgrade_interest.find_one({"id": interest_id}, {"_id": 0})
        return {"ok": True, "interest": out}

    @api.get("/praxa-ops/second-opinion")
    async def ops_list_second_opinion(user=Depends(get_current_user)):
        rows = await db.praxa_second_opinion.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
        return {"requests": rows, "count": len(rows)}

    @api.patch("/praxa-ops/second-opinion/{request_id}")
    async def ops_patch_second_opinion(
        request_id: str,
        body: SecondOpinionPatch,
        user=Depends(get_current_user),
    ):
        doc = await db.praxa_second_opinion.find_one({"id": request_id}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Second opinion request not found")
        update: dict[str, Any] = {
            "updated_at": now(),
            "updated_by": user.get("id"),
            "updated_by_email": user.get("email"),
        }
        if body.status is not None:
            status = body.status.strip().lower()
            if status not in OPINION_OPS_STATUS:
                raise HTTPException(
                    400,
                    f"status must be one of {sorted(OPINION_OPS_STATUS)}",
                )
            update["status"] = status
        if body.staff_notes is not None:
            update["staff_notes"] = body.staff_notes.strip()[:4000]
        if body.consumer_message is not None:
            update["consumer_message"] = body.consumer_message.strip()[:500]
        await db.praxa_second_opinion.update_one({"id": request_id}, {"$set": update})
        out = await db.praxa_second_opinion.find_one({"id": request_id}, {"_id": 0})
        return {"ok": True, "request": out}

    @api.patch("/praxa-ops/consumers/{user_id}/plan")
    async def ops_set_consumer_plan(
        user_id: str,
        body: ConsumerPlanPatch,
        user=Depends(get_current_user),
    ):
        plan = (body.plan or "").strip().lower()
        if plan not in {"free", "premium"}:
            raise HTTPException(400, "plan must be free or premium")
        doc = await db.praxa_users.find_one({"id": user_id}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Consumer not found")
        update = {
            "plan": plan,
            "plan_updated_at": now(),
            "plan_updated_by": user.get("id"),
            "plan_updated_by_email": user.get("email"),
        }
        if body.note:
            update["plan_note"] = body.note.strip()[:500]
        if plan == "premium":
            update["premium_unlocked_at"] = now()
        await db.praxa_users.update_one({"id": user_id}, {"$set": update})
        out = await db.praxa_users.find_one({"id": user_id}, {"_id": 0})
        return {"ok": True, "user": out}
