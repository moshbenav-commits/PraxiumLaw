"""
PI Case OS — white-label template catalog + intake packet checklist PDF.
"""
from __future__ import annotations

import io
import json
import re
import zipfile
from pathlib import Path
from typing import Callable, Optional

from fastapi import Depends, HTTPException
from fastapi.responses import FileResponse, Response
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

from disclosure import require_disclosure_ack

REPO_ROOT = Path(__file__).resolve().parent.parent
PI_CASE_OS = REPO_ROOT / "docs" / "pi-case-os"
TEMPLATES_DOCX = PI_CASE_OS / "sources" / "docs" / "white-label-templates" / "docx"
TEMPLATES_PDF = PI_CASE_OS / "sources" / "docs" / "white-label-templates" / "pdf"
CHECKLIST_JSON = PI_CASE_OS / "intake-packet-checklist.json"

CATEGORY_ORDER = ("intake", "medical", "insurance", "settlement", "litigation", "pd", "other")

_CATEGORY_RULES: tuple[tuple[str, tuple[str, ...]], ...] = (
    (
        "intake",
        (
            "intake",
            "questionnaire",
            "contingency",
            "hipaa",
            "medicare",
            "power of attorney",
            "general release",
            "iso authorization",
            "wage loss",
            "disclosure",
            "attorney lien",
            "out of state",
            "dropping another",
            "consent for disclosure",
        ),
    ),
    (
        "medical",
        (
            "medical lor",
            "medical letter",
            "chiropractor",
            "cdi letter",
            "npim",
            "prior records",
            "records request",
            "letter of protection",
            "certificate of records",
        ),
    ),
    ("insurance", ("1p lor", "3p lor", "hold harmless", "aff. of assets", "aff of assets")),
    ("settlement", ("counter offer", "reduction", "settlement", "drop letter")),
    ("litigation", ("transfer to lit", "litigation", "filing", "court", "summons")),
    ("pd", ("property damage", "collision report", "pd ")),
)


def _categorize(filename: str) -> str:
    lower = filename.lower()
    for category, keywords in _CATEGORY_RULES:
        if any(kw in lower for kw in keywords):
            return category
    return "other"


def _jurisdiction(filename: str) -> str:
    if filename.startswith("(NV)"):
        return "NV"
    if filename.startswith("(WA)"):
        return "WA"
    return "General"


def _safe_filename(name: str) -> str:
    if not name or ".." in name or "/" in name or "\\" in name:
        raise HTTPException(400, "Invalid filename")
    if not re.match(r"^[\w\s\.\-\(\)_']+\.(docx|pdf)$", name, re.IGNORECASE):
        raise HTTPException(400, "Invalid filename")
    return name


def _list_templates() -> list[dict]:
    items: list[dict] = []
    if not TEMPLATES_DOCX.is_dir():
        return items
    for path in sorted(TEMPLATES_DOCX.glob("*.docx")):
        name = path.name
        pdf_path = TEMPLATES_PDF / f"{path.stem}.pdf"
        items.append(
            {
                "filename": name,
                "category": _categorize(name),
                "jurisdiction": _jurisdiction(name),
                "format": "docx",
                "size_bytes": path.stat().st_size,
                "has_pdf": pdf_path.is_file(),
            }
        )
    return items


def _load_checklist() -> dict:
    if not CHECKLIST_JSON.is_file():
        raise HTTPException(404, "Checklist not found")
    return json.loads(CHECKLIST_JSON.read_text(encoding="utf-8"))


def _item_label(item) -> str:
    if isinstance(item, dict):
        return item.get("label") or str(item)
    return str(item)


def _draw_checklist_pdf(data: dict, firm_name: Optional[str] = None) -> bytes:
    buf = io.BytesIO()
    w, h = letter
    c = canvas.Canvas(buf, pagesize=letter)
    y = h - 0.75 * inch
    margin = 0.75 * inch
    line_h = 14

    def new_page():
        nonlocal y
        c.showPage()
        y = h - 0.75 * inch

    def ensure_space(need: float = 40):
        nonlocal y
        if y < margin + need:
            new_page()

    c.setFont("Helvetica-Bold", 16)
    c.drawString(margin, y, data.get("title", "Intake Packet Checklist"))
    y -= 22
    if firm_name:
        c.setFont("Helvetica", 10)
        c.drawString(margin, y, f"Firm: {firm_name}")
        y -= 16
    c.setFont("Helvetica-Oblique", 8)
    disclaimer = data.get("disclaimer", "")
    for chunk in _wrap_text(disclaimer, 95):
        ensure_space(12)
        c.drawString(margin, y, chunk)
        y -= 10
    y -= 8

    for section in data.get("sections", []):
        ensure_space(36)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(margin, y, section.get("title", ""))
        y -= line_h + 2
        c.setFont("Helvetica", 10)
        for item in section.get("items", []):
            ensure_space(line_h + 4)
            label = _item_label(item)
            tpl = item.get("template") if isinstance(item, dict) else None
            req = item.get("required") if isinstance(item, dict) else None
            prefix = "[ ] "
            if req is True:
                prefix = "[ ] * "
            elif req is False and tpl:
                prefix = "[ ] (opt) "
            line = prefix + label
            if tpl:
                line += f"  —  {tpl}"
            for chunk in _wrap_text(line, 88):
                c.drawString(margin + 8, y, chunk)
                y -= line_h
        y -= 6

    c.setFont("Helvetica-Oblique", 8)
    ensure_space(20)
    c.drawString(margin, y, "* Required for standard MVA intake — counsel review before use.")
    c.save()
    return buf.getvalue()


WHITE_LABEL_PLACEHOLDERS = (
    "FIRM_NAME",
    "FIRM_DBA",
    "ATTORNEY_NAME",
    "ATTORNEY_BAR",
    "CASE_MANAGER",
    "FIRM_ADDRESS",
    "FIRM_PHONE",
    "FIRM_FAX",
    "FIRM_EMAIL",
    "TRUST_ACCOUNT",
    "FEE_CONTINGENT",
    "JURISDICTION",
    "SOL_YEARS",
)


def _xml_escape(value: str) -> str:
    return (
        str(value or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


WHITE_LABEL_PROFILE_FIELDS = (
    "firm_dba",
    "attorney_name",
    "attorney_bar",
    "case_manager",
    "firm_address",
    "firm_phone",
    "firm_fax",
    "firm_email",
    "trust_account",
    "fee_contingent",
    "jurisdiction",
    "sol_years",
)


def build_firm_merge_tokens(firm: Optional[dict], user: Optional[dict] = None) -> dict[str, str]:
    """Map {{PLACEHOLDER}} → firm white-label profile values."""
    firm = firm or {}
    wl = (firm.get("settings") or {}).get("white_label") or {}
    user = user or {}
    raw = {
        "FIRM_NAME": firm.get("name") or wl.get("firm_name") or "Your Firm",
        "FIRM_DBA": wl.get("firm_dba") or firm.get("name") or "",
        "ATTORNEY_NAME": wl.get("attorney_name") or user.get("name") or "",
        "ATTORNEY_BAR": wl.get("attorney_bar") or "",
        "CASE_MANAGER": wl.get("case_manager") or user.get("name") or "",
        "FIRM_ADDRESS": wl.get("firm_address") or firm.get("address") or "",
        "FIRM_PHONE": wl.get("firm_phone") or "",
        "FIRM_FAX": wl.get("firm_fax") or "",
        "FIRM_EMAIL": wl.get("firm_email") or user.get("email") or "",
        "TRUST_ACCOUNT": wl.get("trust_account") or "",
        "FEE_CONTINGENT": wl.get("fee_contingent") or "",
        "JURISDICTION": wl.get("jurisdiction") or "",
        "SOL_YEARS": wl.get("sol_years") or "",
    }
    return {"{{" + key + "}}": raw[key] for key in WHITE_LABEL_PLACEHOLDERS}


def merge_docx_bytes(raw: bytes, tokens: dict[str, str]) -> bytes:
    """Replace {{FIRM_*}} placeholders in DOCX XML parts."""
    buf_in = io.BytesIO(raw)
    buf_out = io.BytesIO()
    with zipfile.ZipFile(buf_in, "r") as zin:
        with zipfile.ZipFile(buf_out, "w", compression=zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)
                if item.filename.endswith(".xml") or item.filename.endswith(".rels"):
                    text = data.decode("utf-8")
                    for placeholder, value in tokens.items():
                        if placeholder in text:
                            text = text.replace(placeholder, _xml_escape(value))
                    data = text.encode("utf-8")
                zout.writestr(item, data)
    return buf_out.getvalue()


def _wrap_text(text: str, width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current: list[str] = []
    for word in words:
        trial = " ".join(current + [word])
        if len(trial) <= width:
            current.append(word)
        else:
            if current:
                lines.append(" ".join(current))
            current = [word]
    if current:
        lines.append(" ".join(current))
    return lines or [""]


def register_training_template_routes(
    api,
    get_current_user: Callable,
    get_firm_name: Optional[Callable] = None,
    get_firm_for_user: Optional[Callable] = None,
):
    @api.get("/training/templates")
    async def training_templates_list(
        category: Optional[str] = None,
        jurisdiction: Optional[str] = None,
        q: Optional[str] = None,
        user=Depends(get_current_user),
    ):
        items = _list_templates()
        if category:
            cat = category.lower()
            items = [i for i in items if i["category"] == cat]
        if jurisdiction:
            jur = jurisdiction.upper()
            items = [i for i in items if i["jurisdiction"] == jur or i["jurisdiction"] == "General"]
        if q and len(q.strip()) >= 2:
            query = q.lower().strip()
            items = [i for i in items if query in i["filename"].lower()]
        by_category: dict[str, int] = {}
        for i in items:
            by_category[i["category"]] = by_category.get(i["category"], 0) + 1
        return {
            "total": len(items),
            "library_path": "docs/pi-case-os/sources/docs/white-label-templates/docx",
            "download_available": TEMPLATES_DOCX.is_dir(),
            "categories": list(CATEGORY_ORDER),
            "counts_by_category": by_category,
            "templates": items,
        }

    @api.get("/training/templates/merge-tokens")
    async def training_template_merge_tokens(user=Depends(get_current_user)):
        firm = await get_firm_for_user(user) if get_firm_for_user else None
        tokens = build_firm_merge_tokens(firm, user)
        missing = [k for k, v in tokens.items() if not v or v in ("Your Firm", "")]
        return {
            "tokens": tokens,
            "missing_count": len(missing),
            "missing_keys": missing,
            "profile_route": "/settings",
        }

    @api.get("/training/templates/download/{filename}")
    async def training_template_download(
        filename: str,
        merge: bool = True,
        user=Depends(get_current_user),
    ):
        require_disclosure_ack(user)
        safe = _safe_filename(filename)
        path = TEMPLATES_DOCX / safe
        if not path.is_file():
            raise HTTPException(404, "Template file not on server — use local corpus or clone repo")
        if not merge or not safe.lower().endswith(".docx"):
            return FileResponse(
                path,
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                filename=safe,
            )
        firm = await get_firm_for_user(user) if get_firm_for_user else None
        tokens = build_firm_merge_tokens(firm, user)
        merged = merge_docx_bytes(path.read_bytes(), tokens)
        stem = path.stem
        out_name = f"{stem}-merged.docx"
        return Response(
            content=merged,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{out_name}"'},
        )

    @api.get("/training/intake-checklist")
    async def training_intake_checklist(user=Depends(get_current_user)):
        return _load_checklist()

    @api.get("/training/intake-checklist.pdf")
    async def training_intake_checklist_pdf(user=Depends(get_current_user)):
        data = _load_checklist()
        firm_name = None
        if get_firm_name:
            try:
                firm_name = await get_firm_name(user)
            except Exception:
                firm_name = None
        pdf_bytes = _draw_checklist_pdf(data, firm_name=firm_name)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="intake-packet-checklist.pdf"'},
        )
