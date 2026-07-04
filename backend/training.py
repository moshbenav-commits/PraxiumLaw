"""
PI Case OS — training content + UX gap catalog (reads docs/pi-case-os/).
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Callable, Optional

from fastapi import Depends, HTTPException

REPO_ROOT = Path(__file__).resolve().parent.parent
PI_CASE_OS = REPO_ROOT / "docs" / "pi-case-os"
GUIDES_DIR = PI_CASE_OS / "training-guides"
ARTICLES_DIR = PI_CASE_OS / "articles"
GAPS_JSON = PI_CASE_OS / "training-ux-gaps.json"

# PraxiumLaw RBAC role → recommended guides (staff see all operational guides)
GUIDE_ROLES: dict[str, tuple[str, ...]] = {
    "intake-specialist": ("staff", "paralegal", "attorney", "partner", "admin"),
    "case-manager": ("staff", "paralegal", "attorney", "partner", "admin"),
    "paralegal": ("paralegal", "attorney", "partner", "admin"),
    "attorney-supervising": ("attorney", "partner", "admin"),
    "support-staff-clerical": ("staff", "paralegal", "admin", "partner"),
    "billing-disbursements": ("billing", "admin", "partner"),
    "virtual-assistant": ("staff", "paralegal", "admin"),
    "firm-admin-onboarding": ("admin", "partner"),
}

GUIDE_LABELS: dict[str, str] = {
    "intake-specialist": "Intake Specialist",
    "case-manager": "Case Manager",
    "paralegal": "Paralegal",
    "attorney-supervising": "Supervising Attorney",
    "support-staff-clerical": "Support / Clerical",
    "billing-disbursements": "Billing / Disbursements",
    "virtual-assistant": "Virtual Assistant",
    "firm-admin-onboarding": "Firm Admin / Office Manager",
}


def _read_md(path: Path) -> str:
    if not path.is_file():
        raise HTTPException(404, "Content not found")
    return path.read_text(encoding="utf-8")


def _title_from_md(text: str, fallback: str) -> str:
    for line in text.splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return fallback


def _guides_for_role(role: str) -> list[dict]:
    items = []
    if not GUIDES_DIR.is_dir():
        return items
    for path in sorted(GUIDES_DIR.glob("*.md")):
        if path.name == "README.md":
            continue
        slug = path.stem
        allowed = GUIDE_ROLES.get(slug, ("staff", "paralegal", "attorney", "partner", "admin", "billing"))
        if role not in allowed:
            continue
        text = path.read_text(encoding="utf-8")
        items.append(
            {
                "slug": slug,
                "type": "guide",
                "title": GUIDE_LABELS.get(slug, _title_from_md(text, slug)),
                "summary": _first_paragraph(text),
            }
        )
    return items


def _articles_catalog() -> list[dict]:
    items = []
    if not ARTICLES_DIR.is_dir():
        return items
    for path in sorted(ARTICLES_DIR.glob("*.md")):
        if path.name == "README.md":
            continue
        text = path.read_text(encoding="utf-8")
        items.append(
            {
                "slug": path.stem,
                "type": "article",
                "title": _title_from_md(text, path.stem),
                "summary": _first_paragraph(text),
            }
        )
    return items


def _first_paragraph(text: str) -> str:
    lines = text.splitlines()
    buf = []
    started = False
    for line in lines:
        if line.startswith("#"):
            continue
        if line.strip() == "---":
            if started:
                break
            continue
        if line.strip().startswith("**") and line.strip().endswith("**"):
            continue
        if not line.strip():
            if started:
                break
            continue
        started = True
        buf.append(line.strip())
    summary = " ".join(buf)
    return summary[:220] + ("…" if len(summary) > 220 else "")


def _load_ux_gaps() -> dict:
    if not GAPS_JSON.is_file():
        return {"updated": None, "summary": "", "gaps": []}
    return json.loads(GAPS_JSON.read_text(encoding="utf-8"))


def register_training_routes(api, get_current_user: Callable):
    @api.get("/training/catalog")
    async def training_catalog(user=Depends(get_current_user)):
        role = user.get("role", "staff")
        guides = _guides_for_role(role)
        articles = _articles_catalog()
        gaps = _load_ux_gaps()
        p0 = sum(1 for g in gaps.get("gaps", []) if g.get("priority") == "P0")
        return {
            "role": role,
            "guides": guides,
            "articles": articles,
            "ux_gaps_summary": {
                "total": len(gaps.get("gaps", [])),
                "p0": p0,
                "updated": gaps.get("updated"),
            },
            "disclosure_path": "DISCLOSURE.md",
        }

    @api.get("/training/content/{content_type}/{slug}")
    async def training_content(content_type: str, slug: str, user=Depends(get_current_user)):
        role = user.get("role", "staff")
        safe = re.sub(r"[^a-zA-Z0-9\-_]", "", slug)
        if safe != slug:
            raise HTTPException(400, "Invalid slug")

        if content_type == "guide":
            allowed = GUIDE_ROLES.get(safe, ("staff", "paralegal", "attorney", "partner", "admin", "billing"))
            if role not in allowed:
                raise HTTPException(403, "Guide not available for your role")
            path = GUIDES_DIR / f"{safe}.md"
        elif content_type == "article":
            path = ARTICLES_DIR / f"{safe}.md"
        elif content_type == "doc":
            name_map = {
                "disclosure": PI_CASE_OS / "DISCLOSURE.md",
                "white-label": PI_CASE_OS / "WHITE_LABEL.md",
                "site-wiring-audit": PI_CASE_OS / "SITE_WIRING_AUDIT.md",
                "ui-ux-gaps": PI_CASE_OS / "UI_UX_GAPS.md",
            }
            if safe not in name_map:
                raise HTTPException(404, "Document not found")
            path = name_map[safe]
        else:
            raise HTTPException(400, "content_type must be guide, article, or doc")

        body = _read_md(path)
        return {
            "type": content_type,
            "slug": slug,
            "title": _title_from_md(body, slug),
            "markdown": body,
        }

    @api.get("/training/ux-gaps")
    async def training_ux_gaps(
        priority: Optional[str] = None,
        area: Optional[str] = None,
        user=Depends(get_current_user),
    ):
        data = _load_ux_gaps()
        gaps = data.get("gaps", [])
        if priority:
            gaps = [g for g in gaps if g.get("priority") == priority.upper()]
        if area:
            q = area.lower()
            gaps = [g for g in gaps if q in (g.get("area") or "").lower()]
        return {"updated": data.get("updated"), "summary": data.get("summary"), "gaps": gaps}

    @api.get("/training/search")
    async def training_search(q: str, user=Depends(get_current_user)):
        if not q or len(q.strip()) < 2:
            return {"results": []}
        role = user.get("role", "staff")
        query = q.lower().strip()
        results = []
        for item in _guides_for_role(role) + _articles_catalog():
            hay = f"{item['title']} {item.get('summary', '')} {item['slug']}".lower()
            if query in hay:
                results.append(item)
        return {"results": results[:20]}
