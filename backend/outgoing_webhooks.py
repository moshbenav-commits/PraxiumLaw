"""
Praxium Suite — outgoing webhooks (saas-outgoing-webhooks pattern).
Firm-scoped HTTPS endpoints · HMAC-SHA256 signed payloads · delivery log + retry.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import secrets
from typing import Any, Callable, List, Optional
from urllib.parse import urlparse

import requests
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, HttpUrl

SUPPORTED_EVENTS = (
    "matter.created",
    "matter.status_changed",
    "document.uploaded",
    "signature.completed",
)

PRIVATE_NET_PREFIXES = ("127.", "10.", "192.168.", "172.16.", "172.17.", "172.18.", "172.19.",
                        "172.20.", "172.21.", "172.22.", "172.23.", "172.24.", "172.25.",
                        "172.26.", "172.27.", "172.28.", "172.29.", "172.30.", "172.31.",
                        "localhost", "0.0.0.0", "[::1]")


class WebhookEndpointIn(BaseModel):
    url: HttpUrl
    events: List[str] = Field(default_factory=lambda: list(SUPPORTED_EVENTS))
    description: str = ""


class WebhookEndpointPatch(BaseModel):
    url: Optional[HttpUrl] = None
    events: Optional[List[str]] = None
    active: Optional[bool] = None
    description: Optional[str] = None


def _validate_webhook_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme != "https":
        raise HTTPException(400, "Webhook URL must use HTTPS")
    host = (parsed.hostname or "").lower()
    if not host:
        raise HTTPException(400, "Invalid webhook URL")
    for prefix in PRIVATE_NET_PREFIXES:
        if host.startswith(prefix) or host == prefix.rstrip("."):
            raise HTTPException(400, "Webhook URL must not target private networks")


def _sign_payload(secret: str, body: bytes) -> str:
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


def _attempt_delivery(endpoint: dict, event: dict) -> dict:
    payload = {
        "id": event["id"],
        "type": event["type"],
        "version": event.get("version", "v1"),
        "created_at": event["created_at"],
        "data": event["data"],
    }
    body = json.dumps(payload, separators=(",", ":")).encode()
    headers = {
        "Content-Type": "application/json",
        "X-Praxium-Event": event["type"],
        "X-Praxium-Event-Id": event["id"],
        "X-Praxium-Signature": f"sha256={_sign_payload(endpoint['secret'], body)}",
    }
    custom = endpoint.get("headers") or {}
    if isinstance(custom, dict):
        headers.update({str(k): str(v) for k, v in custom.items()})
    try:
        res = requests.post(endpoint["url"], data=body, headers=headers, timeout=8)
        return {
            "ok": 200 <= res.status_code < 300,
            "status": res.status_code,
            "body": (res.text or "")[:2048],
            "error": None,
        }
    except Exception as exc:
        return {"ok": False, "status": 0, "body": "", "error": str(exc)[:500]}


async def emit_webhook_event(
    db: Any,
    *,
    firm_id: str,
    event_type: str,
    data: dict,
    new_id: Callable[[], str],
    now_iso: Callable[[], str],
) -> Optional[str]:
    """Persist event, fan out to endpoints, attempt synchronous delivery."""
    if event_type not in SUPPORTED_EVENTS:
        return None
    event = {
        "id": new_id(),
        "firm_id": firm_id,
        "type": event_type,
        "version": "v1",
        "data": data,
        "created_at": now_iso(),
    }
    await db.webhook_events.insert_one(event)

    cursor = db.webhook_endpoints.find(
        {
            "firm_id": firm_id,
            "active": True,
            "$or": [{"events": event_type}, {"events": "*"}],
        },
        {"_id": 0},
    )
    endpoints = await cursor.to_list(50)
    for ep in endpoints:
        delivery = {
            "id": new_id(),
            "event_id": event["id"],
            "endpoint_id": ep["id"],
            "firm_id": firm_id,
            "url": ep["url"],
            "event_type": event_type,
            "status": "pending",
            "attempt": 1,
            "response_status": 0,
            "response_body": "",
            "error": "",
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        result = _attempt_delivery(ep, event)
        delivery["response_status"] = result["status"]
        delivery["response_body"] = result["body"]
        delivery["error"] = result["error"] or ""
        delivery["status"] = "success" if result["ok"] else "failed"
        delivery["updated_at"] = now_iso()
        await db.webhook_deliveries.insert_one(delivery)
        fail_count = ep.get("consecutive_failures", 0)
        if result["ok"]:
            await db.webhook_endpoints.update_one(
                {"id": ep["id"]},
                {"$set": {"consecutive_failures": 0, "updated_at": now_iso()}},
            )
        else:
            await db.webhook_endpoints.update_one(
                {"id": ep["id"]},
                {
                    "$set": {"updated_at": now_iso()},
                    "$inc": {"consecutive_failures": 1},
                },
            )
    return event["id"]


def register_webhook_routes(
    api: APIRouter,
    db: Any,
    get_current_user: Callable,
    require_permission: Callable,
    new_id: Callable[[], str],
    now_iso: Callable[[], str],
    log_audit: Callable,
) -> None:
    manage = require_permission("integrations.manage", get_current_user)
    read = require_permission("integrations.read", get_current_user)

    @api.get("/webhooks/events")
    async def list_supported_events(_user=Depends(read)):
        return {"events": list(SUPPORTED_EVENTS)}

    @api.get("/webhooks/endpoints")
    async def list_endpoints(user=Depends(read)):
        items = await db.webhook_endpoints.find(
            {"firm_id": user["firm_id"]},
            {"_id": 0, "secret": 0},
        ).sort("created_at", -1).to_list(50)
        return {"items": items}

    @api.post("/webhooks/endpoints")
    async def create_endpoint(body: WebhookEndpointIn, user=Depends(manage)):
        url = str(body.url)
        _validate_webhook_url(url)
        events = body.events or list(SUPPORTED_EVENTS)
        for ev in events:
            if ev != "*" and ev not in SUPPORTED_EVENTS:
                raise HTTPException(400, f"Unsupported event: {ev}")
        secret = f"whsec_{secrets.token_urlsafe(32)}"
        doc = {
            "id": new_id(),
            "firm_id": user["firm_id"],
            "url": url,
            "secret": secret,
            "events": events,
            "active": True,
            "description": body.description.strip(),
            "consecutive_failures": 0,
            "headers": {},
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        await db.webhook_endpoints.insert_one(doc)
        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user["name"],
            action="webhook.endpoint_created",
            resource_type="webhook_endpoint",
            resource_id=doc["id"],
            detail={"url": url, "events": events},
            new_id=new_id,
            now_iso=now_iso,
        )
        out = {k: v for k, v in doc.items() if k != "_id"}
        out["secret"] = secret  # shown once
        return out

    @api.patch("/webhooks/endpoints/{endpoint_id}")
    async def patch_endpoint(endpoint_id: str, body: WebhookEndpointPatch, user=Depends(manage)):
        ep = await db.webhook_endpoints.find_one({"id": endpoint_id, "firm_id": user["firm_id"]})
        if not ep:
            raise HTTPException(404, "Endpoint not found")
        patch: dict = {"updated_at": now_iso()}
        if body.url is not None:
            url = str(body.url)
            _validate_webhook_url(url)
            patch["url"] = url
        if body.events is not None:
            for ev in body.events:
                if ev != "*" and ev not in SUPPORTED_EVENTS:
                    raise HTTPException(400, f"Unsupported event: {ev}")
            patch["events"] = body.events
        if body.active is not None:
            patch["active"] = body.active
        if body.description is not None:
            patch["description"] = body.description.strip()
        await db.webhook_endpoints.update_one({"id": endpoint_id}, {"$set": patch})
        return await db.webhook_endpoints.find_one(
            {"id": endpoint_id}, {"_id": 0, "secret": 0},
        )

    @api.delete("/webhooks/endpoints/{endpoint_id}")
    async def delete_endpoint(endpoint_id: str, user=Depends(manage)):
        res = await db.webhook_endpoints.delete_one({"id": endpoint_id, "firm_id": user["firm_id"]})
        if res.deleted_count == 0:
            raise HTTPException(404, "Endpoint not found")
        return {"ok": True}

    @api.get("/webhooks/deliveries")
    async def list_deliveries(limit: int = 50, user=Depends(read)):
        items = await db.webhook_deliveries.find(
            {"firm_id": user["firm_id"]},
            {"_id": 0},
        ).sort("created_at", -1).to_list(min(limit, 200))
        return {"items": items}

    @api.post("/webhooks/deliveries/{delivery_id}/retry")
    async def retry_delivery(delivery_id: str, user=Depends(manage)):
        delivery = await db.webhook_deliveries.find_one(
            {"id": delivery_id, "firm_id": user["firm_id"]},
        )
        if not delivery:
            raise HTTPException(404, "Delivery not found")
        ep = await db.webhook_endpoints.find_one({"id": delivery["endpoint_id"]}, {"_id": 0})
        event = await db.webhook_events.find_one({"id": delivery["event_id"]}, {"_id": 0})
        if not ep or not event:
            raise HTTPException(400, "Endpoint or event missing")
        result = _attempt_delivery(ep, event)
        status = "success" if result["ok"] else "failed"
        await db.webhook_deliveries.update_one(
            {"id": delivery_id},
            {
                "$set": {
                    "status": status,
                    "attempt": delivery.get("attempt", 0) + 1,
                    "response_status": result["status"],
                    "response_body": result["body"],
                    "error": result["error"] or "",
                    "updated_at": now_iso(),
                }
            },
        )
        return {"ok": result["ok"], "status": status, "response_status": result["status"]}
