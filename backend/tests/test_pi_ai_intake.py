"""AI intake fill — pure extraction/normalization tests (no DB, no AI call)."""
import pytest

from pi_ai_intake import (
    build_current_shape,
    compute_missing_fields,
    empty_proposals,
    normalize_extraction,
    parse_model_json,
)


def test_parse_model_json_plain_and_fenced():
    assert parse_model_json('{"a": 1}') == {"a": 1}
    assert parse_model_json('```json\n{"a": 1}\n```') == {"a": 1}
    assert parse_model_json('Here you go: {"a": {"b": 2}} thanks') == {"a": {"b": 2}}
    with pytest.raises(ValueError):
        parse_model_json("no json here")


def test_normalize_extraction_keeps_schema_drops_junk():
    raw = {
        "contact": {"name": "  John Doe ", "phone": "702-555-1234", "hacker_field": "x"},
        "matter": {"incident_date": "2025-11-02", "description": "Rear-ended."},
        "insurance": {
            "third_party": {"carrier_name": "Acme", "adjuster": {"name": "Pat", "junk": 1}},
            "first_party": {"medpay_limit": "5000"},
        },
        "unexpected_top": {"x": 1},
    }
    out = normalize_extraction(raw)
    assert out["contact"]["name"] == "John Doe"
    assert "hacker_field" not in out["contact"]
    assert out["insurance"]["third_party"]["carrier_name"] == "Acme"
    assert out["insurance"]["third_party"]["adjuster"]["name"] == "Pat"
    assert "junk" not in out["insurance"]["third_party"]["adjuster"]
    assert out["insurance"]["first_party"]["medpay_limit"] == 5000.0
    assert "unexpected_top" not in out


def test_normalize_extraction_garbage_input():
    assert normalize_extraction("not a dict") == empty_proposals()
    assert normalize_extraction({"insurance": "nope"})["insurance"]["third_party"]["carrier_name"] is None
    assert normalize_extraction({"insurance": {"first_party": {"medpay_limit": "lots"}}})["insurance"]["first_party"]["medpay_limit"] is None


def test_missing_fields_respects_current_values():
    proposals = empty_proposals()
    proposals["contact"]["name"] = "John Doe"
    current = empty_proposals()
    current["matter"]["incident_date"] = "2025-11-02"
    missing = compute_missing_fields(proposals, current)
    paths = {m["path"] for m in missing}
    assert "contact.name" not in paths          # proposed
    assert "matter.incident_date" not in paths  # already on matter
    assert "insurance.third_party.claim_number" in paths


def test_build_current_shape_maps_medpay_limit():
    current = build_current_shape(
        {"incident_date": "2025-11-02", "description": "d"},
        {"name": "John", "address": None},
        {"third_party": {"carrier_name": "Acme", "adjuster": {"name": "Pat"}},
         "first_party": {"medpay": {"limit": 5000}, "adjuster": {}}},
    )
    assert current["contact"]["name"] == "John"
    assert current["insurance"]["first_party"]["medpay_limit"] == 5000
    assert current["insurance"]["third_party"]["adjuster"]["name"] == "Pat"
