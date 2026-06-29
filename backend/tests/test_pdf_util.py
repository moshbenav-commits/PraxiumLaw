"""PDF utility smoke tests."""
import base64

from pdf_util import (
    create_blank_pdf,
    extract_text_from_pdf_bytes,
    is_pdf,
    merge_signature_fields,
    page_count,
)


def test_is_pdf():
    assert is_pdf("application/pdf", "retainer.pdf")
    assert not is_pdf("text/plain", "notes.txt")


def test_blank_pdf_and_extract():
    raw = create_blank_pdf("Test Agreement", ["Line one", "Line two"])
    assert page_count(raw) == 1
    text = extract_text_from_pdf_bytes(raw)
    assert "Test Agreement" in text


def test_merge_signature_minimal():
    raw = create_blank_pdf("Sign me", ["Please sign below"])
    # 1x1 red PNG
    png_b64 = (
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    )
    signed = merge_signature_fields(raw, png_b64, [], "Ada Lovelace", "2026-06-29T12:00:00+00:00")
    assert signed.startswith(b"%PDF")
    assert len(signed) > len(raw)
