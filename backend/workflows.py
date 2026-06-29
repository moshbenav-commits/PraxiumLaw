"""
Praxium Suite — firm workflow automations (saas-workflows pattern).
"""
from __future__ import annotations

from typing import Any, Callable, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel


DEFAULT_WORKFLOWS = [
    {
        "slug": "intake-paralegal-tasks",
        "name": "Intake — paralegal checklist",
        "trigger": "matter.created",
        "enabled": True,
        "actions": [
            {"type": "create_task", "title": "Run conflicts check", "priority": "high", "due_days": 1},
            {"type": "create_task", "title": "Send retainer / engagement letter", "priority": "high", "due_days": 2},
            {"type": "create_task", "title": "Request medical records authorization", "priority": "medium", "due_days": 5},
        ],
    },
    {
        "slug": "document-complaint-notify",
        "name": "Complaint filed — notify partner",
        "trigger": "document.uploaded",
        "enabled": False,
        "actions": [
            {"type": "create_task", "title": "Partner review — complaint filed", "priority": "urgent", "due_days": 1},
        ],
        "conditions": {"folder": "Pleadings"},
    },
]


class WorkflowPatch(BaseModel):
    enabled: Optional[bool] = None
    name: Optional[str] = None


async def ensure_firm_workflows(db: Any, firm_id: str, new_id: Callable[[], str], now_iso: Callable[[], str]) -> None:
    existing = await db.workflows.count_documents({"firm_id": firm_id})
    if existing:
        return
    for wf in DEFAULT_WORKFLOWS:
        doc = {**wf, "id": new_id(), "firm_id": firm_id, "created_at": now_iso()}
        await db.workflows.insert_one(doc)


async def run_workflow_trigger(
    db: Any,
    *,
    firm_id: str,
    trigger: str,
    context: dict,
    user_id: str,
    new_id: Callable[[], str],
    now_iso: Callable[[], str],
) -> List[str]:
    """Execute enabled workflows for trigger; returns created task ids."""
    created: List[str] = []
    workflows = await db.workflows.find(
        {"firm_id": firm_id, "trigger": trigger, "enabled": True}, {"_id": 0},
    ).to_list(50)
    for wf in workflows:
        conditions = wf.get("conditions") or {}
        if conditions:
            if "folder" in conditions and context.get("folder") != conditions["folder"]:
                continue
        for action in wf.get("actions", []):
            if action.get("type") != "create_task":
                continue
            task_id = new_id()
            due = action.get("due_days")
            due_date = None
            if due is not None:
                from datetime import datetime, timedelta, timezone
                due_date = (datetime.now(timezone.utc) + timedelta(days=int(due))).date().isoformat()
            await db.tasks.insert_one({
                "id": task_id,
                "firm_id": firm_id,
                "matter_id": context.get("matter_id"),
                "title": action.get("title", "Workflow task"),
                "priority": action.get("priority", "medium"),
                "status": "open",
                "due_date": due_date,
                "created_by": user_id,
                "assignee_id": user_id,
                "workflow_id": wf["id"],
                "created_at": now_iso(),
            })
            created.append(task_id)
    return created


def register_workflow_routes(
    api: APIRouter,
    db: Any,
    get_current_user: Callable,
    require_permission: Callable,
    new_id: Callable[[], str],
    now_iso: Callable[[], str],
    log_audit: Callable,
) -> None:
    read_guard = require_permission("workflows.read", get_current_user)
    manage_guard = require_permission("workflows.manage", get_current_user)

    @api.get("/workflows")
    async def list_workflows(user=Depends(read_guard)):
        await ensure_firm_workflows(db, user["firm_id"], new_id, now_iso)
        items = await db.workflows.find({"firm_id": user["firm_id"]}, {"_id": 0}).to_list(50)
        return {"items": items}

    @api.patch("/workflows/{workflow_id}")
    async def patch_workflow(workflow_id: str, patch: WorkflowPatch, user=Depends(manage_guard)):
        updates = {k: v for k, v in patch.model_dump().items() if v is not None}
        if not updates:
            raise HTTPException(400, "No updates")
        res = await db.workflows.update_one(
            {"id": workflow_id, "firm_id": user["firm_id"]},
            {"$set": updates},
        )
        if res.matched_count == 0:
            raise HTTPException(404, "Workflow not found")
        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user["name"],
            action="workflow.updated",
            resource_type="workflow",
            resource_id=workflow_id,
            detail=updates,
            new_id=new_id,
            now_iso=now_iso,
        )
        return await db.workflows.find_one({"id": workflow_id}, {"_id": 0})
