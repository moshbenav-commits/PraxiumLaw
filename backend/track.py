"""
Praxium Suite — visitor analytics sink (mirrors the Creytix Analytics SSOT
track-route template used by the fleet's Next.js sites — see
packages/creytix-analytics-lite/templates/track-route.ts at the workspace
root — reimplemented here because this app is FastAPI + Vite, not Next.js).

Lake forward (Creytix Data Lake §7 Phase 1 —
docs/creytix/CREYTIX_DATA_LAKE_PLAN_2026-07-29.md): when LAKE_INGEST_URL +
LAKE_INGEST_SECRET are configured, every event is forwarded server-side to
the Bronze ingest endpoint (POST /marketing/lake/events on
expedia-parts-back), stamped with this app's own canonical brand id
("praxiumlaw") as sourceSite — never any other endpoint, since a wrong
producer would mislabel this brand's traffic in the shared lake. Fail-open:
a lake failure never affects the visitor response — this endpoint always
returns 204 unless the request body itself is malformed.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Optional

import httpx
from fastapi import APIRouter, Request, Response
from pydantic import BaseModel

SOURCE_SITE = "praxiumlaw"
MAX_EVENT_LEN = 64
MAX_PATH_LEN = 256
LAKE_TIMEOUT_SECONDS = 2.5


class TrackEvent(BaseModel):
    event: str
    path: str
    visitorId: Optional[str] = None
    referrer: Optional[str] = None
    props: Optional[dict[str, Any]] = None
    at: Optional[int] = None


def _lake_event_type(event: str) -> str:
    """page_view -> the shared pulse.pageview taxonomy; others namespace under pulse.*"""
    if event == "page_view":
        return "pulse.pageview"
    slug = "".join(c if c.isalnum() else "_" for c in event.lower())
    return f"pulse.{slug}"


async def _forward_to_lake(body: TrackEvent) -> None:
    url = os.environ.get("LAKE_INGEST_URL")
    secret = os.environ.get("LAKE_INGEST_SECRET")
    if not url or not secret:
        return

    occurred_at = (
        datetime.fromtimestamp(body.at / 1000, tz=timezone.utc)
        if body.at
        else datetime.now(timezone.utc)
    )

    payload = {
        "sourceSite": SOURCE_SITE,
        "eventType": _lake_event_type(body.event),
        "occurredAt": occurred_at.isoformat(),
        "visitorId": body.visitorId or None,
        "payload": {
            "path": body.path,
            "referrer": body.referrer,
            **({"props": body.props} if body.props else {}),
        },
        "producer": f"{SOURCE_SITE}-front",
    }

    async with httpx.AsyncClient(timeout=LAKE_TIMEOUT_SECONDS) as client:
        await client.post(
            url,
            json=payload,
            headers={"x-lake-ingest-secret": secret},
        )


def register_track_routes(api: APIRouter) -> None:
    @api.post("/track")
    async def track(request: Request, body: TrackEvent) -> Response:
        # Bound the free-text fields the same way the Next.js template does —
        # a stray huge payload should never propagate into the lake envelope.
        body.event = body.event[:MAX_EVENT_LEN]
        body.path = body.path[:MAX_PATH_LEN]
        if body.referrer:
            body.referrer = body.referrer[:MAX_PATH_LEN]

        try:
            await _forward_to_lake(body)
        except Exception:
            # Fail-open — analytics must never surface an error to a
            # visitor's network tab as a failure loop.
            pass

        return Response(status_code=204)
