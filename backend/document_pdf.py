"""Document PDF routes — text extraction, view audit, light editor ops."""
from __future__ import annotations

import base64
from typing import Any, Callable, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from pdf_util import append_pdf_pages, extract_text_from_pdf_bytes, is_pdf, page_count, reorder_pdf_pages


class PageReorderIn(BaseModel):
    order: List[int] = Field(..., min_length=1)


class PageAppendIn(BaseModel):
    source_document_id: Optional[str] = None
    data_b64: Optional[str] = None


def register_document_pdf_routes(
    api: APIRouter,
    db: Any,
    get_current_user: Callable,
    require_permission: Callable,
    new_id: Callable[[], str],
    now_iso: Callable[[], str],
    log_audit: Callable,
) -> None:
    read_guard = require_permission("documents.read", get_current_user)
    write_guard = require_permission("documents.write", get_current_user)

    async def _get_doc(doc_id: str, firm_id: str):
        d = await db.documents.find_one({"id": doc_id, "firm_id": firm_id})
        if not d:
            raise HTTPException(404, "Document not found")
        return d

    @api.get("/documents/{doc_id}/text")
    async def document_text(doc_id: str, user=Depends(read_guard)):
        d = await _get_doc(doc_id, user["firm_id"])
        if not is_pdf(d.get("content_type"), d.get("name", "")):
            raise HTTPException(400, "Text extraction supports PDF only")
        text = d.get("extracted_text")
        if text is None and d.get("data_b64"):
            raw = base64.b64decode(d["data_b64"])
            text = extract_text_from_pdf_bytes(raw)
            await db.documents.update_one(
                {"id": doc_id},
                {"$set": {"extracted_text": text, "page_count": page_count(raw)}},
            )
        return {
            "id": doc_id,
            "name": d.get("name"),
            "char_count": len(text or ""),
            "text": text or "",
        }

    @api.get("/documents/{doc_id}/view")
    async def document_view(doc_id: str, request: Request, user=Depends(read_guard)):
        d = await _get_doc(doc_id, user["firm_id"])
        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user["name"],
            actor_email=user.get("email"),
            action="document.viewed",
            resource_type="document",
            resource_id=doc_id,
            detail={"name": d.get("name"), "matter_id": d.get("matter_id")},
            new_id=new_id,
            now_iso=now_iso,
            request=request,
        )
        return {
            "id": doc_id,
            "name": d["name"],
            "content_type": d["content_type"],
            "data_b64": d["data_b64"],
            "page_count": d.get("page_count"),
            "is_pdf": is_pdf(d.get("content_type"), d.get("name", "")),
        }

    @api.post("/documents/{doc_id}/pages/reorder")
    async def document_reorder_pages(doc_id: str, body: PageReorderIn, user=Depends(write_guard)):
        d = await _get_doc(doc_id, user["firm_id"])
        if not is_pdf(d.get("content_type"), d.get("name", "")):
            raise HTTPException(400, "Page reorder supports PDF only")
        raw = base64.b64decode(d["data_b64"])
        updated = reorder_pdf_pages(raw, body.order)
        text = extract_text_from_pdf_bytes(updated)
        await db.documents.update_one(
            {"id": doc_id},
            {
                "$set": {
                    "data_b64": base64.b64encode(updated).decode(),
                    "size_bytes": len(updated),
                    "extracted_text": text,
                    "page_count": page_count(updated),
                    "updated_at": now_iso(),
                },
                "$inc": {"version": 1},
            },
        )
        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user["name"],
            action="document.pages_reordered",
            resource_type="document",
            resource_id=doc_id,
            detail={"order": body.order},
            new_id=new_id,
            now_iso=now_iso,
        )
        return {"ok": True, "page_count": page_count(updated)}

    @api.post("/documents/{doc_id}/pages/append")
    async def document_append_pages(doc_id: str, body: PageAppendIn, user=Depends(write_guard)):
        d = await _get_doc(doc_id, user["firm_id"])
        if not is_pdf(d.get("content_type"), d.get("name", "")):
            raise HTTPException(400, "Page append supports PDF only")
        if body.source_document_id:
            src = await _get_doc(body.source_document_id, user["firm_id"])
            if src.get("matter_id") != d.get("matter_id"):
                raise HTTPException(400, "Source document must belong to the same matter")
            extra = base64.b64decode(src["data_b64"])
        elif body.data_b64:
            extra = base64.b64decode(body.data_b64)
        else:
            raise HTTPException(400, "Provide source_document_id or data_b64")
        raw = base64.b64decode(d["data_b64"])
        updated = append_pdf_pages(raw, extra)
        text = extract_text_from_pdf_bytes(updated)
        await db.documents.update_one(
            {"id": doc_id},
            {
                "$set": {
                    "data_b64": base64.b64encode(updated).decode(),
                    "size_bytes": len(updated),
                    "extracted_text": text,
                    "page_count": page_count(updated),
                    "updated_at": now_iso(),
                },
                "$inc": {"version": 1},
            },
        )
        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user["name"],
            action="document.pages_appended",
            resource_type="document",
            resource_id=doc_id,
            detail={"source_document_id": body.source_document_id},
            new_id=new_id,
            now_iso=now_iso,
        )
        return {"ok": True, "page_count": page_count(updated)}
