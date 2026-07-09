"""
PI Case OS — DocGen letter automation (UX-012/013 letter gap, UX-027).

Generates demand, MedPay, reduction-request, drop, and disbursement letters
from matter + firm white-label data, renders DOCX/PDF, and files the output
as a matter document. Attorney gates: demand/MedPay letters are watermarked
DRAFT until the demand is attorney-approved; disbursement letters require an
attorney-approved settlement scenario; reduction letters require the
attorney-set reduction on the provider line.
"""
from __future__ import annotations

import base64
import io
import re
import zipfile
from datetime import datetime
from typing import Any, Callable, Literal, Optional
from xml.sax.saxutils import escape as _xml_escape

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field
from reportlab.lib.pagesizes import letter as LETTER_PAGE
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

from disclosure import require_disclosure_ack
from pdf_util import append_pdf_pages, is_pdf, page_count
from rbac import role_has_permission
from training_templates import build_firm_merge_tokens

DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
PDF_MIME = "application/pdf"

LETTER_TYPES: tuple[dict[str, str], ...] = (
    {
        "id": "demand",
        "label": "Demand letter",
        "description": "Settlement demand to the adverse carrier — exhibits, specials, economic and general damages.",
        "permission": "demand.draft",
        "tab": "demand",
    },
    {
        "id": "medpay",
        "label": "MedPay letter (1P)",
        "description": "First-party MedPay benefits request with enclosed bills.",
        "permission": "demand.draft",
        "tab": "demand",
    },
    {
        "id": "lor",
        "label": "Letter of representation (LOR)",
        "description": "Notice to a carrier that the firm represents the client — directs all contact to the firm and requests the claim number and policy limits.",
        "permission": "demand.draft",
        "tab": "demand",
    },
    {
        "id": "drop",
        "label": "Drop letter",
        "description": "Notice of withdrawal of representation to a provider or lien holder.",
        "permission": "demand.draft",
        "tab": "demand",
    },
    {
        "id": "lien_verification",
        "label": "Lien balance verification",
        "description": "Ask a provider or lien holder to confirm the current outstanding balance in writing before disbursement.",
        "permission": "settlement.draft",
        "tab": "settlement",
    },
    {
        "id": "reduction_request",
        "label": "Reduction request",
        "description": "Ask a provider to accept the attorney-set reduced payoff.",
        "permission": "settlement.draft",
        "tab": "settlement",
    },
    {
        "id": "disbursement",
        "label": "Disbursement letter",
        "description": "Client settlement statement from the attorney-approved scenario.",
        "permission": "settlement.draft",
        "tab": "settlement",
    },
)

LETTER_PERMISSIONS = {row["id"]: row["permission"] for row in LETTER_TYPES}
LETTER_LABELS = {row["id"]: row["label"] for row in LETTER_TYPES}

DEMAND_TYPE_TITLES = {
    "third_party": "Settlement Demand — Bodily Injury",
    "medpay": "MedPay Demand — Chronological Exhibits",
    "um_uim": "UM / UIM Settlement Request",
}


# ──────────────── formatting helpers ────────────────
def fmt_money(value: Any) -> str:
    try:
        return f"${float(value or 0):,.2f}"
    except (TypeError, ValueError):
        return "$0.00"


def fmt_date(value: Optional[str]) -> str:
    if not value:
        return ""
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return str(value)
    return f"{dt.strftime('%B')} {dt.day}, {dt.year}"


def firm_tokens_raw(firm: Optional[dict], user: Optional[dict] = None) -> dict[str, str]:
    """build_firm_merge_tokens keys are '{{FIRM_NAME}}' — strip to bare names."""
    return {k[2:-2]: v for k, v in build_firm_merge_tokens(firm, user).items()}


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


# ──────────────── letter block model ────────────────
def para(text: str = "", *, bold: bool = False, align: str = "left", size: str = "normal") -> dict:
    return {"kind": "para", "text": text or "", "bold": bold, "align": align, "size": size}


def heading(text: str) -> dict:
    return {"kind": "heading", "text": text}


def spacer() -> dict:
    return {"kind": "spacer"}


def table(rows: list[list[Any]], *, header: bool = False) -> dict:
    """rows: list of rows; each cell is str or {text, align, bold}."""
    norm: list[list[dict]] = []
    for row in rows:
        norm.append([c if isinstance(c, dict) else {"text": str(c), "align": "left", "bold": False} for c in row])
    return {"kind": "table", "rows": norm, "header": header}


def _cell(text: str, *, align: str = "left", bold: bool = False) -> dict:
    return {"text": text, "align": align, "bold": bold}


def money_cell(value: Any, *, bold: bool = False) -> dict:
    return _cell(fmt_money(value), align="right", bold=bold)


# ──────────────── shared letter sections ────────────────
def letterhead_blocks(tokens: dict[str, str]) -> list[dict]:
    blocks = [para(tokens.get("FIRM_NAME") or "Your Firm", bold=True, align="center", size="title")]
    contact_bits = [b for b in (tokens.get("FIRM_ADDRESS"), tokens.get("FIRM_PHONE") and f"Tel {tokens['FIRM_PHONE']}", tokens.get("FIRM_FAX") and f"Fax {tokens['FIRM_FAX']}", tokens.get("FIRM_EMAIL")) if b]
    if contact_bits:
        blocks.append(para(" · ".join(contact_bits), align="center", size="small"))
    blocks.append(spacer())
    return blocks


def recipient_blocks(name: str, address: str = "", attention: str = "") -> list[dict]:
    blocks: list[dict] = []
    if name:
        blocks.append(para(name, bold=True))
    if attention:
        blocks.append(para(f"Attn: {attention}"))
    for line in (address or "").splitlines():
        if line.strip():
            blocks.append(para(line.strip()))
    blocks.append(spacer())
    return blocks


def re_blocks(pairs: list[tuple[str, str]]) -> list[dict]:
    blocks: list[dict] = []
    for i, (label, value) in enumerate([(l, v) for l, v in pairs if v]):
        prefix = "Re:  " if i == 0 else "      "
        blocks.append(para(f"{prefix}{label}: {value}", bold=i == 0))
    blocks.append(spacer())
    return blocks


def closing_blocks(tokens: dict[str, str]) -> list[dict]:
    blocks = [spacer(), para("Very truly yours,"), spacer()]
    attorney = tokens.get("ATTORNEY_NAME") or "Attorney at Law"
    blocks.append(para(attorney, bold=True))
    if tokens.get("ATTORNEY_BAR"):
        blocks.append(para(f"Bar No. {tokens['ATTORNEY_BAR']}", size="small"))
    blocks.append(para(tokens.get("FIRM_DBA") or tokens.get("FIRM_NAME") or "", size="small"))
    return blocks


def _watermark_blocks() -> list[dict]:
    return [
        para("DRAFT — PENDING ATTORNEY APPROVAL — NOT FOR SEND", bold=True, align="center"),
        spacer(),
    ]


def _provider_names_match(label: str, provider_name: str) -> bool:
    a = (label or "").casefold().strip()
    b = (provider_name or "").casefold().strip()
    if not a or not b:
        return False
    return a in b or b in a


def match_bill_documents(bill_docs: list[dict], provider_name: str) -> list[dict]:
    """Bill documents (taxonomy medical/B) whose provider_label matches a ledger provider."""
    return [
        d for d in bill_docs
        if _provider_names_match((d.get("taxonomy") or {}).get("provider_label") or "", provider_name)
    ]


# Merge-field coverage: which letter fields are filled, and which tab fills them.
def compute_letter_missing_fields(
    letter_type: str,
    *,
    tokens: dict[str, str],
    matter: dict,
    client: Optional[dict],
    demand: dict,
    insurance: dict,
    scenarios: list[dict],
    bill_rows: list[dict],
) -> list[dict]:
    tp = insurance.get("third_party") or {}
    fp = insurance.get("first_party") or {}
    checks: list[tuple[str, str, str, Any]] = [
        ("client_name", "Client contact linked", "Contacts", (client or {}).get("name")),
        ("incident_date", "Date of loss", "Matter", matter.get("incident_date")),
        ("attorney_name", "Attorney name", "Settings → Templates", tokens.get("ATTORNEY_NAME")),
        ("firm_address", "Firm address", "Settings → Templates", tokens.get("FIRM_ADDRESS")),
    ]
    if letter_type == "demand":
        checks += [
            ("tp_carrier", "3P carrier name", "Insurance tab", tp.get("carrier_name")),
            ("tp_claim", "3P claim number", "Insurance tab", tp.get("claim_number")),
            ("tp_adjuster", "3P adjuster name", "Insurance tab", (tp.get("adjuster") or {}).get("name")),
            ("tp_adjuster_address", "3P adjuster mailing address", "Insurance tab", (tp.get("adjuster") or {}).get("mailing_address")),
            ("exhibits", "Demand exhibits", "Demand tab", (demand.get("exhibits") or None)),
        ]
    elif letter_type == "medpay":
        checks += [
            ("fp_carrier", "1P carrier name", "Insurance tab", fp.get("carrier_name")),
            ("fp_claim", "1P claim number", "Insurance tab", fp.get("claim_number")),
            ("fp_adjuster_address", "1P adjuster mailing address", "Insurance tab", (fp.get("adjuster") or {}).get("mailing_address")),
            ("medpay_limit", "MedPay limit", "Insurance tab", (fp.get("medpay") or {}).get("limit")),
            ("bills", "Provider balances", "Medical tab", bill_rows or None),
        ]
    elif letter_type == "lor":
        checks += [
            ("tp_carrier", "3P carrier name", "Insurance tab", tp.get("carrier_name")),
        ]
    elif letter_type == "lien_verification":
        checks.append(("bills", "Provider balances", "Medical tab", bill_rows or None))
    elif letter_type == "reduction_request":
        has_reduction = any(
            (li.get("reduction_type") or "none") != "none"
            for s in scenarios for li in (s.get("line_items") or [])
        )
        checks.append(("reductions", "Attorney-set reductions", "Settlement tab", has_reduction or None))
    elif letter_type == "disbursement":
        checks += [
            ("client_address", "Client mailing address", "Contacts", (client or {}).get("address")),
            ("approved_scenario", "Attorney-approved scenario", "Settlement tab",
             any(s.get("attorney_approved") for s in scenarios) or None),
        ]
    return [
        {"field": field, "label": label, "source": source}
        for field, label, source, value in checks
        if not value
    ]


def _common_warnings(tokens: dict[str, str], client: Optional[dict]) -> list[str]:
    warnings: list[str] = []
    if not tokens.get("ATTORNEY_NAME"):
        warnings.append("White-label profile missing attorney name — set it in Settings → Templates")
    if (tokens.get("FIRM_NAME") or "Your Firm") == "Your Firm":
        warnings.append("Firm name not configured in white-label profile")
    if not client:
        warnings.append("Matter has no linked client contact — client fields are blank")
    return warnings


# ──────────────── compose: demand ────────────────
def compose_demand_letter(
    *,
    tokens: dict[str, str],
    matter: dict,
    client: Optional[dict],
    demand: dict,
    insurance: dict,
    validation: dict,
    today_iso: str,
    overrides: Optional[dict] = None,
) -> dict:
    ov = overrides or {}
    warnings = _common_warnings(tokens, client)
    demand_type = demand.get("demand_type") or "third_party"
    side = insurance.get("first_party") if demand_type in ("medpay", "um_uim") else insurance.get("third_party")
    side = side or {}
    adjuster = side.get("adjuster") or {}

    recipient_name = ov.get("recipient_name") or side.get("carrier_name") or ""
    recipient_addr = ov.get("recipient_address") or adjuster.get("mailing_address") or ""
    attention = ov.get("attention") or adjuster.get("name") or ""
    if not recipient_name:
        warnings.append("No carrier on the Insurance tab — recipient left blank")

    client_name = (client or {}).get("name") or ""
    exhibits = [e for e in (demand.get("exhibits") or []) if e.get("included")]
    if not exhibits:
        warnings.append("No included exhibits — rebuild from the Meds ledger before sending")

    watermark = demand.get("status") not in ("approved", "sent")
    blocks: list[dict] = []
    if watermark:
        blocks += _watermark_blocks()
    blocks += letterhead_blocks(tokens)
    blocks.append(para(fmt_date(today_iso)))
    blocks.append(spacer())
    blocks += recipient_blocks(recipient_name, recipient_addr, attention)
    blocks += re_blocks(
        [
            ("Our client", client_name),
            ("Claim number", side.get("claim_number") or ""),
            ("Policy number", side.get("policy_number") or ""),
            ("Date of loss", fmt_date(matter.get("incident_date"))),
        ]
    )
    blocks.append(para(DEMAND_TYPE_TITLES.get(demand_type, DEMAND_TYPE_TITLES["third_party"]), bold=True, align="center"))
    blocks.append(para("FOR SETTLEMENT PURPOSES ONLY — NOT ADMISSIBLE", align="center", size="small"))
    blocks.append(spacer())
    blocks.append(para(f"Dear {attention or 'Claims Representative'}:"))
    blocks.append(spacer())
    blocks.append(
        para(
            f"This office represents {client_name or 'our client'} in connection with injuries sustained "
            f"in the incident of {fmt_date(matter.get('incident_date')) or '[date of loss]'}. "
            "This letter is our formal demand for settlement of the bodily injury claim."
        )
    )
    if matter.get("description"):
        blocks.append(spacer())
        blocks.append(heading("FACTS AND LIABILITY"))
        blocks.append(para(str(matter["description"])))
    if demand.get("letter_draft_notes"):
        blocks.append(spacer())
        blocks.append(heading("INJURIES AND TREATMENT"))
        blocks.append(para(str(demand["letter_draft_notes"])))

    blocks.append(spacer())
    blocks.append(heading("MEDICAL SPECIALS"))
    rows: list[list[Any]] = [[_cell("#", bold=True), _cell("Provider", bold=True), _cell("Specialty", bold=True), _cell("Amount", align="right", bold=True)]]
    for i, ex in enumerate(sorted(exhibits, key=lambda e: e.get("sort_order") or 0), start=1):
        rows.append([str(i), ex.get("provider_name") or ex.get("label") or "", ex.get("specialty") or "", money_cell(ex.get("amount"))])
    rows.append([_cell(""), _cell("Total medical specials", bold=True), _cell(""), money_cell(validation.get("exhibit_specials"), bold=True)])
    blocks.append(table(rows, header=True))

    econ = demand.get("economic_damages") or {}
    econ_total = validation.get("economic_damages_total") or 0
    if econ_total:
        blocks.append(spacer())
        blocks.append(heading("ECONOMIC DAMAGES"))
        econ_rows: list[list[Any]] = []
        for label, key in (
            ("Wage loss", "wage_loss_total"),
            ("Medical mileage", "mileage_total"),
            ("Rental vehicle", "rental_car_total"),
            ("Other out-of-pocket expenses", "other_expenses_total"),
        ):
            if float(econ.get(key) or 0) > 0:
                econ_rows.append([label, money_cell(econ.get(key))])
        econ_rows.append([_cell("Total economic damages", bold=True), money_cell(econ_total, bold=True)])
        blocks.append(table(econ_rows))

    if demand.get("general_damages_notes"):
        blocks.append(spacer())
        blocks.append(heading("GENERAL DAMAGES"))
        blocks.append(para(str(demand["general_damages_notes"])))

    demand_amount = ov.get("demand_amount")
    if demand_amount is None:
        demand_amount = validation.get("grand_demand_total") or 0
    blocks.append(spacer())
    blocks.append(heading("DEMAND"))
    blocks.append(
        para(
            f"Based on the foregoing, {client_name or 'our client'} hereby demands "
            f"{fmt_money(demand_amount)} in full and final settlement of the bodily injury claim."
        )
    )
    if demand.get("response_due_date"):
        blocks.append(spacer())
        blocks.append(para(f"Please respond on or before {fmt_date(demand['response_due_date'])}."))
    blocks += closing_blocks(tokens)
    if exhibits:
        blocks.append(spacer())
        blocks.append(para("Enclosures:", bold=True, size="small"))
        for ex in sorted(exhibits, key=lambda e: e.get("sort_order") or 0):
            blocks.append(para(f"  • {ex.get('label') or ex.get('provider_name') or 'Exhibit'}", size="small"))

    return {
        "letter_type": "demand",
        "title": LETTER_LABELS["demand"],
        "filename_stem": f"{matter.get('case_number') or matter.get('id')} Demand Letter",
        "blocks": blocks,
        "warnings": warnings,
        "watermark": watermark,
    }


# ──────────────── compose: medpay ────────────────
def compose_medpay_letter(
    *,
    tokens: dict[str, str],
    matter: dict,
    client: Optional[dict],
    demand: dict,
    insurance: dict,
    ledger_rows: list[dict],
    today_iso: str,
    overrides: Optional[dict] = None,
) -> dict:
    ov = overrides or {}
    warnings = _common_warnings(tokens, client)
    side = insurance.get("first_party") or {}
    adjuster = side.get("adjuster") or {}
    medpay = side.get("medpay") or {}

    recipient_name = ov.get("recipient_name") or side.get("carrier_name") or ""
    if not recipient_name:
        warnings.append("First-party carrier not on the Insurance tab — recipient left blank")
    bills = [r for r in ledger_rows if float(r.get("balance") or 0) > 0]
    wanted_ids = ov.get("ledger_row_ids")
    if wanted_ids:
        bills = [r for r in bills if r.get("id") in set(wanted_ids)]
    if not bills:
        warnings.append("No provider balances on the Meds ledger — bill enclosure table is empty")
    total = round(sum(float(r.get("balance") or 0) for r in bills), 2)
    client_name = (client or {}).get("name") or ""
    watermark = demand.get("status") not in ("approved", "sent")

    blocks: list[dict] = []
    if watermark:
        blocks += _watermark_blocks()
    blocks += letterhead_blocks(tokens)
    blocks.append(para(fmt_date(today_iso)))
    blocks.append(spacer())
    blocks += recipient_blocks(recipient_name, ov.get("recipient_address") or adjuster.get("mailing_address") or "", ov.get("attention") or adjuster.get("name") or "")
    blocks += re_blocks(
        [
            ("Our client / your insured", client_name),
            ("Claim number", side.get("claim_number") or ""),
            ("Policy number", side.get("policy_number") or ""),
            ("Date of loss", fmt_date(matter.get("incident_date"))),
        ]
    )
    blocks.append(para("REQUEST FOR MEDICAL PAYMENTS BENEFITS", bold=True, align="center"))
    blocks.append(spacer())
    blocks.append(para(f"Dear {ov.get('attention') or adjuster.get('name') or 'Claims Representative'}:"))
    blocks.append(spacer())
    blocks.append(
        para(
            f"This office represents {client_name or 'your insured'} for injuries arising out of the incident of "
            f"{fmt_date(matter.get('incident_date')) or '[date of loss]'}. Please accept this letter as a formal request "
            "for payment of Medical Payments benefits under the above policy for the enclosed bills:"
        )
    )
    blocks.append(spacer())
    rows: list[list[Any]] = [[_cell("Provider", bold=True), _cell("Specialty", bold=True), _cell("Amount", align="right", bold=True)]]
    for r in bills:
        rows.append([r.get("provider_name") or "", r.get("specialty") or "", money_cell(r.get("balance"))])
    rows.append([_cell("Total requested", bold=True), _cell(""), money_cell(total, bold=True)])
    blocks.append(table(rows, header=True))
    if medpay.get("limit"):
        blocks.append(spacer())
        blocks.append(para(f"We understand the Medical Payments limit under this policy is {fmt_money(medpay['limit'])}.", size="small"))
    blocks.append(spacer())
    blocks.append(para("Please issue payment within 30 days and confirm in writing. Contact our office with any questions."))
    blocks += closing_blocks(tokens)

    return {
        "letter_type": "medpay",
        "title": LETTER_LABELS["medpay"],
        "filename_stem": f"{matter.get('case_number') or matter.get('id')} MedPay Letter",
        "blocks": blocks,
        "warnings": warnings,
        "watermark": watermark,
        "total_requested": total,
    }


# ──────────────── compose: reduction request ────────────────
def _line_reduced_amount(line: dict) -> float:
    balance = float(line.get("balance") or 0)
    rtype = line.get("reduction_type") or "none"
    if rtype == "percent":
        return round(max(0.0, balance * (1 - float(line.get("reduction_percent") or 0) / 100)), 2)
    if rtype == "flat":
        return round(max(0.0, balance - float(line.get("reduction_flat") or 0)), 2)
    return round(balance, 2)


def compose_reduction_letter(
    *,
    tokens: dict[str, str],
    matter: dict,
    client: Optional[dict],
    line: dict,
    today_iso: str,
    overrides: Optional[dict] = None,
) -> dict:
    ov = overrides or {}
    warnings = _common_warnings(tokens, client)
    client_name = (client or {}).get("name") or ""
    balance = float(line.get("balance") or 0)
    reduced = _line_reduced_amount(line)
    provider = ov.get("recipient_name") or line.get("provider_name") or "Provider"

    blocks: list[dict] = []
    blocks += letterhead_blocks(tokens)
    blocks.append(para(fmt_date(today_iso)))
    blocks.append(spacer())
    blocks += recipient_blocks(provider, ov.get("recipient_address") or "", ov.get("attention") or "Billing / Lien Department")
    blocks += re_blocks(
        [
            ("Patient", client_name),
            ("Date of loss", fmt_date(matter.get("incident_date"))),
            ("Outstanding balance", fmt_money(balance)),
        ]
    )
    blocks.append(para("REQUEST FOR REDUCTION OF OUTSTANDING BALANCE", bold=True, align="center"))
    blocks.append(spacer())
    blocks.append(para("To Whom It May Concern:"))
    blocks.append(spacer())
    blocks.append(
        para(
            f"This office represents {client_name or 'the above patient'} in a personal injury claim arising from the "
            f"incident of {fmt_date(matter.get('incident_date')) or '[date of loss]'}. The matter has now resolved. "
            "After attorney fees, case costs, and the other outstanding medical balances, the recovery available to our "
            "client is not sufficient to satisfy all balances in full."
        )
    )
    blocks.append(spacer())
    blocks.append(
        para(
            f"We respectfully request that you accept {fmt_money(reduced)} in full and final satisfaction of the "
            f"outstanding balance of {fmt_money(balance)} (a reduction of {fmt_money(round(balance - reduced, 2))}). "
            "Payment will issue promptly from settlement proceeds upon your written confirmation."
        )
    )
    if ov.get("body_notes"):
        blocks.append(spacer())
        blocks.append(para(str(ov["body_notes"])))
    blocks.append(spacer())
    blocks.append(para("Please confirm acceptance in writing at your earliest convenience. Thank you for working with our client."))
    blocks += closing_blocks(tokens)

    return {
        "letter_type": "reduction_request",
        "title": LETTER_LABELS["reduction_request"],
        "filename_stem": f"{matter.get('case_number') or matter.get('id')} Reduction Request — {provider}",
        "blocks": blocks,
        "warnings": warnings,
        "watermark": False,
        "reduced_amount": reduced,
    }


# ──────────────── compose: drop letter ────────────────
def compose_drop_letter(
    *,
    tokens: dict[str, str],
    matter: dict,
    client: Optional[dict],
    today_iso: str,
    overrides: Optional[dict] = None,
) -> dict:
    ov = overrides or {}
    warnings = _common_warnings(tokens, client)
    client_name = (client or {}).get("name") or ""
    recipient = ov.get("recipient_name") or "To Whom It May Concern"
    if not ov.get("recipient_name"):
        warnings.append("No recipient given — letter addressed 'To Whom It May Concern'")

    blocks: list[dict] = []
    blocks += letterhead_blocks(tokens)
    blocks.append(para(fmt_date(today_iso)))
    blocks.append(spacer())
    blocks += recipient_blocks(ov.get("recipient_name") or "", ov.get("recipient_address") or "", ov.get("attention") or "")
    blocks += re_blocks(
        [
            ("Client / patient", client_name),
            ("Date of loss", fmt_date(matter.get("incident_date"))),
            ("Matter", matter.get("case_number") or ""),
        ]
    )
    blocks.append(para("NOTICE OF WITHDRAWAL OF REPRESENTATION", bold=True, align="center"))
    blocks.append(spacer())
    blocks.append(para(f"Dear {recipient}:"))
    blocks.append(spacer())
    blocks.append(
        para(
            f"Please be advised that effective {fmt_date(today_iso)}, this office no longer represents "
            f"{client_name or 'the above client'} in connection with the incident of "
            f"{fmt_date(matter.get('incident_date')) or '[date of loss]'}."
        )
    )
    blocks.append(spacer())
    blocks.append(
        para(
            "Please direct all future correspondence, billing statements, and lien notices regarding this matter "
            "directly to the client. This office asserts no further interest in the claim except as may be separately "
            "noticed in writing."
        )
    )
    if ov.get("body_notes"):
        blocks.append(spacer())
        blocks.append(para(str(ov["body_notes"])))
    blocks += closing_blocks(tokens)

    return {
        "letter_type": "drop",
        "title": LETTER_LABELS["drop"],
        "filename_stem": f"{matter.get('case_number') or matter.get('id')} Drop Letter",
        "blocks": blocks,
        "warnings": warnings,
        "watermark": False,
    }


# ──────────────── compose: letter of representation ────────────────
LOR_SIDE_TITLES = {
    "third_party": "LETTER OF REPRESENTATION",
    "first_party": "LETTER OF REPRESENTATION — FIRST-PARTY CLAIM",
}


def compose_lor_letter(
    *,
    tokens: dict[str, str],
    matter: dict,
    client: Optional[dict],
    insurance: dict,
    side_key: str,
    today_iso: str,
    overrides: Optional[dict] = None,
) -> dict:
    ov = overrides or {}
    warnings = _common_warnings(tokens, client)
    side_key = side_key if side_key in ("third_party", "first_party") else "third_party"
    side = (insurance.get(side_key) or {}) if insurance else {}
    adjuster = side.get("adjuster") or {}
    client_name = (client or {}).get("name") or ""
    side_label = "first-party" if side_key == "first_party" else "third-party"

    recipient_name = ov.get("recipient_name") or side.get("carrier_name") or ""
    if not recipient_name:
        warnings.append(f"No {side_label} carrier on the Insurance tab — recipient left blank")

    blocks: list[dict] = []
    blocks += letterhead_blocks(tokens)
    blocks.append(para(fmt_date(today_iso)))
    blocks.append(spacer())
    blocks += recipient_blocks(
        recipient_name,
        ov.get("recipient_address") or adjuster.get("mailing_address") or "",
        ov.get("attention") or adjuster.get("name") or "",
    )
    re_pairs = [
        ("Our client" + ("/ your insured" if side_key == "first_party" else ""), client_name),
        ("Claim number", side.get("claim_number") or ""),
        ("Policy number", side.get("policy_number") or ""),
        ("Date of loss", fmt_date(matter.get("incident_date"))),
    ]
    if side_key == "third_party":
        re_pairs.insert(1, ("Your insured", ov.get("insured_name") or ""))
    blocks += re_blocks(re_pairs)
    blocks.append(para(LOR_SIDE_TITLES[side_key], bold=True, align="center"))
    blocks.append(spacer())
    blocks.append(para(f"Dear {ov.get('attention') or adjuster.get('name') or 'Claims Representative'}:"))
    blocks.append(spacer())
    if side_key == "first_party":
        opening = (
            f"Please be advised that this office represents {client_name or 'our client'}, your insured, in connection "
            f"with a claim for benefits arising out of the incident of {fmt_date(matter.get('incident_date')) or '[date of loss]'}."
        )
    else:
        opening = (
            f"Please be advised that this office represents {client_name or 'our client'} for injuries sustained as a "
            f"result of the incident of {fmt_date(matter.get('incident_date')) or '[date of loss]'}, caused by your insured."
        )
    blocks.append(para(opening))
    blocks.append(spacer())
    blocks.append(
        para(
            "Kindly direct all future correspondence and communication regarding this matter to this office. Please do "
            "not contact our client directly. We further request that you place your insured's liability carrier on notice "
            "if you have not already done so."
        )
    )
    blocks.append(spacer())
    blocks.append(para("So that we may properly evaluate this claim, please provide the following in writing:"))
    for item in (
        "Your claim number and the adjuster assigned",
        "Confirmation of applicable policy limits (bodily injury and, if any, medical payments / PIP)",
        "A certified or complete copy of the declarations page",
        "Your position on liability",
    ):
        blocks.append(para(f"  • {item}", size="small"))
    if ov.get("body_notes"):
        blocks.append(spacer())
        blocks.append(para(str(ov["body_notes"])))
    blocks.append(spacer())
    blocks.append(para("Thank you for your prompt attention. We look forward to your acknowledgment of representation."))
    blocks += closing_blocks(tokens)

    return {
        "letter_type": "lor",
        "title": LETTER_LABELS["lor"],
        "filename_stem": f"{matter.get('case_number') or matter.get('id')} LOR ({'1P' if side_key == 'first_party' else '3P'})",
        "blocks": blocks,
        "warnings": warnings,
        "watermark": False,
        "side": side_key,
    }


# ──────────────── compose: lien balance verification ────────────────
def compose_lien_verification_letter(
    *,
    tokens: dict[str, str],
    matter: dict,
    client: Optional[dict],
    line: dict,
    today_iso: str,
    overrides: Optional[dict] = None,
) -> dict:
    ov = overrides or {}
    warnings = _common_warnings(tokens, client)
    client_name = (client or {}).get("name") or ""
    balance = float(line.get("balance") or 0)
    lien_holder = (line.get("lien_holder") or "").strip()
    provider = ov.get("recipient_name") or lien_holder or line.get("provider_name") or "Provider"
    recipient_kind = "lien holder" if lien_holder and lien_holder != line.get("provider_name") else "provider"

    blocks: list[dict] = []
    blocks += letterhead_blocks(tokens)
    blocks.append(para(fmt_date(today_iso)))
    blocks.append(spacer())
    blocks += recipient_blocks(provider, ov.get("recipient_address") or "", ov.get("attention") or "Billing / Lien Department")
    blocks += re_blocks(
        [
            ("Patient", client_name),
            ("Date of loss", fmt_date(matter.get("incident_date"))),
            ("Balance on file", fmt_money(balance) if balance else ""),
        ]
    )
    blocks.append(para("REQUEST FOR VERIFICATION OF OUTSTANDING BALANCE", bold=True, align="center"))
    blocks.append(spacer())
    blocks.append(para("To Whom It May Concern:"))
    blocks.append(spacer())
    blocks.append(
        para(
            f"This office represents {client_name or 'the above patient'} in a personal injury claim arising from the "
            f"incident of {fmt_date(matter.get('incident_date')) or '[date of loss]'}. As we prepare to disburse "
            "settlement proceeds, we must confirm the exact amount owed."
        )
    )
    blocks.append(spacer())
    blocks.append(
        para(
            f"Please provide written verification of the current outstanding balance owed by {client_name or 'the patient'} "
            f"as of the date of your response, together with an itemized statement of the charges. If your interest is a "
            f"lien or assignment, please confirm its current amount and enclose a copy of the lien or assignment."
        )
    )
    if ov.get("body_notes"):
        blocks.append(spacer())
        blocks.append(para(str(ov["body_notes"])))
    blocks.append(spacer())
    blocks.append(para("A prompt written response will allow us to disburse the correct amount without delay. Thank you."))
    blocks += closing_blocks(tokens)

    return {
        "letter_type": "lien_verification",
        "title": LETTER_LABELS["lien_verification"],
        "filename_stem": f"{matter.get('case_number') or matter.get('id')} Lien Verification — {provider}",
        "blocks": blocks,
        "warnings": warnings,
        "watermark": False,
        "recipient_kind": recipient_kind,
    }


# ──────────────── compose: disbursement ────────────────
def compose_disbursement_letter(
    *,
    tokens: dict[str, str],
    matter: dict,
    client: Optional[dict],
    scenario: dict,
    computed: dict,
    today_iso: str,
    overrides: Optional[dict] = None,
) -> dict:
    ov = overrides or {}
    warnings = _common_warnings(tokens, client)
    client_name = (client or {}).get("name") or ""
    fee_label = (
        f"Attorney fee (flat)"
        if scenario.get("attorney_fee_flat") is not None
        else f"Attorney fee ({scenario.get('attorney_fee_pct') or 0:g}%)"
    )

    blocks: list[dict] = []
    blocks += letterhead_blocks(tokens)
    blocks.append(para(fmt_date(today_iso)))
    blocks.append(spacer())
    blocks += recipient_blocks(ov.get("recipient_name") or client_name, ov.get("recipient_address") or (client or {}).get("address") or "")
    blocks += re_blocks(
        [
            ("Matter", matter.get("case_number") or matter.get("title") or ""),
            ("Date of loss", fmt_date(matter.get("incident_date"))),
            ("Scenario", scenario.get("name") or ""),
        ]
    )
    blocks.append(para("SETTLEMENT DISBURSEMENT STATEMENT", bold=True, align="center"))
    blocks.append(spacer())
    blocks.append(para(f"Dear {client_name or 'Client'}:"))
    blocks.append(spacer())
    blocks.append(
        para(
            "We are pleased to enclose your settlement disbursement statement. The figures below reflect the "
            "attorney-approved distribution of the settlement proceeds in your matter:"
        )
    )
    blocks.append(spacer())
    rows: list[list[Any]] = [
        [_cell("Gross settlement", bold=True), money_cell(computed.get("gross_settlement"), bold=True)],
        [fee_label, money_cell(computed.get("attorney_fee"))],
        ["Case expenses", money_cell(computed.get("expenses"))],
    ]
    for line in scenario.get("line_items") or []:
        payout = _line_reduced_amount(line)
        if payout <= 0:
            continue
        rows.append([f"Medical payout — {line.get('provider_name') or 'Provider'}", money_cell(payout)])
    if float(computed.get("medpay_to_client") or 0) > 0:
        rows.append(["MedPay reimbursement to client", money_cell(computed.get("medpay_to_client"))])
    rows.append([_cell("NET TO CLIENT", bold=True), money_cell(computed.get("net_to_client"), bold=True)])
    blocks.append(table(rows))
    blocks.append(spacer())
    blocks.append(
        para(
            "Please review the statement above. By signing below you acknowledge and approve this disbursement. "
            "Your net proceeds will issue from the firm trust account upon receipt of your signed approval."
        )
    )
    blocks.append(spacer())
    blocks.append(spacer())
    blocks.append(para("_________________________________            _______________"))
    blocks.append(para(f"{client_name or 'Client'}                                                        Date", size="small"))
    blocks += closing_blocks(tokens)

    return {
        "letter_type": "disbursement",
        "title": LETTER_LABELS["disbursement"],
        "filename_stem": f"{matter.get('case_number') or matter.get('id')} Disbursement Letter",
        "blocks": blocks,
        "warnings": warnings,
        "watermark": False,
    }


# ──────────────── DOCX renderer (zip/XML, no python-docx) ────────────────
_DOCX_CONTENT_TYPES = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    '<Default Extension="xml" ContentType="application/xml"/>'
    '<Override PartName="/word/document.xml" '
    'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
    "</Types>"
)

_DOCX_RELS = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    '<Relationship Id="rId1" '
    'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
    'Target="word/document.xml"/>'
    "</Relationships>"
)

_SIZE_HALF_POINTS = {"title": "32", "normal": "22", "small": "18"}
_ALIGN_VALS = {"left": "left", "center": "center", "right": "right"}


def _run_xml(text: str, *, bold: bool, size: str) -> str:
    props = f'<w:sz w:val="{_SIZE_HALF_POINTS.get(size, "22")}"/>'
    if bold:
        props = "<w:b/>" + props
    return f'<w:r><w:rPr>{props}</w:rPr><w:t xml:space="preserve">{_xml_escape(text)}</w:t></w:r>'


def _para_xml(text: str, *, bold: bool = False, align: str = "left", size: str = "normal") -> str:
    jc = f'<w:jc w:val="{_ALIGN_VALS.get(align, "left")}"/>'
    return f"<w:p><w:pPr>{jc}</w:pPr>{_run_xml(text, bold=bold, size=size)}</w:p>"


def _table_xml(rows: list[list[dict]]) -> str:
    n_cols = max(len(r) for r in rows) if rows else 1
    col_w = 9360 // n_cols
    grid = "".join(f'<w:gridCol w:w="{col_w}"/>' for _ in range(n_cols))
    border = '<w:top w:val="single" w:sz="4" w:color="999999"/><w:bottom w:val="single" w:sz="4" w:color="999999"/><w:start w:val="single" w:sz="4" w:color="999999"/><w:end w:val="single" w:sz="4" w:color="999999"/><w:insideH w:val="single" w:sz="4" w:color="999999"/><w:insideV w:val="single" w:sz="4" w:color="999999"/>'
    parts = [
        "<w:tbl><w:tblPr>",
        '<w:tblW w:w="9360" w:type="dxa"/>',
        f"<w:tblBorders>{border}</w:tblBorders>",
        "</w:tblPr>",
        f"<w:tblGrid>{grid}</w:tblGrid>",
    ]
    for row in rows:
        parts.append("<w:tr>")
        for i in range(n_cols):
            cell = row[i] if i < len(row) else {"text": "", "align": "left", "bold": False}
            parts.append(
                f'<w:tc><w:tcPr><w:tcW w:w="{col_w}" w:type="dxa"/></w:tcPr>'
                + _para_xml(cell.get("text", ""), bold=cell.get("bold", False), align=cell.get("align", "left"))
                + "</w:tc>"
            )
        parts.append("</w:tr>")
    parts.append("</w:tbl>")
    return "".join(parts)


def render_docx(blocks: list[dict]) -> bytes:
    body_parts: list[str] = []
    for block in blocks:
        kind = block.get("kind")
        if kind == "para":
            body_parts.append(_para_xml(block["text"], bold=block.get("bold", False), align=block.get("align", "left"), size=block.get("size", "normal")))
        elif kind == "heading":
            body_parts.append(_para_xml(block["text"], bold=True))
        elif kind == "spacer":
            body_parts.append("<w:p/>")
        elif kind == "table":
            body_parts.append(_table_xml(block["rows"]))
            body_parts.append("<w:p/>")
    document = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        "<w:body>"
        + "".join(body_parts)
        + '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>'
        '<w:pgMar w:top="1080" w:right="1440" w:bottom="1080" w:left="1440"/></w:sectPr>'
        "</w:body></w:document>"
    )
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", _DOCX_CONTENT_TYPES)
        z.writestr("_rels/.rels", _DOCX_RELS)
        z.writestr("word/document.xml", document)
    return buf.getvalue()


# ──────────────── PDF renderer (reportlab) ────────────────
_PDF_FONT_SIZES = {"title": 14, "normal": 10.5, "small": 8.5}
_PDF_WRAP = {"title": 70, "normal": 92, "small": 110}


def render_pdf(blocks: list[dict]) -> bytes:
    buf = io.BytesIO()
    w, h = LETTER_PAGE
    c = canvas.Canvas(buf, pagesize=LETTER_PAGE)
    margin = 1.0 * inch
    usable = w - 2 * margin
    y = h - margin

    def ensure_space(need: float):
        nonlocal y
        if y < margin + need:
            c.showPage()
            y = h - margin

    def draw_line(text: str, *, bold: bool, size: str, align: str):
        nonlocal y
        fs = _PDF_FONT_SIZES.get(size, 10.5)
        font = "Helvetica-Bold" if bold else "Helvetica"
        c.setFont(font, fs)
        ensure_space(fs + 6)
        if align == "center":
            c.drawCentredString(w / 2, y, text)
        elif align == "right":
            c.drawRightString(w - margin, y, text)
        else:
            c.drawString(margin, y, text)
        y -= fs + 4

    for block in blocks:
        kind = block.get("kind")
        if kind == "spacer":
            y -= 10
            continue
        if kind == "heading":
            y -= 4
            draw_line(block["text"], bold=True, size="normal", align="left")
            continue
        if kind == "para":
            size = block.get("size", "normal")
            for chunk in _wrap_text(block.get("text") or "", _PDF_WRAP.get(size, 92)):
                draw_line(chunk, bold=block.get("bold", False), size=size, align=block.get("align", "left"))
            continue
        if kind == "table":
            rows = block.get("rows") or []
            if not rows:
                continue
            n_cols = max(len(r) for r in rows)
            col_w = usable / n_cols
            for row in rows:
                ensure_space(18)
                c.setLineWidth(0.3)
                for i in range(n_cols):
                    cell = row[i] if i < len(row) else {"text": ""}
                    font = "Helvetica-Bold" if cell.get("bold") else "Helvetica"
                    c.setFont(font, 9.5)
                    text = str(cell.get("text") or "")[:60]
                    x0 = margin + i * col_w
                    if cell.get("align") == "right":
                        c.drawRightString(x0 + col_w - 4, y, text)
                    else:
                        c.drawString(x0 + 2, y, text)
                y -= 6
                c.line(margin, y, w - margin, y)
                y -= 10
            y -= 4
    c.save()
    return buf.getvalue()


# ──────────────── request models ────────────────
LETTER_TYPE_IDS = tuple(row["id"] for row in LETTER_TYPES)


class LetterGenerateIn(BaseModel):
    letter_type: Literal["demand", "medpay", "lor", "drop", "lien_verification", "reduction_request", "disbursement"]
    format: Literal["docx", "pdf"] = "docx"
    include_bills: bool = False
    side: Optional[Literal["third_party", "first_party"]] = None
    recipient_name: Optional[str] = Field(None, max_length=300)
    recipient_address: Optional[str] = Field(None, max_length=1000)
    attention: Optional[str] = Field(None, max_length=200)
    insured_name: Optional[str] = Field(None, max_length=300)
    scenario_id: Optional[str] = None
    line_item_id: Optional[str] = None
    ledger_row_ids: Optional[list[str]] = None
    demand_amount: Optional[float] = Field(None, ge=0)
    body_notes: Optional[str] = Field(None, max_length=8000)


class LetterAiDraftIn(BaseModel):
    letter_type: Literal["demand", "medpay", "lor", "drop", "lien_verification", "reduction_request", "disbursement"] = "demand"
    instructions: Optional[str] = Field(None, max_length=2000)


def _assert_pi_matter(matter: Optional[dict]):
    if not matter:
        raise HTTPException(404, "Matter not found")
    if matter.get("practice_area") != "personal_injury":
        raise HTTPException(400, "Letter generation applies to personal injury matters only")


def _require_letter_permission(user: dict, letter_type: str):
    perm = LETTER_PERMISSIONS.get(letter_type)
    if not perm or not role_has_permission(user.get("role", "staff"), perm):
        raise HTTPException(403, f"Role '{user.get('role')}' cannot generate {letter_type} letters")


# ──────────────── routes ────────────────
def register_pi_letter_routes(
    api,
    db,
    get_current_user: Callable,
    new_id: Callable,
    now_iso: Callable,
    *,
    merge_pi_demand: Callable,
    merge_pi_settlement: Callable,
    merge_pi_insurance: Callable,
    merge_ledger_row: Callable,
    get_firm_for_user: Callable,
    compute_demand_validation: Callable,
    compute_scenario_totals: Callable,
    summarize_expenses: Optional[Callable] = None,
    stream_ai_reply: Optional[Callable] = None,
):
    async def _load_matter(matter_id: str, firm_id: str) -> dict:
        m = await db.matters.find_one({"id": matter_id, "firm_id": firm_id}, {"_id": 0})
        _assert_pi_matter(m)
        return m

    async def _load_client(matter: dict, firm_id: str) -> Optional[dict]:
        client_id = matter.get("client_id") or matter.get("client_contact_id")
        if not client_id:
            return None
        return await db.contacts.find_one({"id": client_id, "firm_id": firm_id}, {"_id": 0})

    async def _load_ledger(matter_id: str, firm_id: str) -> list[dict]:
        rows = await db.med_ledger.find(
            {"firm_id": firm_id, "matter_id": matter_id}, {"_id": 0}
        ).sort("created_at", 1).to_list(500)
        return [merge_ledger_row(r) for r in rows]

    def _demand_validation(demand: dict, ledger_rows: list[dict]) -> dict:
        return compute_demand_validation(
            exhibits=demand.get("exhibits") or [],
            ledger_rows=ledger_rows,
            expense_summary=None,
            economic=demand.get("economic_damages"),
        )

    async def _load_bill_documents(matter_id: str, firm_id: str, *, with_data: bool = False) -> list[dict]:
        projection = {"_id": 0, "id": 1, "name": 1, "content_type": 1, "taxonomy": 1}
        if with_data:
            projection["data_b64"] = 1
        return await db.documents.find(
            {"firm_id": firm_id, "matter_id": matter_id, "taxonomy.doc_type": "medical", "taxonomy.medical_code": "B"},
            projection,
        ).to_list(200)

    async def _resolve_provider_address(firm_id: str, *, provider_id: Optional[str], provider_name: str) -> Optional[dict]:
        provider = None
        if provider_id:
            provider = await db.providers.find_one({"id": provider_id, "firm_id": firm_id}, {"_id": 0})
        if not provider and provider_name.strip():
            provider = await db.providers.find_one(
                {"firm_id": firm_id, "name": {"$regex": f"^{re.escape(provider_name.strip())}$", "$options": "i"}},
                {"_id": 0},
            )
        return provider

    async def _autofill_recipient_address(overrides: dict, firm_id: str, *, provider_id: Optional[str], provider_name: str, warnings_sink: list[str]):
        """Fill recipient_address from the provider directory when not supplied."""
        if overrides.get("recipient_address") or not provider_name:
            return
        provider = await _resolve_provider_address(firm_id, provider_id=provider_id, provider_name=provider_name)
        if provider and provider.get("address"):
            overrides["recipient_address"] = provider["address"]
            if provider.get("fax") and not overrides.get("attention"):
                overrides["recipient_address"] += f"\nFax: {provider['fax']}"
        else:
            warnings_sink.append(
                f"No address on file for {provider_name} — add it in the provider directory or type it manually"
            )

    async def _attach_bill_pdfs(
        letter_pdf: bytes,
        *,
        matter_id: str,
        firm_id: str,
        providers_wanted: list[dict],
        explicit_document_ids: list[str],
    ) -> tuple[bytes, list[str], list[str], list[str]]:
        """Append matching bill PDFs to the letter. providers_wanted: [{provider_name}]."""
        bill_docs = await _load_bill_documents(matter_id, firm_id, with_data=True)
        by_id = {d["id"]: d for d in bill_docs}
        attached: list[str] = []
        missing: list[str] = []
        warnings: list[str] = []
        chosen: list[dict] = []
        seen: set[str] = set()

        for doc_id in explicit_document_ids:
            doc = by_id.get(doc_id) or await db.documents.find_one(
                {"id": doc_id, "firm_id": firm_id, "matter_id": matter_id},
                {"_id": 0, "id": 1, "name": 1, "content_type": 1, "data_b64": 1},
            )
            if doc and doc["id"] not in seen:
                chosen.append(doc)
                seen.add(doc["id"])

        for row in providers_wanted:
            name = row.get("provider_name") or ""
            matches = [d for d in match_bill_documents(bill_docs, name) if d["id"] not in seen]
            if not matches and not any(
                _provider_names_match((by_id.get(i, {}).get("taxonomy") or {}).get("provider_label") or "", name)
                for i in seen
            ):
                missing.append(name)
            for d in matches:
                chosen.append(d)
                seen.add(d["id"])

        merged = letter_pdf
        for doc in chosen:
            if not is_pdf(doc.get("content_type"), doc.get("name") or ""):
                warnings.append(f"Bill '{doc.get('name')}' is not a PDF — attach it manually")
                continue
            try:
                merged = append_pdf_pages(merged, base64.b64decode(doc["data_b64"]))
                attached.append(doc.get("name") or doc["id"])
            except Exception:
                warnings.append(f"Could not merge bill '{doc.get('name')}' — file may be corrupt")
        return merged, attached, missing, warnings

    def _find_scenario(settlement: dict, scenario_id: Optional[str]) -> dict:
        scenarios = settlement.get("scenarios") or []
        if not scenarios:
            raise HTTPException(400, "No settlement scenarios yet — create one on the Settlement tab")
        sid = scenario_id or settlement.get("active_scenario_id")
        scenario = next((s for s in scenarios if s.get("id") == sid), None) if sid else scenarios[0]
        if not scenario:
            raise HTTPException(404, "Scenario not found")
        return scenario

    @api.get("/matters/{matter_id}/letters")
    async def list_matter_letters(matter_id: str, user=Depends(get_current_user)):
        m = await _load_matter(matter_id, user["firm_id"])
        demand = merge_pi_demand(m.get("pi_demand"))
        settlement = merge_pi_settlement(m.get("pi_settlement"))
        insurance = merge_pi_insurance(m.get("pi_insurance"))
        client = await _load_client(m, user["firm_id"])
        firm = await get_firm_for_user(user)
        tokens = firm_tokens_raw(firm, user)
        scenarios = settlement.get("scenarios") or []
        has_reduction = any(
            (li.get("reduction_type") or "none") != "none"
            for s in scenarios
            for li in (s.get("line_items") or [])
        )
        has_approved_scenario = any(s.get("attorney_approved") for s in scenarios)

        ledger_rows = await _load_ledger(matter_id, user["firm_id"])
        bill_rows = [r for r in ledger_rows if float(r.get("balance") or 0) > 0]
        bill_docs = await _load_bill_documents(matter_id, user["firm_id"])
        medpay_bills = [
            {
                "id": r.get("id"),
                "provider_name": r.get("provider_name") or "",
                "specialty": r.get("specialty") or "other",
                "balance": round(float(r.get("balance") or 0), 2),
                "has_bill_pdf": any(
                    is_pdf(d.get("content_type"), d.get("name") or "")
                    for d in match_bill_documents(bill_docs, r.get("provider_name") or "")
                ),
            }
            for r in bill_rows
        ]

        catalog = []
        for row in LETTER_TYPES:
            blockers: list[str] = []
            if row["id"] == "disbursement" and not has_approved_scenario:
                blockers.append("Requires an attorney-approved settlement scenario")
            if row["id"] == "reduction_request" and not has_reduction:
                blockers.append("Attorney must set a reduction on a provider line first")
            catalog.append(
                {
                    **row,
                    "permission_ok": role_has_permission(user.get("role", "staff"), row["permission"]),
                    "blockers": blockers,
                    "draft_watermark": row["id"] in ("demand", "medpay") and demand.get("status") not in ("approved", "sent"),
                    "missing_fields": compute_letter_missing_fields(
                        row["id"], tokens=tokens, matter=m, client=client, demand=demand,
                        insurance=insurance, scenarios=scenarios, bill_rows=bill_rows,
                    ),
                }
            )

        recent = await db.documents.find(
            {"firm_id": user["firm_id"], "matter_id": matter_id, "letter.letter_type": {"$exists": True}},
            {"_id": 0, "data_b64": 0, "extracted_text": 0},
        ).sort("uploaded_at", -1).to_list(25)
        # A letter is signable via NativeSign only when it's a filed PDF (signature
        # merge needs a PDF) and hasn't already produced a signed copy.
        for doc in recent:
            doc["signable"] = (doc.get("letter") or {}).get("format") == "pdf"
        client_signer = {
            "id": (client or {}).get("id"),
            "name": (client or {}).get("name"),
            "email": (client or {}).get("email"),
        } if client else None
        return {
            "matter_id": matter_id,
            "letters": catalog,
            "recent": recent,
            "demand_status": demand.get("status"),
            "medpay_bills": medpay_bills,
            "client": client_signer,
        }

    @api.post("/matters/{matter_id}/letters/generate")
    async def generate_matter_letter(matter_id: str, body: LetterGenerateIn, user=Depends(get_current_user)):
        _require_letter_permission(user, body.letter_type)
        require_disclosure_ack(user)
        m = await _load_matter(matter_id, user["firm_id"])
        client = await _load_client(m, user["firm_id"])
        firm = await get_firm_for_user(user)
        tokens = firm_tokens_raw(firm, user)
        today = now_iso()
        overrides = body.model_dump(exclude_none=True)
        autofill_warnings: list[str] = []
        bills_wanted: list[dict] = []

        if body.letter_type == "demand":
            demand = merge_pi_demand(m.get("pi_demand"))
            insurance = merge_pi_insurance(m.get("pi_insurance"))
            ledger_rows = await _load_ledger(matter_id, user["firm_id"])
            composed = compose_demand_letter(
                tokens=tokens, matter=m, client=client, demand=demand, insurance=insurance,
                validation=_demand_validation(demand, ledger_rows), today_iso=today, overrides=overrides,
            )
            bills_wanted = [
                {"provider_name": e.get("provider_name") or "", "document_id": e.get("document_id")}
                for e in (demand.get("exhibits") or [])
                if e.get("included")
            ]
        elif body.letter_type == "medpay":
            demand = merge_pi_demand(m.get("pi_demand"))
            insurance = merge_pi_insurance(m.get("pi_insurance"))
            ledger_rows = await _load_ledger(matter_id, user["firm_id"])
            composed = compose_medpay_letter(
                tokens=tokens, matter=m, client=client, demand=demand, insurance=insurance,
                ledger_rows=ledger_rows, today_iso=today, overrides=overrides,
            )
            selected = set(body.ledger_row_ids or [])
            bills_wanted = [
                {"provider_name": r.get("provider_name") or "", "document_id": None}
                for r in ledger_rows
                if float(r.get("balance") or 0) > 0 and (not selected or r.get("id") in selected)
            ]
        elif body.letter_type == "lor":
            insurance = merge_pi_insurance(m.get("pi_insurance"))
            composed = compose_lor_letter(
                tokens=tokens, matter=m, client=client, insurance=insurance,
                side_key=body.side or "third_party", today_iso=today, overrides=overrides,
            )
        elif body.letter_type == "drop":
            if body.recipient_name:
                await _autofill_recipient_address(
                    overrides, user["firm_id"], provider_id=None,
                    provider_name=body.recipient_name, warnings_sink=autofill_warnings,
                )
            composed = compose_drop_letter(tokens=tokens, matter=m, client=client, today_iso=today, overrides=overrides)
        elif body.letter_type == "lien_verification":
            settlement = merge_pi_settlement(m.get("pi_settlement"))
            scenario = _find_scenario(settlement, body.scenario_id)
            lines = scenario.get("line_items") or []
            line = next((li for li in lines if li.get("id") == body.line_item_id), None) if body.line_item_id else None
            if body.line_item_id and not line:
                raise HTTPException(404, "Scenario line item not found")
            if not line:
                raise HTTPException(400, "line_item_id required — pick the provider / lien line to verify")
            ledger_row = None
            if line.get("ledger_row_id"):
                ledger_row = await db.med_ledger.find_one(
                    {"id": line["ledger_row_id"], "firm_id": user["firm_id"]},
                    {"_id": 0, "provider_id": 1, "lien_holder": 1},
                )
            enriched_line = {**line, "lien_holder": (ledger_row or {}).get("lien_holder") or line.get("lien_holder")}
            await _autofill_recipient_address(
                overrides, user["firm_id"],
                provider_id=(ledger_row or {}).get("provider_id"),
                provider_name=enriched_line.get("lien_holder") or line.get("provider_name") or "",
                warnings_sink=autofill_warnings,
            )
            composed = compose_lien_verification_letter(
                tokens=tokens, matter=m, client=client, line=enriched_line, today_iso=today, overrides=overrides,
            )
        elif body.letter_type == "reduction_request":
            settlement = merge_pi_settlement(m.get("pi_settlement"))
            scenario = _find_scenario(settlement, body.scenario_id)
            lines = scenario.get("line_items") or []
            line = next((li for li in lines if li.get("id") == body.line_item_id), None) if body.line_item_id else None
            if body.line_item_id and not line:
                raise HTTPException(404, "Scenario line item not found")
            if not line:
                raise HTTPException(400, "line_item_id required — pick the provider line to reduce")
            if (line.get("reduction_type") or "none") == "none":
                raise HTTPException(400, "Attorney must set the reduction on this provider line before generating the letter")
            ledger_row = None
            if line.get("ledger_row_id"):
                ledger_row = await db.med_ledger.find_one(
                    {"id": line["ledger_row_id"], "firm_id": user["firm_id"]}, {"_id": 0, "provider_id": 1}
                )
            await _autofill_recipient_address(
                overrides, user["firm_id"],
                provider_id=(ledger_row or {}).get("provider_id"),
                provider_name=line.get("provider_name") or "",
                warnings_sink=autofill_warnings,
            )
            composed = compose_reduction_letter(
                tokens=tokens, matter=m, client=client, line=line, today_iso=today, overrides=overrides,
            )
        elif body.letter_type == "disbursement":
            settlement = merge_pi_settlement(m.get("pi_settlement"))
            scenario = _find_scenario(settlement, body.scenario_id)
            if not scenario.get("attorney_approved"):
                raise HTTPException(403, "Disbursement letter requires an attorney-approved scenario — approve it on the Settlement tab first")
            computed = compute_scenario_totals(
                scenario, default_fee_pct=float(settlement.get("default_attorney_fee_pct") or 33.333)
            )
            composed = compose_disbursement_letter(
                tokens=tokens, matter=m, client=client, scenario=scenario, computed=computed,
                today_iso=today, overrides=overrides,
            )
        else:  # pragma: no cover — Literal already guards
            raise HTTPException(400, "Unknown letter type")

        composed["warnings"] = (composed.get("warnings") or []) + autofill_warnings
        attached_bills: list[str] = []
        missing_bill_providers: list[str] = []
        if body.format == "pdf":
            data = render_pdf(composed["blocks"])
            content_type = PDF_MIME
            ext = "pdf"
            if body.include_bills and body.letter_type in ("demand", "medpay"):
                explicit_ids = [b["document_id"] for b in bills_wanted if b.get("document_id")]
                data, attached_bills, missing_bill_providers, attach_warnings = await _attach_bill_pdfs(
                    data,
                    matter_id=matter_id,
                    firm_id=user["firm_id"],
                    providers_wanted=bills_wanted,
                    explicit_document_ids=explicit_ids,
                )
                composed["warnings"] += attach_warnings
        else:
            data = render_docx(composed["blocks"])
            content_type = DOCX_MIME
            ext = "docx"
            if body.include_bills:
                composed["warnings"].append("Bill attachment applies to PDF format — DOCX generated without bills")

        stem = composed["filename_stem"]
        if composed.get("watermark"):
            stem += " (DRAFT)"
        name = f"{stem}.{ext}"
        ts = now_iso()
        doc = {
            "id": new_id(),
            "firm_id": user["firm_id"],
            "matter_id": matter_id,
            "name": name,
            "folder": "Letters",
            "content_type": content_type,
            "size_bytes": len(data),
            "data_b64": base64.b64encode(data).decode(),
            "uploaded_by": user["id"],
            "uploaded_by_name": user.get("name"),
            "uploaded_at": ts,
            "version": 1,
            "client_visible": False,
            "extracted_text": None,
            "page_count": page_count(data) if ext == "pdf" else None,
            "taxonomy": None,
            "letter": {
                "letter_type": body.letter_type,
                "format": ext,
                "watermark": bool(composed.get("watermark")),
                "generated_by": user["id"],
                "generated_by_name": user.get("name"),
                "generated_at": ts,
                "warnings": composed.get("warnings") or [],
                "attached_bills": attached_bills,
            },
        }
        await db.documents.insert_one(doc)
        await db.activities.insert_one(
            {
                "id": new_id(),
                "firm_id": user["firm_id"],
                "matter_id": matter_id,
                "actor_id": user["id"],
                "actor_name": user.get("name"),
                "type": "letter_generated",
                "description": f"Generated {composed['title']} ({ext.upper()}){' — DRAFT watermark' if composed.get('watermark') else ''}",
                "created_at": ts,
            }
        )
        return {
            "document_id": doc["id"],
            "name": name,
            "content_type": content_type,
            "format": ext,
            "letter_type": body.letter_type,
            "watermark": bool(composed.get("watermark")),
            "warnings": composed.get("warnings") or [],
            "attached_bills": attached_bills,
            "missing_bill_providers": missing_bill_providers,
        }

    @api.post("/matters/{matter_id}/letters/ai-draft")
    async def ai_draft_letter_narrative(matter_id: str, body: LetterAiDraftIn, user=Depends(get_current_user)):
        _require_letter_permission(user, body.letter_type)
        if not stream_ai_reply:
            raise HTTPException(501, "AI drafting not configured")
        m = await _load_matter(matter_id, user["firm_id"])
        client = await _load_client(m, user["firm_id"])
        demand = merge_pi_demand(m.get("pi_demand"))
        ledger_rows = await _load_ledger(matter_id, user["firm_id"])
        validation = _demand_validation(demand, ledger_rows)

        context = {
            "client": (client or {}).get("name"),
            "date_of_loss": m.get("incident_date"),
            "facts": m.get("description"),
            "medical_specials": validation.get("exhibit_specials"),
            "economic_damages": validation.get("economic_damages_total"),
            "providers": [
                {"name": r.get("provider_name"), "specialty": r.get("specialty"), "balance": r.get("balance")}
                for r in ledger_rows
            ][:40],
            "general_damages_notes": demand.get("general_damages_notes"),
        }
        system = (
            "You are a personal-injury paralegal drafting the injuries-and-treatment narrative section of a "
            f"{LETTER_LABELS.get(body.letter_type, 'demand letter')}. Write 2-4 professional paragraphs in plain "
            "prose (no headings, no placeholders, no salutations). Use only the facts provided — never invent "
            "diagnoses, dates, or amounts. This is a draft for attorney review."
        )
        message = f"Matter context:\n{context}\n"
        if body.instructions:
            message += f"\nStaff instructions: {body.instructions}"

        collected = ""
        async for chunk in stream_ai_reply(db, system=system, message=message, max_tokens=1500):
            collected += chunk
        if collected.strip().startswith("[Error:"):
            raise HTTPException(400, collected.strip().strip("[]"))
        return {"draft": collected.strip(), "letter_type": body.letter_type}
