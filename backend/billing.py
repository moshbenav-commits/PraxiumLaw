"""
Praxium Suite — billing stubs (v1 manual · v2 Stripe target).
"""
from __future__ import annotations

from typing import Any, Callable, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr


PLANS = [
    {
        "id": "starter",
        "name": "Starter",
        "price_monthly": 299,
        "seats_included": 3,
        "features": ["Matters & contacts", "Document vault", "LawMatch leads (5/mo)", "CoCounsel AI (limited)"],
    },
    {
        "id": "growth",
        "name": "Growth",
        "price_monthly": 599,
        "seats_included": 10,
        "features": ["Unlimited matters", "Workflow automations", "LawMatch unlimited", "MedConnect", "Priority support"],
    },
    {
        "id": "enterprise",
        "name": "Enterprise",
        "price_monthly": None,
        "seats_included": None,
        "features": ["Custom workflows", "Marketplace tool builds", "Dedicated CSM", "SLA", "SSO (planned)"],
    },
]


class UpgradeInquiry(BaseModel):
    plan_id: str
    message: Optional[str] = None
    contact_email: Optional[EmailStr] = None


def register_billing_routes(
    api: APIRouter,
    db: Any,
    get_current_user: Callable,
    require_permission: Callable,
    new_id: Callable[[], str],
    now_iso: Callable[[], str],
    log_audit: Callable,
) -> None:
    read_guard = require_permission("billing.read", get_current_user)
    write_guard = require_permission("billing.write", get_current_user)

    @api.get("/billing/plans")
    async def list_plans():
        return {"plans": PLANS}

    @api.get("/billing/subscription")
    async def get_subscription(user=Depends(read_guard)):
        firm = await db.firms.find_one({"id": user["firm_id"]}, {"_id": 0})
        if not firm:
            return {"tier": "starter", "status": "active"}
        seat_count = await db.users.count_documents({"firm_id": user["firm_id"]})
        pending_invites = await db.team_invites.count_documents({
            "firm_id": user["firm_id"], "status": "pending",
        })
        tier = firm.get("subscription_tier", "starter")
        plan = next((p for p in PLANS if p["id"] == tier), PLANS[0])
        return {
            "tier": tier,
            "status": firm.get("billing_status", "active"),
            "seats_used": seat_count,
            "seats_pending": pending_invites,
            "seats_included": plan.get("seats_included"),
            "plan": plan,
            "billing_contact": firm.get("billing_contact"),
            "next_invoice_at": firm.get("next_invoice_at"),
        }

    @api.post("/billing/upgrade-inquiry")
    async def upgrade_inquiry(req: UpgradeInquiry, user=Depends(read_guard)):
        doc = {
            "id": new_id(),
            "firm_id": user["firm_id"],
            "user_id": user["id"],
            "plan_id": req.plan_id,
            "message": req.message,
            "contact_email": req.contact_email or user.get("email"),
            "status": "open",
            "created_at": now_iso(),
        }
        await db.billing_inquiries.insert_one(doc)
        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user["name"],
            action="billing.upgrade_inquiry",
            resource_type="billing_inquiry",
            resource_id=doc["id"],
            detail={"plan_id": req.plan_id},
            new_id=new_id,
            now_iso=now_iso,
        )
        doc.pop("_id", None)
        return {"ok": True, "inquiry_id": doc["id"]}

    @api.patch("/billing/subscription")
    async def patch_subscription(updates: dict, user=Depends(write_guard)):
        allowed = {"billing_contact", "billing_status"}
        patch = {k: v for k, v in updates.items() if k in allowed}
        if not patch:
            return {"ok": True}
        await db.firms.update_one({"id": user["firm_id"]}, {"$set": patch})
        return await db.firms.find_one({"id": user["firm_id"]}, {"_id": 0})
