"""PI letter DocGen — compose + render unit tests (no DB required)."""
import io
import xml.dom.minidom
import zipfile

import pytest

from pi_letters import (
    DOCX_MIME,
    LETTER_PERMISSIONS,
    LETTER_TYPES,
    _line_reduced_amount,
    compose_demand_letter,
    compose_disbursement_letter,
    compose_drop_letter,
    compose_medpay_letter,
    compose_reduction_letter,
    fmt_date,
    fmt_money,
    render_docx,
    render_pdf,
)

TOKENS = {
    "FIRM_NAME": "Test Firm LLP",
    "FIRM_DBA": "Test Firm",
    "ATTORNEY_NAME": "Jane Roe",
    "ATTORNEY_BAR": "12345",
    "CASE_MANAGER": "CM",
    "FIRM_ADDRESS": "1 Main St, Las Vegas NV",
    "FIRM_PHONE": "702-555-0100",
    "FIRM_FAX": "",
    "FIRM_EMAIL": "firm@test.law",
    "TRUST_ACCOUNT": "",
    "FEE_CONTINGENT": "33.3%",
    "JURISDICTION": "NV",
    "SOL_YEARS": "2",
}

MATTER = {
    "id": "m1",
    "case_number": "M-2026-0001",
    "title": "Doe v. Roe",
    "incident_date": "2025-11-02",
    "description": "Rear-end collision.",
}
CLIENT = {"name": "John Doe", "address": "9 Elm St, Las Vegas NV"}

DEMAND = {
    "status": "draft",
    "demand_type": "third_party",
    "exhibits": [
        {"id": "e1", "sort_order": 1, "provider_name": "Desert Hospital", "specialty": "hospital",
         "label": "Desert Hospital — hospital", "amount": 45000, "included": True},
        {"id": "e2", "sort_order": 2, "provider_name": "Valley Chiro", "specialty": "chiro",
         "label": "Valley Chiro — chiro", "amount": 3200, "included": True},
    ],
    "economic_damages": {"wage_loss_total": 1200.0, "mileage_total": 88.5, "rental_car_total": 0, "other_expenses_total": 40},
    "general_damages_notes": "Ongoing neck pain.",
    "letter_draft_notes": "Client treated conservatively.",
    "response_due_date": "2026-08-15",
}
VALIDATION = {"exhibit_specials": 48200.0, "economic_damages_total": 1328.5, "grand_demand_total": 49528.5}
INSURANCE = {
    "third_party": {
        "carrier_name": "Acme Mutual", "claim_number": "CLM-778", "policy_number": "POL-1",
        "adjuster": {"name": "Pat Adjuster", "mailing_address": "PO Box 1\nReno NV"},
    },
    "first_party": {
        "carrier_name": "Own Ins Co", "claim_number": "CLM-1P", "policy_number": "POL-2",
        "adjuster": {"name": "Sam 1P", "mailing_address": "PO Box 2"}, "medpay": {"limit": 5000},
    },
}
SCENARIO = {
    "id": "s1", "name": "Offer 60k", "gross_settlement": 60000, "expenses": 500,
    "medpay_to_client": 1000, "attorney_fee_pct": 33.333, "attorney_fee_flat": None,
    "attorney_approved": True,
    "line_items": [
        {"id": "l1", "provider_name": "Desert Hospital", "balance": 45000,
         "reduction_type": "percent", "reduction_percent": 40},
        {"id": "l2", "provider_name": "Valley Chiro", "balance": 3200,
         "reduction_type": "flat", "reduction_flat": 200},
    ],
}
COMPUTED = {"gross_settlement": 60000, "attorney_fee": 19999.8, "expenses": 500,
            "medpay_to_client": 1000, "net_to_client": 10500.2}


def _docx_text(data: bytes) -> str:
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        assert z.testzip() is None
        xml_bytes = z.read("word/document.xml")
    xml.dom.minidom.parseString(xml_bytes)  # well-formed
    return xml_bytes.decode("utf-8")


def test_formatting_helpers():
    assert fmt_money(49528.5) == "$49,528.50"
    assert fmt_money(None) == "$0.00"
    assert fmt_date("2025-11-02") == "November 2, 2025"
    assert fmt_date(None) == ""


def test_line_reduced_amount():
    assert _line_reduced_amount(SCENARIO["line_items"][0]) == 27000.0
    assert _line_reduced_amount(SCENARIO["line_items"][1]) == 3000.0
    assert _line_reduced_amount({"balance": 100, "reduction_type": "none"}) == 100.0


def test_demand_letter_draft_watermark_and_totals():
    composed = compose_demand_letter(
        tokens=TOKENS, matter=MATTER, client=CLIENT, demand=DEMAND,
        insurance=INSURANCE, validation=VALIDATION, today_iso="2026-07-08",
    )
    assert composed["watermark"] is True  # status draft → watermarked
    text = _docx_text(render_docx(composed["blocks"]))
    assert "DRAFT — PENDING ATTORNEY APPROVAL" in text
    assert "$49,528.50" in text  # grand demand total, currency formatted
    assert "Desert Hospital" in text
    assert "Acme Mutual" in text
    assert "November 2, 2025" in text


def test_demand_letter_approved_has_no_watermark():
    composed = compose_demand_letter(
        tokens=TOKENS, matter=MATTER, client=CLIENT, demand={**DEMAND, "status": "approved"},
        insurance=INSURANCE, validation=VALIDATION, today_iso="2026-07-08",
    )
    assert composed["watermark"] is False
    assert "DRAFT — PENDING" not in _docx_text(render_docx(composed["blocks"]))


def test_demand_letter_warns_without_carrier_or_exhibits():
    composed = compose_demand_letter(
        tokens=TOKENS, matter=MATTER, client=None,
        demand={**DEMAND, "exhibits": []},
        insurance={"third_party": {}, "first_party": {}},
        validation={"exhibit_specials": 0, "economic_damages_total": 0, "grand_demand_total": 0},
        today_iso="2026-07-08",
    )
    joined = " ".join(composed["warnings"])
    assert "carrier" in joined.lower()
    assert "exhibits" in joined.lower()
    assert "client" in joined.lower()


def test_medpay_letter_uses_first_party_side():
    composed = compose_medpay_letter(
        tokens=TOKENS, matter=MATTER, client=CLIENT, demand=DEMAND, insurance=INSURANCE,
        ledger_rows=[{"id": "r1", "provider_name": "Desert Hospital", "specialty": "hospital", "balance": 45000}],
        today_iso="2026-07-08",
    )
    text = _docx_text(render_docx(composed["blocks"]))
    assert "Own Ins Co" in text
    assert "CLM-1P" in text
    assert "$5,000.00" in text  # medpay limit
    assert composed["total_requested"] == 45000.0


def test_medpay_letter_bill_picker_filters_rows():
    composed = compose_medpay_letter(
        tokens=TOKENS, matter=MATTER, client=CLIENT, demand=DEMAND, insurance=INSURANCE,
        ledger_rows=[
            {"id": "r1", "provider_name": "Desert Hospital", "balance": 45000},
            {"id": "r2", "provider_name": "Valley Chiro", "balance": 3200},
        ],
        today_iso="2026-07-08",
        overrides={"ledger_row_ids": ["r2"]},
    )
    assert composed["total_requested"] == 3200.0
    text = _docx_text(render_docx(composed["blocks"]))
    assert "Valley Chiro" in text
    assert "Desert Hospital" not in text


def test_reduction_letter_states_reduced_amount():
    composed = compose_reduction_letter(
        tokens=TOKENS, matter=MATTER, client=CLIENT,
        line=SCENARIO["line_items"][0], today_iso="2026-07-08",
    )
    assert composed["reduced_amount"] == 27000.0
    text = _docx_text(render_docx(composed["blocks"]))
    assert "$27,000.00" in text
    assert "$45,000.00" in text
    assert "$18,000.00" in text  # reduction delta


def test_drop_letter_recipient_default_warns():
    composed = compose_drop_letter(tokens=TOKENS, matter=MATTER, client=CLIENT, today_iso="2026-07-08")
    assert any("recipient" in w.lower() for w in composed["warnings"])
    named = compose_drop_letter(
        tokens=TOKENS, matter=MATTER, client=CLIENT, today_iso="2026-07-08",
        overrides={"recipient_name": "Lien Co"},
    )
    assert not any("recipient" in w.lower() for w in named["warnings"])
    assert "Lien Co" in _docx_text(render_docx(named["blocks"]))


def test_disbursement_letter_statement_lines():
    composed = compose_disbursement_letter(
        tokens=TOKENS, matter=MATTER, client=CLIENT, scenario=SCENARIO,
        computed=COMPUTED, today_iso="2026-07-08",
    )
    text = _docx_text(render_docx(composed["blocks"]))
    assert "NET TO CLIENT" in text
    assert "$10,500.20" in text
    assert "Medical payout — Desert Hospital" in text
    assert "$27,000.00" in text  # reduced payout, not gross balance
    assert "33.333%" in text


@pytest.mark.parametrize("compose_kwargs", [
    dict(fn=compose_demand_letter, kw=dict(demand=DEMAND, insurance=INSURANCE, validation=VALIDATION)),
    dict(fn=compose_medpay_letter, kw=dict(demand=DEMAND, insurance=INSURANCE, ledger_rows=[])),
    dict(fn=compose_drop_letter, kw={}),
])
def test_pdf_renderer_produces_pdf(compose_kwargs):
    composed = compose_kwargs["fn"](
        tokens=TOKENS, matter=MATTER, client=CLIENT, today_iso="2026-07-08", **compose_kwargs["kw"]
    )
    pdf = render_pdf(composed["blocks"])
    assert pdf.startswith(b"%PDF")
    assert len(pdf) > 800


def test_letter_registry_permissions():
    assert LETTER_PERMISSIONS["demand"] == "demand.draft"
    assert LETTER_PERMISSIONS["disbursement"] == "settlement.draft"
    assert {row["id"] for row in LETTER_TYPES} == {"demand", "medpay", "drop", "reduction_request", "disbursement"}
    assert DOCX_MIME.endswith("wordprocessingml.document")


# ──────────────── sprint 2: bills, coverage, matching ────────────────
from pi_letters import compute_letter_missing_fields, match_bill_documents


def test_match_bill_documents_fuzzy_provider():
    docs = [
        {"id": "d1", "taxonomy": {"provider_label": "Desert Hospital"}},
        {"id": "d2", "taxonomy": {"provider_label": "desert hospital billing dept"}},
        {"id": "d3", "taxonomy": {"provider_label": "Valley Chiro"}},
        {"id": "d4", "taxonomy": {}},
    ]
    matched = match_bill_documents(docs, "Desert Hospital")
    assert {d["id"] for d in matched} == {"d1", "d2"}
    assert match_bill_documents(docs, "") == []


def test_letter_missing_fields_demand():
    missing = compute_letter_missing_fields(
        "demand",
        tokens={"ATTORNEY_NAME": "", "FIRM_ADDRESS": "1 Main St"},
        matter={"incident_date": None},
        client=None,
        demand={"exhibits": []},
        insurance={"third_party": {"carrier_name": "Acme", "adjuster": {}}, "first_party": {}},
        scenarios=[],
        bill_rows=[],
    )
    by_field = {m["field"]: m for m in missing}
    assert "client_name" in by_field and by_field["client_name"]["source"] == "Contacts"
    assert "attorney_name" in by_field and by_field["attorney_name"]["source"] == "Settings → Templates"
    assert "tp_claim" in by_field and by_field["tp_claim"]["source"] == "Insurance tab"
    assert "exhibits" in by_field
    assert "tp_carrier" not in by_field
    assert "firm_address" not in by_field


def test_letter_missing_fields_disbursement_scenario_gate():
    missing = compute_letter_missing_fields(
        "disbursement",
        tokens=TOKENS, matter=MATTER, client=CLIENT,
        demand=DEMAND, insurance=INSURANCE,
        scenarios=[{"attorney_approved": False}], bill_rows=[{"id": "r"}],
    )
    assert any(m["field"] == "approved_scenario" for m in missing)
    ok = compute_letter_missing_fields(
        "disbursement",
        tokens=TOKENS, matter=MATTER, client=CLIENT,
        demand=DEMAND, insurance=INSURANCE,
        scenarios=[{"attorney_approved": True}], bill_rows=[{"id": "r"}],
    )
    assert not any(m["field"] == "approved_scenario" for m in ok)
