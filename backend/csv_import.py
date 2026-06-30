"""
Praxium Suite — CSV bulk import for contacts and matters (saas-csv-import-bulk pattern).
"""
from __future__ import annotations

import csv
import io
from typing import Any, Callable, List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel


class ImportResult(BaseModel):
    created: int
    skipped: int
    errors: List[str]


def _parse_csv(text: str) -> List[dict]:
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(400, "CSV must include a header row")
    return [dict(row) for row in reader]


def register_csv_import_routes(
    api: APIRouter,
    db: Any,
    get_current_user: Callable,
    require_permission: Callable,
    new_id: Callable[[], str],
    now_iso: Callable[[], str],
    log_audit: Callable,
    gen_patient_id: Callable[[], str],
) -> None:
    guard = require_permission("contacts.write", get_current_user)

    @api.post("/import/contacts")
    async def import_contacts(file: UploadFile = File(...), user=Depends(guard)):
        raw = (await file.read()).decode("utf-8-sig", errors="replace")
        rows = _parse_csv(raw)
        created = 0
        skipped = 0
        errors: List[str] = []
        for i, row in enumerate(rows, start=2):
            name = (row.get("name") or row.get("Name") or "").strip()
            if not name:
                skipped += 1
                errors.append(f"Row {i}: missing name")
                continue
            email = (row.get("email") or row.get("Email") or "").strip().lower() or None
            phone = (row.get("phone") or row.get("Phone") or "").strip() or None
            kind = (row.get("kind") or row.get("Kind") or "client").strip().lower()
            doc = {
                "id": new_id(),
                "firm_id": user["firm_id"],
                "name": name,
                "email": email,
                "phone": phone,
                "kind": kind,
                "patient_id": gen_patient_id() if kind == "client" else None,
                "created_at": now_iso(),
                "updated_at": now_iso(),
            }
            await db.contacts.insert_one(doc)
            created += 1
        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user["name"],
            action="import.contacts",
            resource_type="import",
            resource_id=new_id(),
            detail={"created": created, "skipped": skipped},
            new_id=new_id,
            now_iso=now_iso,
        )
        return ImportResult(created=created, skipped=skipped, errors=errors[:20])

    @api.post("/import/matters")
    async def import_matters(file: UploadFile = File(...), user=Depends(guard)):
        raw = (await file.read()).decode("utf-8-sig", errors="replace")
        rows = _parse_csv(raw)
        created = 0
        skipped = 0
        errors: List[str] = []
        base_count = await db.matters.count_documents({"firm_id": user["firm_id"]})
        for i, row in enumerate(rows, start=2):
            title = (row.get("title") or row.get("Title") or "").strip()
            if not title:
                skipped += 1
                errors.append(f"Row {i}: missing title")
                continue
            status = (row.get("status") or row.get("Status") or "intake").strip().lower()
            practice = (row.get("practice_area") or row.get("Practice Area") or "").strip() or None
            client_email = (row.get("client_email") or row.get("Client Email") or "").strip().lower()
            client_id = None
            if client_email:
                contact = await db.contacts.find_one(
                    {"firm_id": user["firm_id"], "email": client_email, "kind": "client"},
                    {"_id": 0, "id": 1},
                )
                if contact:
                    client_id = contact["id"]
            matter_id = new_id()
            case_number = (row.get("case_number") or row.get("Case Number") or "").strip()
            if not case_number:
                from datetime import datetime

                case_number = f"M-{datetime.now().year}-{base_count + created + 1:04d}"
            doc = {
                "id": matter_id,
                "firm_id": user["firm_id"],
                "title": title,
                "status": status,
                "practice_area": practice,
                "case_number": case_number,
                "client_id": client_id,
                "lead_attorney_id": user["id"],
                "team_ids": [user["id"]],
                "created_by": user["id"],
                "portal_enabled": False,
                "created_at": now_iso(),
                "updated_at": now_iso(),
            }
            await db.matters.insert_one(doc)
            await db.activities.insert_one({
                "id": new_id(),
                "firm_id": user["firm_id"],
                "matter_id": matter_id,
                "actor_id": user["id"],
                "actor_name": user["name"],
                "type": "matter_created",
                "description": f"Imported matter: {title}",
                "created_at": now_iso(),
            })
            created += 1
        await log_audit(
            db,
            firm_id=user["firm_id"],
            actor_id=user["id"],
            actor_name=user["name"],
            action="import.matters",
            resource_type="import",
            resource_id=new_id(),
            detail={"created": created, "skipped": skipped},
            new_id=new_id,
            now_iso=now_iso,
        )
        return ImportResult(created=created, skipped=skipped, errors=errors[:20])
