"""Matter-aware DocGen — token resolution + DOCX merge unit tests (no DB required)."""
import io
import zipfile

from pi_docgen import (
    _infer_default_side,
    _split_address,
    _split_name,
    build_matter_docgen_facts,
    merge_matter_docx_bytes,
)

FIRM_TOKENS = {
    "FIRM_NAME": "Test Firm LLP",
    "FIRM_DBA": "Test Firm",
    "ATTORNEY_NAME": "Jane Roe",
    "ATTORNEY_BAR": "12345",
    "CASE_MANAGER": "Cam Manager",
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
    "practice_area": "personal_injury",
    "case_number": "M-2026-0001",
    "incident_date": "2026-01-15",
    "description": "Rear-end collision",
    "sol_date": "2028-01-15",
    "created_at": "2026-01-20T10:00:00+00:00",
}
CLIENT = {
    "id": "c1",
    "name": "John A. Smith",
    "email": "john@example.com",
    "phone": "702-555-1234",
    "address": "123 Main St\nLas Vegas, NV 89101",
    "date_of_birth": "1990-05-01",
}
INSURANCE = {
    "third_party": {
        "carrier_name": "Acme Mutual",
        "claim_number": "CLM-1",
        "policy_number": "POL-1",
        "opened_date": "2026-01-18",
        "adjuster": {
            "name": "Pat Adjuster",
            "phone": "702-555-9999",
            "fax": "702-555-8888",
            "email": "pat@acme.com",
            "mailing_address": "500 Insurer Way\nReno, NV 89501",
        },
        "pd_adjuster": {
            "name": "Sam PD",
            "phone": "",
            "fax": "702-555-7777",
            "email": "sam@acme.com",
            "mailing_address": "",
        },
        "limits": {"display": "$100k/$300k"},
    },
    "first_party": {
        "carrier_name": "Own Co",
        "claim_number": "CLM-2",
        "policy_number": "POL-2",
        "opened_date": None,
        "adjuster": {"name": "Alex Own", "phone": "", "fax": "", "email": "alex@own.com", "mailing_address": ""},
        "pd_adjuster": {"name": "", "phone": "", "fax": "", "email": "", "mailing_address": ""},
        "limits": {"display": ""},
        "medpay": {"limit": 5000},
    },
}
PROPERTY_DAMAGE = {"vehicle": {"year": "2020", "make": "Honda", "model": "Civic"}}
TODAY = "2026-07-08T00:00:00+00:00"


def test_split_name():
    assert _split_name("John A. Smith") == ("John A.", "Smith")
    assert _split_name("Cher") == ("Cher", None)
    assert _split_name(None) == (None, None)
    assert _split_name("") == (None, None)
    assert _split_name("John Smith Jr.") == ("John", "Smith Jr.")


def test_split_address_multiline_recognizes_city_state_zip():
    parts = _split_address("123 Main St\nLas Vegas, NV 89101")
    assert parts == {"line1": "123 Main St", "line2": None, "city": "Las Vegas", "state": "NV", "zip": "89101"}


def test_split_address_single_line_commas():
    parts = _split_address("123 Main St, Las Vegas, NV 89101")
    assert parts["city"] == "Las Vegas"
    assert parts["state"] == "NV"
    assert parts["zip"] == "89101"


def test_split_address_unparseable_never_guesses():
    parts = _split_address("some random text with no clear structure")
    assert parts == {"line1": None, "line2": None, "city": None, "state": None, "zip": None}
    assert _split_address(None) == {"line1": None, "line2": None, "city": None, "state": None, "zip": None}


def test_infer_default_side_from_filename():
    assert _infer_default_side("(NV) 1P LOR.docx") == "first_party"
    assert _infer_default_side("(WA) 3P Hold Harmless Agreement.docx") == "third_party"
    assert _infer_default_side("(NV) NPIM REFERRAL FORM.docx") is None


def test_build_facts_reuses_ai_intake_shape_for_client_and_matter():
    facts = build_matter_docgen_facts(
        matter=MATTER, client=CLIENT, insurance=INSURANCE, property_damage=PROPERTY_DAMAGE,
        firm_tokens=FIRM_TOKENS, side="third_party", provider=None, ledger_sum=None,
        settlement_amount=None, today_iso=TODAY,
    )
    assert facts["client_full_name"] == "John A. Smith"
    assert facts["client_first_name"] == "John A."
    assert facts["client_last_name"] == "Smith"
    assert facts["client_dob"] == "May 1, 1990"
    assert facts["incident_date"] == "January 15, 2026"
    assert facts["sol_due"] == "January 15, 2028"
    assert facts["side_carrier_name"] == "Acme Mutual"
    assert facts["side_adjuster_fax"] == "702-555-8888"
    assert facts["plaintiff_vehicle_make"] == "Honda"


def test_facts_never_fabricate_unmodeled_fields():
    facts = build_matter_docgen_facts(
        matter=MATTER, client=CLIENT, insurance=INSURANCE, property_damage=PROPERTY_DAMAGE,
        firm_tokens=FIRM_TOKENS, side="third_party", provider=None, ledger_sum=None,
        settlement_amount=None, today_iso=TODAY,
    )
    # SSN, defendant vehicle, salutation etc. are never in the facts graph at all
    assert "ssn" not in facts
    assert "defendant_vehicle_make" not in facts
    assert "client_salutation" not in facts


def test_facts_medpay_and_pd_adjuster_bypass_side_selection():
    facts = build_matter_docgen_facts(
        matter=MATTER, client=CLIENT, insurance=INSURANCE, property_damage=PROPERTY_DAMAGE,
        firm_tokens=FIRM_TOKENS, side="third_party", provider=None, ledger_sum=None,
        settlement_amount=None, today_iso=TODAY,
    )
    # MedPay/UM-UIM adjuster is always first-party regardless of the resolved `side`
    assert facts["fp_adjuster_name"] == "Alex Own"
    # 3P property-damage adjuster is always third-party regardless of `side`
    assert facts["tp_pd_adjuster_name"] == "Sam PD"


def test_facts_ledger_sum_is_a_deterministic_arithmetic_read_not_a_guess():
    facts = build_matter_docgen_facts(
        matter=MATTER, client=CLIENT, insurance=INSURANCE, property_damage=PROPERTY_DAMAGE,
        firm_tokens=FIRM_TOKENS, side="third_party", provider=None, ledger_sum=1234.5,
        settlement_amount=None, today_iso=TODAY,
    )
    assert facts["ledger_balance_sum"] == "$1,234.50"
    facts_no_ledger = build_matter_docgen_facts(
        matter=MATTER, client=CLIENT, insurance=INSURANCE, property_damage=PROPERTY_DAMAGE,
        firm_tokens=FIRM_TOKENS, side="third_party", provider=None, ledger_sum=None,
        settlement_amount=None, today_iso=TODAY,
    )
    assert facts_no_ledger["ledger_balance_sum"] is None


def test_facts_settlement_amount_only_when_provided_approved_figure():
    facts = build_matter_docgen_facts(
        matter=MATTER, client=CLIENT, insurance=INSURANCE, property_damage=PROPERTY_DAMAGE,
        firm_tokens=FIRM_TOKENS, side="third_party", provider=None, ledger_sum=None,
        settlement_amount=None, today_iso=TODAY,
    )
    assert facts["settlement_amount"] is None  # never invents a dollar figure


def _build_test_docx(paragraphs: list[str]) -> bytes:
    body = "".join(f"<w:p><w:r><w:t xml:space=\"preserve\">{p}</w:t></w:r></w:p>" for p in paragraphs)
    document = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        f"<w:body>{body}</w:body></w:document>"
    )
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", "<Types/>")
        z.writestr("_rels/.rels", "<Relationships/>")
        z.writestr("word/document.xml", document)
    return buf.getvalue()


def _docx_text(data: bytes) -> str:
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        assert z.testzip() is None
        return z.read("word/document.xml").decode("utf-8")


def test_merge_fills_known_tokens_and_flags_unknown_never_fabricates():
    raw = _build_test_docx(
        [
            "Client: {{fullname}}",
            "SSN: {{ssn}}",
            "DOB: {{clientBirthdate | longDate}}",
            "{{some_unmapped_token}}",
        ]
    )
    facts = build_matter_docgen_facts(
        matter=MATTER, client=CLIENT, insurance=INSURANCE, property_damage=PROPERTY_DAMAGE,
        firm_tokens=FIRM_TOKENS, side="third_party", provider=None, ledger_sum=None,
        settlement_amount=None, today_iso=TODAY,
    )
    merged, needs_review, filled_count = merge_matter_docx_bytes(raw, facts, watermark_text="DRAFT WATERMARK")
    text = _docx_text(merged)
    assert "John A. Smith" in text
    assert "May 1, 1990" in text
    assert filled_count >= 2
    assert "DRAFT WATERMARK" in text  # watermark paragraph inserted

    flagged = {r["token"] for r in needs_review}
    assert "ssn" in flagged  # never fabricated
    assert "some_unmapped_token" in flagged  # defensively flagged, not silently dropped


def test_merge_never_leaves_raw_placeholder_syntax_in_output():
    raw = _build_test_docx(["{{ssn}}", "{{totally_unknown_xyz}}"])
    facts = build_matter_docgen_facts(
        matter=MATTER, client=CLIENT, insurance=INSURANCE, property_damage=PROPERTY_DAMAGE,
        firm_tokens=FIRM_TOKENS, side=None, provider=None, ledger_sum=None,
        settlement_amount=None, today_iso=TODAY,
    )
    merged, needs_review, filled_count = merge_matter_docx_bytes(raw, facts, watermark_text=None)
    text = _docx_text(merged)
    # The mapped-but-unresolvable token (ssn) never echoes raw placeholder syntax —
    # only the defensive "unmapped" fallback path does, and only to name what it
    # couldn't recognize. Either way both are wrapped in a visible marker, never
    # left bare and never silently dropped.
    assert "[NEEDS REVIEW: Client SSN" in text
    assert "[NEEDS REVIEW: Unmapped placeholder: {{totally_unknown_xyz}}]" in text
    assert len(needs_review) == 2
    assert filled_count == 0


def test_merge_ambiguous_side_leaves_insurance_tokens_for_review():
    raw = _build_test_docx(["Carrier: {{insurance2.insurer.name}}"])
    facts = build_matter_docgen_facts(
        matter=MATTER, client=CLIENT, insurance=INSURANCE, property_damage=PROPERTY_DAMAGE,
        firm_tokens=FIRM_TOKENS, side=None, provider=None, ledger_sum=None,
        settlement_amount=None, today_iso=TODAY,
    )
    merged, needs_review, filled_count = merge_matter_docx_bytes(raw, facts, watermark_text=None)
    assert filled_count == 0
    assert needs_review[0]["token"] == "insurance2.insurer.name"
