"""
Praxium Suite — marketplace tools catalog (CUSTOM_TOOLS_MARKETPLACE_POLICY).
"""
from __future__ import annotations

from typing import Any, Callable, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel


PLATFORM_TOOLS = [
    {
        "id": "lawmatch-routing",
        "name": "LawMatch lead routing",
        "category": "intake",
        "description": "AI-triaged consumer leads routed by practice area and capacity.",
        "pricing": "included_growth",
        "built_by": "praxium",
    },
    {
        "id": "medconnect-records",
        "name": "MedConnect records portal",
        "category": "medical",
        "description": "Magic-link medical record requests and provider directory.",
        "pricing": "included_growth",
        "built_by": "praxium",
    },
    {
        "id": "cocounsel-ai",
        "name": "CoCounsel AI assistant",
        "category": "ai",
        "description": "Matter-aware Claude assistant for drafting and research.",
        "pricing": "included_starter",
        "built_by": "praxium",
    },
    {
        "id": "courtfile-efiling",
        "name": "CourtFile e-filing tracker",
        "category": "litigation",
        "description": "Track draft → filed → served status per matter.",
        "pricing": "included_starter",
        "built_by": "praxium",
    },
    {
        "id": "custom-workflow-builder",
        "name": "Custom workflow (paid build)",
        "category": "automation",
        "description": "Firm-specific automation — platform retains IP; may enter marketplace per policy.",
        "pricing": "custom_dev_fee",
        "built_by": "customer",
        "policy_ref": "CUSTOM_TOOLS_MARKETPLACE_POLICY.md",
    },
]


class ToolEnableReq(BaseModel):
    enabled: bool = True


class CustomToolRequest(BaseModel):
    title: str
    description: str
    practice_area: Optional[str] = None


def register_marketplace_routes(
    api: APIRouter,
    db: Any,
    get_current_user: Callable,
    require_permission: Callable,
    new_id: Callable[[], str],
    now_iso: Callable[[], str],
    log_audit: Callable,
) -> None:
    read_guard = get_current_user
    manage_guard = require_permission("marketplace.manage", get_current_user)

    @api.get("/marketplace/tools")
    async def catalog(user=Depends(read_guard)):
        enabled = await db.firm_tools.find({"firm_id": user["firm_id"]}, {"_id": 0}).to_list(100)
        enabled_map = {e["tool_id"]: e for e in enabled}
        tools = []
        for t in PLATFORM_TOOLS:
            row = {**t, "enabled": enabled_map.get(t["id"], {}).get("enabled", t["id"] in (
                "lawmatch-routing", "cocounsel-ai", "courtfile-efiling",
            ))}
            tools.append(row)
        return {"tools": tools}

    @api.post("/marketplace/tools/{tool_id}/enable")
    async def enable_tool(tool_id: str, req: ToolEnableReq, user=Depends(manage_guard)):
        if not any(t["id"] == tool_id for t in PLATFORM_TOOLS):
            raise HTTPException(404, "Tool not found")
        await db.firm_tools.update_one(
            {"firm_id": user["firm_id"], "tool_id": tool_id},
            {"$set": {
                "firm_id": user["firm_id"],
                "tool_id": tool_id,
                "enabled": req.enabled,
                "updated_at": now_iso(),
                "updated_by": user["id"],
            }},
            upsert=True,
        )
        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user["name"],
            action="marketplace.tool_enabled" if req.enabled else "marketplace.tool_disabled",
            resource_type="marketplace_tool",
            resource_id=tool_id,
            new_id=new_id,
            now_iso=now_iso,
        )
        return {"ok": True, "tool_id": tool_id, "enabled": req.enabled}

    @api.post("/marketplace/custom-tool-requests")
    async def request_custom_tool(req: CustomToolRequest, user=Depends(manage_guard)):
        doc = {
            "id": new_id(),
            "firm_id": user["firm_id"],
            "requested_by": user["id"],
            **req.model_dump(),
            "status": "submitted",
            "created_at": now_iso(),
        }
        await db.custom_tool_requests.insert_one(doc)
        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user["name"],
            action="marketplace.custom_tool_requested",
            resource_type="custom_tool_request",
            resource_id=doc["id"],
            detail={"title": req.title},
            new_id=new_id,
            now_iso=now_iso,
        )
        doc.pop("_id", None)
        return doc

    @api.get("/marketplace/custom-tool-requests")
    async def list_custom_requests(user=Depends(manage_guard)):
        items = await db.custom_tool_requests.find(
            {"firm_id": user["firm_id"]}, {"_id": 0},
        ).sort("created_at", -1).to_list(50)
        return {"items": items}
