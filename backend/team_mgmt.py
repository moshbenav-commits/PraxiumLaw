"""
Praxium Suite — team invites and role management (saas-invitations-team-mgmt).
"""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

from rbac import ROLES


class TeamInviteIn(BaseModel):
    email: EmailStr
    name: str
    role: str = "staff"
    title: Optional[str] = None


class AcceptInviteIn(BaseModel):
    token: str
    password: str


class MemberRolePatch(BaseModel):
    role: str
    title: Optional[str] = None


def register_team_routes(
    api: APIRouter,
    db: Any,
    get_current_user: Callable,
    require_permission: Callable,
    hash_pw: Callable[[str], str],
    make_token: Callable[[str, str], str],
    new_id: Callable[[], str],
    now_iso: Callable[[], str],
    log_audit: Callable,
    ensure_firm_workflows: Callable,
) -> None:
    manage_guard = require_permission("team.manage", get_current_user)

    @api.post("/team/invite")
    async def invite_member(req: TeamInviteIn, user=Depends(manage_guard)):
        if req.role not in ROLES:
            raise HTTPException(400, f"Invalid role — use one of: {', '.join(ROLES)}")
        email = req.email.lower()
        existing = await db.users.find_one({"email": email})
        if existing:
            raise HTTPException(400, "Email already has an account")
        pending = await db.team_invites.find_one({"email": email, "status": "pending"})
        if pending:
            raise HTTPException(400, "Invite already pending for this email")
        firm = await db.firms.find_one({"id": user["firm_id"]}, {"_id": 0})
        plan_seats = {"starter": 3, "growth": 10, "enterprise": 999}.get(
            firm.get("subscription_tier", "starter"), 3,
        )
        seat_count = await db.users.count_documents({"firm_id": user["firm_id"]})
        pending_count = await db.team_invites.count_documents({"firm_id": user["firm_id"], "status": "pending"})
        if seat_count + pending_count >= plan_seats:
            raise HTTPException(402, "Seat limit reached — upgrade plan or revoke pending invites")
        token = secrets.token_urlsafe(24)
        doc = {
            "id": new_id(),
            "firm_id": user["firm_id"],
            "email": email,
            "name": req.name,
            "role": req.role,
            "title": req.title,
            "token": token,
            "status": "pending",
            "invited_by": user["id"],
            "created_at": now_iso(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        }
        await db.team_invites.insert_one(doc)
        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user["name"],
            action="team.invited",
            resource_type="team_invite",
            resource_id=doc["id"],
            detail={"email": email, "role": req.role},
            new_id=new_id,
            now_iso=now_iso,
        )
        return {
            "ok": True,
            "invite_id": doc["id"],
            "accept_token": token,
            "expires_at": doc["expires_at"],
        }

    @api.get("/team/invites")
    async def list_invites(user=Depends(manage_guard)):
        items = await db.team_invites.find(
            {"firm_id": user["firm_id"]}, {"_id": 0, "token": 0},
        ).sort("created_at", -1).to_list(50)
        return {"items": items}

    @api.delete("/team/invites/{invite_id}")
    async def revoke_invite(invite_id: str, user=Depends(manage_guard)):
        res = await db.team_invites.update_one(
            {"id": invite_id, "firm_id": user["firm_id"], "status": "pending"},
            {"$set": {"status": "revoked"}},
        )
        if res.matched_count == 0:
            raise HTTPException(404, "Pending invite not found")
        return {"ok": True}

    @api.post("/team/accept-invite")
    async def accept_invite(req: AcceptInviteIn):
        invite = await db.team_invites.find_one({"token": req.token, "status": "pending"})
        if not invite:
            raise HTTPException(400, "Invalid or expired invite")
        if datetime.fromisoformat(invite["expires_at"]) < datetime.now(timezone.utc):
            raise HTTPException(400, "Invite expired")
        user_id = new_id()
        await db.users.insert_one({
            "id": user_id,
            "firm_id": invite["firm_id"],
            "email": invite["email"],
            "password_hash": hash_pw(req.password),
            "name": invite["name"],
            "role": invite["role"],
            "title": invite.get("title"),
            "created_at": now_iso(),
        })
        await db.team_invites.update_one(
            {"id": invite["id"]},
            {"$set": {"status": "accepted", "accepted_at": now_iso()}},
        )
        await ensure_firm_workflows(db, invite["firm_id"], new_id, now_iso)
        token = make_token(user_id, invite["firm_id"])
        user_doc = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
        firm = await db.firms.find_one({"id": invite["firm_id"]}, {"_id": 0})
        return {"token": token, "user": user_doc, "firm": firm}

    @api.patch("/team/{member_id}")
    async def update_member_role(member_id: str, patch: MemberRolePatch, user=Depends(manage_guard)):
        if patch.role not in ROLES:
            raise HTTPException(400, f"Invalid role — use one of: {', '.join(ROLES)}")
        target = await db.users.find_one({"id": member_id, "firm_id": user["firm_id"]})
        if not target:
            raise HTTPException(404, "Member not found")
        if target.get("role") == "admin" and patch.role != "admin" and member_id != user["id"]:
            admins = await db.users.count_documents({"firm_id": user["firm_id"], "role": "admin"})
            if admins <= 1:
                raise HTTPException(400, "Cannot demote the only admin")
        updates = {"role": patch.role}
        if patch.title is not None:
            updates["title"] = patch.title
        await db.users.update_one({"id": member_id}, {"$set": updates})
        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user["name"],
            action="team.role_updated",
            resource_type="user",
            resource_id=member_id,
            detail=updates,
            new_id=new_id,
            now_iso=now_iso,
        )
        return await db.users.find_one({"id": member_id}, {"_id": 0, "password_hash": 0})
