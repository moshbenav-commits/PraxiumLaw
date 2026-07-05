"""
PI Case OS — legal disclosure acknowledgment gate (UX-021).
"""
from __future__ import annotations

from pathlib import Path
from typing import Callable

from fastapi import Depends, HTTPException
from pydantic import BaseModel

REPO_ROOT = Path(__file__).resolve().parent.parent
DISCLOSURE_PATH = REPO_ROOT / "docs" / "pi-case-os" / "DISCLOSURE.md"
DISCLOSURE_VERSION = "2026-07-04"


def user_needs_disclosure(user: dict) -> bool:
    ack = user.get("disclosure_ack") or {}
    return ack.get("version") != DISCLOSURE_VERSION


def require_disclosure_ack(user: dict) -> None:
    if user_needs_disclosure(user):
        raise HTTPException(
            403,
            "Acknowledge the PI Case OS disclosure before using templates or exports.",
        )


class DisclosureAckIn(BaseModel):
    confirm: bool


def register_disclosure_routes(
    api,
    db,
    get_current_user: Callable,
    new_id: Callable,
    now_iso: Callable,
    log_audit: Callable,
):
    @api.get("/disclosure")
    async def get_disclosure(user=Depends(get_current_user)):
        if not DISCLOSURE_PATH.is_file():
            raise HTTPException(404, "Disclosure document not found")
        markdown = DISCLOSURE_PATH.read_text(encoding="utf-8")
        ack = user.get("disclosure_ack") or {}
        return {
            "version": DISCLOSURE_VERSION,
            "markdown": markdown,
            "required": user_needs_disclosure(user),
            "acknowledged_at": ack.get("acknowledged_at"),
        }

    @api.post("/disclosure/acknowledge")
    async def acknowledge_disclosure(body: DisclosureAckIn, user=Depends(get_current_user)):
        if not body.confirm:
            raise HTTPException(400, "You must confirm acknowledgment")
        ack = {
            "version": DISCLOSURE_VERSION,
            "acknowledged_at": now_iso(),
            "acknowledged_by_id": user["id"],
            "acknowledged_by_name": user.get("name") or "",
        }
        await db.users.update_one({"id": user["id"]}, {"$set": {"disclosure_ack": ack}})
        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user.get("name") or "User",
            action="disclosure.acknowledged",
            resource_type="user",
            resource_id=user["id"],
            detail={"version": DISCLOSURE_VERSION},
            new_id=new_id,
            now_iso=now_iso,
        )
        return {"ok": True, "disclosure_ack": ack}
