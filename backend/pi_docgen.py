"""
PI Case OS — matter-aware DocGen (Matter-aware DocGen gap).

Extends the firm-only {{FIRM_*}} merge in training_templates.py to also fill
the {{CLIENT/MATTER/INSURANCE/MEDICAL}}-shaped placeholders already present
in the 106 white-label DOCX templates (a legacy dotted merge-field vocabulary
— e.g. {{fullname}}, {{intake.incidentDate}}, {{insurance2.insurer.name}},
{{clientBirthdate | longDate}}). Values are sourced from the SAME field graph
pi_ai_intake.py uses (`build_current_shape`), supplemented only with matter/
insurance/property-damage fields that graph doesn't cover (adjuster fax,
pd_adjuster, policy limits, vehicle year/make/model, SOL date, ledger sums,
an attorney-approved settlement figure).

Never invents: a token only gets a value when it is read (or trivially
derived — a name/address structural split, a date format, a sum of existing
ledger rows) from data already on file. Anything else is left as a
"[NEEDS REVIEW: ...]" marker in the DOCX and reported in a `needs_review`
list for staff to complete by hand — mirrors pi_ai_intake.py's "null for
absent, never guess" rule.

Output is always a watermarked DRAFT filed as a matter document (same
watermark/gate pattern as pi_letters.py) — nothing here is ever sent
automatically; an attorney must review before use, per DISCLOSURE.md.
"""
from __future__ import annotations

import base64
import io
import re
import zipfile
from pathlib import Path
from typing import Any, Callable, Literal, Optional
from xml.sax.saxutils import escape as _xml_escape

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field

from disclosure import require_disclosure_ack
from pi_ai_intake import build_current_shape
from pi_letters import fmt_date, firm_tokens_raw
from rbac import role_has_permission
from training_templates import TEMPLATES_DOCX, _safe_filename  # reuse the same path-traversal guard

DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

_PLACEHOLDER_RE = re.compile(r"\{\{\s*([^{}]+?)\s*\}\}")


def _parse_placeholder(inner: str) -> tuple[str, Optional[str]]:
    """'clientBirthdate | longDate' -> ('clientBirthdate', 'longDate')."""
    parts = inner.split("|", 1)
    base = parts[0].strip()
    filt = parts[1].strip() if len(parts) > 1 else None
    return base, (filt or None)


# ──────────────── structural (never-guess) name/address splits ────────────────
_NAME_SUFFIXES = {"jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v"}


def _split_name(full_name: Optional[str]) -> tuple[Optional[str], Optional[str]]:
    """Pure structural split of an ALREADY-KNOWN full name — never invents a
    name, just re-arranges the one on file. Best-effort only (suffixes,
    multi-word given names); callers should treat the split as informational."""
    if not full_name or not full_name.strip():
        return None, None
    parts = full_name.strip().split()
    if len(parts) == 1:
        return parts[0], None
    if len(parts) > 2 and parts[-1].strip(".").lower() in _NAME_SUFFIXES:
        return " ".join(parts[:-2]), " ".join(parts[-2:])
    return " ".join(parts[:-1]), parts[-1]


_ADDR_TAIL_RE = re.compile(r"^(?P<city>[A-Za-z .'-]+),\s*(?P<state>[A-Z]{2})\s+(?P<zip>\d{5}(?:-\d{4})?)$")


def _split_address(raw: Optional[str]) -> dict[str, Optional[str]]:
    """Best-effort structural split of a free-text mailing address into
    line1/line2/city/state/zip. Recognizes the standard 'City, ST ZIP' tail;
    returns all-None (never a guess) when the format isn't recognized —
    callers must leave those blank + flag needs_review rather than invent."""
    empty = {"line1": None, "line2": None, "city": None, "state": None, "zip": None}
    if not raw or not raw.strip():
        return empty
    lines = [ln.strip() for ln in raw.replace("\r", "").split("\n") if ln.strip()]
    if not lines:
        return empty
    m = _ADDR_TAIL_RE.match(lines[-1])
    if m and len(lines) >= 2:
        street = lines[:-1]
        return {
            "line1": street[0],
            "line2": " ".join(street[1:]) or None,
            "city": m.group("city").strip(),
            "state": m.group("state"),
            "zip": m.group("zip"),
        }
    # single-line "Street, City, ST ZIP"
    segments = [s.strip() for s in raw.split(",") if s.strip()]
    if len(segments) >= 3:
        m2 = _ADDR_TAIL_RE.match(f"{segments[-2]}, {segments[-1]}")
        if m2:
            return {
                "line1": ", ".join(segments[:-2]) or None,
                "line2": None,
                "city": m2.group("city").strip(),
                "state": m2.group("state"),
                "zip": m2.group("zip"),
            }
    return empty


def _money(value: Optional[float]) -> Optional[str]:
    if value is None:
        return None
    try:
        return f"${float(value):,.2f}"
    except (TypeError, ValueError):
        return None


def _lastfirst(full_name: Optional[str]) -> Optional[str]:
    first, last = _split_name(full_name)
    if not last:
        return full_name
    return f"{last}, {first}" if first else last


def _infer_default_side(filename: str) -> Optional[Literal["third_party", "first_party"]]:
    """Most of the 106 filenames self-identify as 1P or 3P (e.g. '(WA) 1P LOR.docx')."""
    name = filename.upper()
    if re.search(r"\b1P\b", name):
        return "first_party"
    if re.search(r"\b3P\b", name):
        return "third_party"
    return None


# ──────────────── build the facts dict (the only source of truth for values) ────────────────
def build_matter_docgen_facts(
    *,
    matter: dict,
    client: Optional[dict],
    insurance: dict,
    property_damage: dict,
    firm_tokens: dict[str, str],
    side: Optional[str],
    provider: Optional[dict],
    ledger_sum: Optional[float],
    settlement_amount: Optional[float],
    today_iso: str,
) -> dict[str, Optional[str]]:
    # Reuse the SAME field graph pi_ai_intake.py's AI fill uses — do not
    # reinvent contact/matter/insurance extraction.
    shape = build_current_shape(matter, client, insurance)
    contact = shape["contact"]
    matter_s = shape["matter"]
    ins_shape = shape["insurance"]

    facts: dict[str, Optional[str]] = dict(firm_tokens)  # FIRM_* pass-through (already-merged behavior)

    facts["TODAY"] = fmt_date(today_iso)
    facts["TODAY_LONG"] = fmt_date(today_iso)

    # ── client ──
    facts["client_full_name"] = contact.get("name")
    first, last = _split_name(contact.get("name"))
    facts["client_first_name"] = first
    facts["client_last_name"] = last
    facts["client_email"] = contact.get("email")
    facts["client_phone"] = contact.get("phone")
    facts["client_dob"] = fmt_date(contact.get("date_of_birth")) if contact.get("date_of_birth") else None
    addr = _split_address(contact.get("address"))
    facts["client_addr_line1"] = addr["line1"]
    facts["client_addr_line2"] = addr["line2"]
    facts["client_addr_city"] = addr["city"]
    facts["client_addr_state"] = addr["state"]
    facts["client_addr_zip"] = addr["zip"]

    # ── matter ──
    facts["incident_date"] = fmt_date(matter_s.get("incident_date")) if matter_s.get("incident_date") else None
    facts["intake_date"] = fmt_date(matter.get("created_at")) if matter.get("created_at") else None
    facts["sol_due"] = fmt_date(matter.get("sol_date")) if matter.get("sol_date") else None

    # ── insurance: the requested side (3P vs 1P — inferred from filename or
    # an explicit override; ambiguous when neither resolves) ──
    if side in ("third_party", "first_party"):
        s_shape = ins_shape.get(side) or {}
        s_raw = insurance.get(side) or {}
        adjuster_raw = s_raw.get("adjuster") or {}
        adjuster_name = s_shape.get("adjuster", {}).get("name") if s_shape.get("adjuster") else None
        facts["side_carrier_name"] = s_shape.get("carrier_name")
        facts["side_claim_number"] = s_shape.get("claim_number")
        facts["side_policy_number"] = s_shape.get("policy_number")
        facts["side_adjuster_name"] = adjuster_name
        _, adj_last = _split_name(adjuster_name)
        facts["side_adjuster_last_name"] = adj_last
        facts["side_adjuster_fax"] = adjuster_raw.get("fax") or None
        facts["side_adjuster_email"] = (s_shape.get("adjuster") or {}).get("email")
        adj_addr = _split_address((s_shape.get("adjuster") or {}).get("mailing_address"))
        facts["side_adjuster_addr_line1"] = adj_addr["line1"]
        facts["side_adjuster_addr_line2"] = adj_addr["line2"]
        facts["side_adjuster_addr_city"] = adj_addr["city"]
        facts["side_adjuster_addr_state"] = adj_addr["state"]
        facts["side_adjuster_addr_zip"] = adj_addr["zip"]
        facts["side_claim_received"] = fmt_date(s_raw.get("opened_date")) if s_raw.get("opened_date") else None

    # ── MedPay / UM-UIM are modeled as first-party in this app (see
    # pi_letters.compose_medpay_letter) regardless of the inferred `side` ──
    fp_raw = insurance.get("first_party") or {}
    fp_adjuster = fp_raw.get("adjuster") or {}
    facts["fp_adjuster_name"] = fp_adjuster.get("name") or None
    _, fp_last = _split_name(fp_adjuster.get("name"))
    facts["fp_adjuster_last_name"] = fp_last
    facts["fp_adjuster_fax"] = fp_adjuster.get("fax") or None
    facts["fp_adjuster_email"] = fp_adjuster.get("email") or None
    fp_adj_addr = _split_address(fp_adjuster.get("mailing_address"))
    facts["fp_adjuster_addr_line1"] = fp_adj_addr["line1"]
    facts["fp_adjuster_addr_line2"] = fp_adj_addr["line2"]
    facts["fp_adjuster_addr_city"] = fp_adj_addr["city"]
    facts["fp_adjuster_addr_state"] = fp_adj_addr["state"]
    facts["fp_adjuster_addr_zip"] = fp_adj_addr["zip"]

    # ── 3P property-damage adjuster has its own field on the claim side —
    # always third-party regardless of `side`, per the token's own name ──
    tp_raw = insurance.get("third_party") or {}
    tp_pd_adjuster = tp_raw.get("pd_adjuster") or {}
    facts["tp_pd_adjuster_name"] = tp_pd_adjuster.get("name") or None
    _, tp_pd_last = _split_name(tp_pd_adjuster.get("name"))
    facts["tp_pd_adjuster_last_name"] = tp_pd_last
    facts["tp_pd_adjuster_fax"] = tp_pd_adjuster.get("fax") or None
    facts["tp_pd_adjuster_email"] = tp_pd_adjuster.get("email") or None
    tp_pd_addr = _split_address(tp_pd_adjuster.get("mailing_address"))
    facts["tp_pd_adjuster_addr_line1"] = tp_pd_addr["line1"]
    facts["tp_pd_adjuster_addr_line2"] = tp_pd_addr["line2"]
    facts["tp_pd_adjuster_addr_city"] = tp_pd_addr["city"]
    facts["tp_pd_adjuster_addr_state"] = tp_pd_addr["state"]
    facts["tp_pd_adjuster_addr_zip"] = tp_pd_addr["zip"]
    facts["tp_policy_limits_display"] = (tp_raw.get("limits") or {}).get("display") or None

    # ── plaintiff (client's own) vehicle — property damage module ──
    vehicle = property_damage.get("vehicle") or {}
    facts["plaintiff_vehicle_year"] = vehicle.get("year") or None
    facts["plaintiff_vehicle_make"] = vehicle.get("make") or None
    facts["plaintiff_vehicle_model"] = vehicle.get("model") or None

    # ── medical provider (only when a specific provider was selected —
    # a matter can have many; never guess which one a template means) ──
    if provider:
        facts["provider_name"] = provider.get("name") or None
        facts["provider_fax"] = provider.get("fax") or None
        prov_addr = _split_address(provider.get("address"))
        facts["provider_addr_line1"] = prov_addr["line1"]
        facts["provider_addr_line2"] = prov_addr["line2"]
        facts["provider_addr_city"] = prov_addr["city"]
        facts["provider_addr_state"] = prov_addr["state"]
        facts["provider_addr_zip"] = prov_addr["zip"]

    # ── ledger / settlement — deterministic sums/reads of EXISTING records,
    # never a fabricated figure (mirrors compose_medpay_letter's total) ──
    facts["ledger_balance_sum"] = _money(ledger_sum) if ledger_sum else None
    facts["settlement_amount"] = _money(settlement_amount) if settlement_amount else None

    # ── case manager, for the one obscure "Case Manager's email" token —
    # no per-staff email is tracked, so fall back to the firm matter email ──
    facts["case_manager_email"] = firm_tokens.get("FIRM_EMAIL") or None

    return facts


# ──────────────── token catalog: docx placeholder -> (facts key, label) ────────────────
# facts key of None means "not modeled anywhere — always needs_review".
TOKEN_MAP: dict[str, tuple[Optional[str], str]] = {
    # firm (already covered by training_templates' firm-only merge; kept here
    # too so a single pass handles the whole document)
    "FIRM_NAME": ("FIRM_NAME", "Firm name"),
    "FIRM_DBA": ("FIRM_DBA", "Firm DBA"),
    "ATTORNEY_NAME": ("ATTORNEY_NAME", "Attorney name"),
    "ATTORNEY_BAR": ("ATTORNEY_BAR", "Attorney bar number"),
    "CASE_MANAGER": ("CASE_MANAGER", "Case manager"),
    "FIRM_ADDRESS": ("FIRM_ADDRESS", "Firm address"),
    "FIRM_PHONE": ("FIRM_PHONE", "Firm phone"),
    "FIRM_FAX": ("FIRM_FAX", "Firm fax"),
    "FIRM_EMAIL": ("FIRM_EMAIL", "Firm email"),
    "TRUST_ACCOUNT": ("TRUST_ACCOUNT", "Trust account language"),
    "FEE_CONTINGENT": ("FEE_CONTINGENT", "Contingent fee %"),
    "JURISDICTION": ("JURISDICTION", "Jurisdiction"),
    "SOL_YEARS": ("SOL_YEARS", "Statute of limitations (years)"),
    "FIRM_CITY_STATE_ZIP": (None, "Firm city/state/zip (white-label profile stores one address string — add city/state/zip as separate settings to fill this)"),

    # system
    "TODAY": ("TODAY", "Today's date"),
    "TODAY_LONG": ("TODAY_LONG", "Today's date"),

    # client
    "fullname": ("client_full_name", "Client full name"),
    "name": ("client_full_name", "Client name"),
    "client.lastname": ("client_last_name", "Client last name"),
    "lastname": ("client_last_name", "Client last name"),
    "firstname": ("client_first_name", "Client first name"),
    "client.salutation": (None, "Client salutation (Mr./Ms.) — not tracked, add manually"),
    "clientEmail1": ("client_email", "Client email"),
    "clientPhone1": ("client_phone", "Client phone"),
    "clientHome1": (None, "Client home phone — only one phone number is tracked per client; add manually"),
    "clientMobile1": (None, "Client mobile phone — only one phone number is tracked per client; add manually"),
    "clientBirthdate": ("client_dob", "Client date of birth"),
    "ssn": (None, "Client SSN — not collected/stored by this system; add manually"),
    "clientAddress1Line1": ("client_addr_line1", "Client address — line 1"),
    "clientAddress1Line2": ("client_addr_line2", "Client address — line 2"),
    "clientAddress1City": ("client_addr_city", "Client address — city"),
    "clientAddress1State": ("client_addr_state", "Client address — state"),
    "clientAddress1Zip": ("client_addr_zip", "Client address — ZIP"),
    "intake.originalprimary.name": ("CASE_MANAGER", "Case manager name"),
    "intake.originalprimary.email1": ("case_manager_email", "Case manager email"),
    "intake.originalprimary.phone1": ("FIRM_PHONE", "Case manager phone"),
    "projectEmail": ("FIRM_EMAIL", "Matter/firm email"),
    "projectSmsNumber": (None, "SMS text line — no dedicated SMS number is tracked separately from the firm phone; add manually"),
    "statistics.cmsettled.lastFirst": (None, "Case manager (Last, First) — obscure legacy field, verify intent before filling"),

    # matter / intake
    "incidentDate": ("incident_date", "Date of loss"),
    "intake.incidentDate": ("incident_date", "Date of loss"),
    "intake.dateofintake": ("intake_date", "Date of intake (matter opened)"),
    "intake.sol.due": ("sol_due", "Statute of limitations due date"),

    # insurance — resolved side (3P/1P inferred from filename or override)
    "insurance2.insurer.name": ("side_carrier_name", "Carrier name"),
    "insurance2.claimnumber": ("side_claim_number", "Claim number"),
    "insurance2.policynumber": ("side_policy_number", "Policy number"),
    "insurance2.adjuster.name": ("side_adjuster_name", "Adjuster name"),
    "insurance2.adjuster.lastname": ("side_adjuster_last_name", "Adjuster last name"),
    "insurance2.adjuster.fax1": ("side_adjuster_fax", "Adjuster fax"),
    "insurance2.adjuster.email1": ("side_adjuster_email", "Adjuster email"),
    "insurance2.adjuster.address1line1": ("side_adjuster_addr_line1", "Adjuster address — line 1"),
    "insurance2.adjuster.address1line2": ("side_adjuster_addr_line2", "Adjuster address — line 2"),
    "insurance2.adjuster.address1city": ("side_adjuster_addr_city", "Adjuster address — city"),
    "insurance2.adjuster.address1state": ("side_adjuster_addr_state", "Adjuster address — state"),
    "insurance2.adjuster.address1zip": ("side_adjuster_addr_zip", "Adjuster address — ZIP"),
    # "insurer" address — this app tracks one correspondence address per side
    # (the adjuster's mailing address); reused here as the best-available proxy.
    "insurance2.insurer.address1line1": ("side_adjuster_addr_line1", "Carrier address — line 1"),
    "insurance2.insurer.address1line2": ("side_adjuster_addr_line2", "Carrier address — line 2"),
    "insurance2.insurer.address1city": ("side_adjuster_addr_city", "Carrier address — city"),
    "insurance2.insurer.address1state": ("side_adjuster_addr_state", "Carrier address — state"),
    "insurance2.insurer.address1zip": ("side_adjuster_addr_zip", "Carrier address — ZIP"),
    "insurance2.insurer.address1": ("side_adjuster_addr_line1", "Carrier address"),
    "insurance2.insurer.fax1": ("side_adjuster_fax", "Carrier fax"),
    "insurance2.dateclaimreceived": ("side_claim_received", "Date claim received"),
    "insurance2.p1.name": ("client_full_name", "Plaintiff 1 name"),
    "insurance2.p2.name": (None, "Plaintiff 2 name — this system tracks one client per matter; add manually if there's a co-plaintiff"),
    "insurance2.settlementamnt": ("settlement_amount", "Settlement amount (attorney-approved scenario)"),
    "insurance2.3ppolicylimits": ("tp_policy_limits_display", "3P policy limits"),
    "insurance2.insured.name": (None, "Insured's name (the policyholder) — not tracked separately from the carrier/claim record; add manually"),
    "insurance2.deftdriver.name": (None, "Defendant driver name — not tracked as a structured field; add manually or link an 'opposing' contact"),
    "insurance2.deftdriver.address1line1": (None, "Defendant driver address — not tracked; add manually"),
    "insurance2.deftdriver.address1line2": (None, "Defendant driver address — not tracked; add manually"),
    "insurance2.deftdriver.address1city": (None, "Defendant driver address — not tracked; add manually"),
    "insurance2.deftdriver.address1state": (None, "Defendant driver address — not tracked; add manually"),
    "insurance2.deftdriver.address1zip": (None, "Defendant driver address — not tracked; add manually"),
    "insurance2.deftdriver.fax1": (None, "Defendant driver fax — not tracked; add manually"),
    "insurance2.deftdriver.email1": (None, "Defendant driver email — not tracked; add manually"),
    "insurance2.deftdriver.lastname": (None, "Defendant driver last name — not tracked; add manually"),
    "insurance2.ownervehicle.name": (None, "Vehicle owner name (if different from driver) — not tracked; add manually"),

    # MedPay / UM-UIM adjuster — always first-party in this app's model
    "insurance2.medpayadjuster.name": ("fp_adjuster_name", "MedPay adjuster name"),
    "insurance2.medpayadjuster.lastname": ("fp_adjuster_last_name", "MedPay adjuster last name"),
    "insurance2.medpayadjuster.fax1": ("fp_adjuster_fax", "MedPay adjuster fax"),
    "insurance2.medpayadjuster.email1": ("fp_adjuster_email", "MedPay adjuster email"),
    "insurance2.medpayadjuster.address1line1": ("fp_adjuster_addr_line1", "MedPay adjuster address — line 1"),
    "insurance2.medpayadjuster.address1line2": ("fp_adjuster_addr_line2", "MedPay adjuster address — line 2"),
    "insurance2.medpayadjuster.address1city": ("fp_adjuster_addr_city", "MedPay adjuster address — city"),
    "insurance2.medpayadjuster.address1state": ("fp_adjuster_addr_state", "MedPay adjuster address — state"),
    "insurance2.medpayadjuster.address1zip": ("fp_adjuster_addr_zip", "MedPay adjuster address — ZIP"),
    "insurance2.umuimadjuster.name": ("fp_adjuster_name", "UM/UIM adjuster name"),
    "insurance2.umuimadjuster.lastname": ("fp_adjuster_last_name", "UM/UIM adjuster last name"),
    "insurance2.umuimadjuster.fax1": ("fp_adjuster_fax", "UM/UIM adjuster fax"),
    "insurance2.umuimadjuster.email1": ("fp_adjuster_email", "UM/UIM adjuster email"),
    "insurance2.umuimadjuster.address1line1": ("fp_adjuster_addr_line1", "UM/UIM adjuster address — line 1"),
    "insurance2.umuimadjuster.address1line2": ("fp_adjuster_addr_line2", "UM/UIM adjuster address — line 2"),
    "insurance2.umuimadjuster.address1city": ("fp_adjuster_addr_city", "UM/UIM adjuster address — city"),
    "insurance2.umuimadjuster.address1state": ("fp_adjuster_addr_state", "UM/UIM adjuster address — state"),
    "insurance2.umuimadjuster.address1zip": ("fp_adjuster_addr_zip", "UM/UIM adjuster address — ZIP"),

    # 3P property-damage adjuster — always third-party
    "insurance2.3ppdadjuster.name": ("tp_pd_adjuster_name", "3P property-damage adjuster name"),
    "insurance2.3ppdadjuster.lastname": ("tp_pd_adjuster_last_name", "3P property-damage adjuster last name"),
    "insurance2.3ppdadjuster.fax1": ("tp_pd_adjuster_fax", "3P property-damage adjuster fax"),
    "insurance2.3ppdadjuster.email1": ("tp_pd_adjuster_email", "3P property-damage adjuster email"),
    "insurance2.3ppdadjuster.address1line1": ("tp_pd_adjuster_addr_line1", "3P property-damage adjuster address — line 1"),
    "insurance2.3ppdadjuster.address1line2": ("tp_pd_adjuster_addr_line2", "3P property-damage adjuster address — line 2"),
    "insurance2.3ppdadjuster.address1city": ("tp_pd_adjuster_addr_city", "3P property-damage adjuster address — city"),
    "insurance2.3ppdadjuster.address1state": ("tp_pd_adjuster_addr_state", "3P property-damage adjuster address — state"),
    "insurance2.3ppdadjuster.address1zip": ("tp_pd_adjuster_addr_zip", "3P property-damage adjuster address — ZIP"),

    # vehicles
    "insurance2.yearofplaintiffsvehicle": ("plaintiff_vehicle_year", "Plaintiff's vehicle year"),
    "insurance2.makeofplaintiffsvehicle": ("plaintiff_vehicle_make", "Plaintiff's vehicle make"),
    "insurance2.modelofplaintiifsvehicle": ("plaintiff_vehicle_model", "Plaintiff's vehicle model"),
    "insurance2.colorofplaintiffsvehicle": (None, "Plaintiff's vehicle color — not tracked; add manually"),
    "insurance2.colorofdefendantsvehicle": (None, "Defendant's vehicle color — not tracked; add manually"),
    "insurance2.dyear": (None, "Defendant's vehicle year — this system only tracks the client's own vehicle; add manually"),
    "insurance2.dmake": (None, "Defendant's vehicle make — not tracked; add manually"),
    "insurance2.dmodel": (None, "Defendant's vehicle model — not tracked; add manually"),

    # medical / meds ledger
    "meds.provider.name": ("provider_name", "Medical provider name"),
    "meds.provider.fax1": ("provider_fax", "Medical provider fax"),
    "meds.provider.address1line1": ("provider_addr_line1", "Medical provider address — line 1"),
    "meds.provider.address1line2": ("provider_addr_line2", "Medical provider address — line 2"),
    "meds.provider.address1city": ("provider_addr_city", "Medical provider address — city"),
    "meds.provider.address1state": ("provider_addr_state", "Medical provider address — state"),
    "meds.provider.address1zip": ("provider_addr_zip", "Medical provider address — ZIP"),
    "meds.amount._sum": ("ledger_balance_sum", "Total outstanding provider balance"),
}

# secondary case-insensitive index, for defensive matching only
_TOKEN_MAP_CI = {k.lower(): k for k in TOKEN_MAP}


def _resolve_placeholder(base: str, filt: Optional[str], facts: dict[str, Optional[str]]) -> tuple[Optional[str], Optional[str]]:
    """Returns (value_or_None, needs_review_label_or_None)."""
    entry = TOKEN_MAP.get(base) or TOKEN_MAP.get(_TOKEN_MAP_CI.get(base.lower(), ""))
    if entry is None:
        return None, f"Unmapped placeholder: {{{{{base}}}}}"
    facts_key, label = entry
    value = facts.get(facts_key) if facts_key else None
    if not value:
        return None, label
    return value, None


# ──────────────── DOCX merge (extends training_templates' zip/XML approach) ────────────────
_WATERMARK_PARA = (
    '<w:p><w:pPr><w:jc w:val="center"/></w:pPr>'
    '<w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr>'
    '<w:t xml:space="preserve">{text}</w:t></w:r></w:p>'
)


def merge_matter_docx_bytes(
    raw: bytes,
    facts: dict[str, Optional[str]],
    *,
    watermark_text: Optional[str] = None,
) -> tuple[bytes, list[dict[str, str]], int]:
    """Fill every {{token}} / {{token | filter}} placeholder in a template's
    XML parts from `facts`. Unresolvable placeholders are replaced with a
    visible '[NEEDS REVIEW: ...]' marker rather than left silently blank or
    invented. Returns (merged_bytes, needs_review[{token,label}], filled_count)."""
    needs_review: dict[str, str] = {}
    filled_count = 0

    def _sub(match: "re.Match[str]") -> str:
        nonlocal filled_count
        base, filt = _parse_placeholder(match.group(1))
        value, label = _resolve_placeholder(base, filt, facts)
        if value is None:
            needs_review[base] = label or f"Unmapped placeholder: {{{{{base}}}}}"
            return f"[NEEDS REVIEW: {needs_review[base]}]"
        filled_count += 1
        return _xml_escape(value)

    buf_in = io.BytesIO(raw)
    buf_out = io.BytesIO()
    with zipfile.ZipFile(buf_in, "r") as zin:
        with zipfile.ZipFile(buf_out, "w", compression=zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)
                if item.filename.endswith(".xml") or item.filename.endswith(".rels"):
                    text = data.decode("utf-8")
                    text = _PLACEHOLDER_RE.sub(_sub, text)
                    if watermark_text and item.filename == "word/document.xml":
                        marker = _WATERMARK_PARA.format(text=_xml_escape(watermark_text))
                        text = text.replace("<w:body>", "<w:body>" + marker, 1)
                    data = text.encode("utf-8")
                zout.writestr(item, data)
    return buf_out.getvalue(), [{"token": k, "label": v} for k, v in needs_review.items()], filled_count


# ──────────────── request models ────────────────
class DocgenGenerateIn(BaseModel):
    filename: str = Field(..., max_length=300)
    side: Optional[Literal["third_party", "first_party"]] = None
    provider_id: Optional[str] = None
    commit: bool = False


def _require_docgen_permission(user: dict) -> None:
    if not role_has_permission(user.get("role", "staff"), "documents.write"):
        raise HTTPException(403, f"Role '{user.get('role')}' cannot generate documents")


def register_pi_docgen_routes(
    api,
    db,
    get_current_user: Callable,
    new_id: Callable,
    now_iso: Callable,
    *,
    get_firm_for_user: Callable,
    merge_pi_insurance: Callable,
    merge_pi_property_damage: Callable,
    merge_pi_settlement: Callable,
    merge_ledger_row: Callable,
):
    async def _load_matter(matter_id: str, firm_id: str) -> dict:
        m = await db.matters.find_one({"id": matter_id, "firm_id": firm_id}, {"_id": 0})
        if not m:
            raise HTTPException(404, "Matter not found")
        if m.get("practice_area") != "personal_injury":
            raise HTTPException(400, "Template DocGen applies to personal injury matters only")
        return m

    async def _load_client(matter: dict, firm_id: str) -> Optional[dict]:
        client_id = matter.get("client_id") or matter.get("client_contact_id")
        if not client_id:
            return None
        return await db.contacts.find_one({"id": client_id, "firm_id": firm_id}, {"_id": 0})

    @api.post("/matters/{matter_id}/docgen/generate")
    async def docgen_generate(matter_id: str, body: DocgenGenerateIn, user=Depends(get_current_user)):
        _require_docgen_permission(user)
        require_disclosure_ack(user)

        safe = _safe_filename(body.filename)
        if not safe.lower().endswith(".docx"):
            raise HTTPException(400, "Matter-aware merge supports .docx templates only")
        path = TEMPLATES_DOCX / safe
        if not path.is_file():
            raise HTTPException(404, "Template file not on server — use local corpus or clone repo")

        m = await _load_matter(matter_id, user["firm_id"])
        client = await _load_client(m, user["firm_id"])
        insurance = merge_pi_insurance(m.get("pi_insurance"))
        property_damage = merge_pi_property_damage(m.get("pi_property_damage"))
        firm = await get_firm_for_user(user)
        firm_tokens = firm_tokens_raw(firm, user)

        provider = None
        if body.provider_id:
            provider = await db.providers.find_one({"id": body.provider_id, "firm_id": user["firm_id"]}, {"_id": 0})

        ledger_rows = await db.med_ledger.find(
            {"firm_id": user["firm_id"], "matter_id": matter_id}, {"_id": 0}
        ).to_list(500)
        ledger_rows = [merge_ledger_row(r) for r in ledger_rows]
        if body.provider_id:
            ledger_rows = [r for r in ledger_rows if r.get("provider_id") == body.provider_id]
        ledger_sum = round(sum(float(r.get("balance") or 0) for r in ledger_rows), 2) if ledger_rows else None

        settlement = merge_pi_settlement(m.get("pi_settlement"))
        approved = next((s for s in (settlement.get("scenarios") or []) if s.get("attorney_approved")), None)
        settlement_amount = approved.get("gross_settlement") if approved else None

        side = body.side or _infer_default_side(safe)
        today = now_iso()

        facts = build_matter_docgen_facts(
            matter=m,
            client=client,
            insurance=insurance,
            property_damage=property_damage,
            firm_tokens=firm_tokens,
            side=side,
            provider=provider,
            ledger_sum=ledger_sum,
            settlement_amount=settlement_amount,
            today_iso=today,
        )

        watermark = "DRAFT — GENERATED FROM TEMPLATE — PENDING ATTORNEY REVIEW — DO NOT SEND"
        merged, needs_review, filled_count = merge_matter_docx_bytes(
            path.read_bytes(), facts, watermark_text=watermark
        )

        if not body.commit:
            return {
                "filename": safe,
                "side": side,
                "preview": True,
                "filled_count": filled_count,
                "needs_review": needs_review,
            }

        stem = Path(safe).stem
        out_name = f"{stem} (DRAFT).docx"
        doc = {
            "id": new_id(),
            "firm_id": user["firm_id"],
            "matter_id": matter_id,
            "name": out_name,
            "folder": "Letters",
            "content_type": DOCX_MIME,
            "size_bytes": len(merged),
            "data_b64": base64.b64encode(merged).decode(),
            "uploaded_by": user["id"],
            "uploaded_by_name": user.get("name"),
            "uploaded_at": today,
            "version": 1,
            "client_visible": False,
            "extracted_text": None,
            "page_count": None,
            "taxonomy": None,
            "docgen": {
                "source_template": safe,
                "side": side,
                "provider_id": body.provider_id,
                "generated_by": user["id"],
                "generated_by_name": user.get("name"),
                "generated_at": today,
                "watermark": True,
                "filled_count": filled_count,
                "needs_review": needs_review,
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
                "type": "docgen_template_filled",
                "description": f"Generated {out_name} from template ({filled_count} field(s) filled, "
                f"{len(needs_review)} need review) — DRAFT watermark pending attorney review",
                "created_at": today,
            }
        )
        return {
            "document_id": doc["id"],
            "name": out_name,
            "content_type": DOCX_MIME,
            "side": side,
            "filled_count": filled_count,
            "needs_review": needs_review,
        }
