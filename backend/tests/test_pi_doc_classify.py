"""AI document classifier — response parsing unit tests (no DB/AI call required)."""
import json

import pytest

from pi_doc_classify import parse_classification


def test_parse_classification_happy_path():
    raw = json.dumps(
        {"doc_type": "medical", "medical_code": "MR", "confidence": 0.82, "rationale": "Chart notes and diagnosis codes."}
    )
    result = parse_classification(raw)
    assert result == {
        "doc_type": "medical",
        "medical_code": "MR",
        "confidence": 0.82,
        "rationale": "Chart notes and diagnosis codes.",
    }


def test_parse_classification_strips_markdown_fences():
    raw = "```json\n" + json.dumps({"doc_type": "pleadings", "medical_code": None, "confidence": 0.9, "rationale": "Court caption present."}) + "\n```"
    result = parse_classification(raw)
    assert result["doc_type"] == "pleadings"
    assert result["medical_code"] is None


def test_parse_classification_unknown_doc_type_falls_back_to_misc():
    raw = json.dumps({"doc_type": "not_a_real_type", "confidence": 0.5, "rationale": "x"})
    result = parse_classification(raw)
    assert result["doc_type"] == "misc"


def test_parse_classification_medical_code_ignored_unless_doc_type_medical():
    raw = json.dumps({"doc_type": "pleadings", "medical_code": "MR", "confidence": 0.5, "rationale": "x"})
    result = parse_classification(raw)
    assert result["doc_type"] == "pleadings"
    assert result["medical_code"] is None  # never applied outside doc_type=medical


def test_parse_classification_invalid_medical_code_dropped():
    raw = json.dumps({"doc_type": "medical", "medical_code": "NOT_A_CODE", "confidence": 0.5, "rationale": "x"})
    result = parse_classification(raw)
    assert result["doc_type"] == "medical"
    assert result["medical_code"] is None


def test_parse_classification_confidence_clamped_to_0_1():
    raw = json.dumps({"doc_type": "misc", "confidence": 5, "rationale": "x"})
    assert parse_classification(raw)["confidence"] == 1.0
    raw2 = json.dumps({"doc_type": "misc", "confidence": -3, "rationale": "x"})
    assert parse_classification(raw2)["confidence"] == 0.0


def test_parse_classification_missing_confidence_defaults_to_zero():
    raw = json.dumps({"doc_type": "misc", "rationale": "x"})
    assert parse_classification(raw)["confidence"] == 0.0


def test_parse_classification_no_json_object_raises():
    with pytest.raises(ValueError):
        parse_classification("not json at all")


def test_parse_classification_rationale_truncated():
    raw = json.dumps({"doc_type": "misc", "confidence": 0.1, "rationale": "x" * 1000})
    result = parse_classification(raw)
    assert len(result["rationale"]) == 500
