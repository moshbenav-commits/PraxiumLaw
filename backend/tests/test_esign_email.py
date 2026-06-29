"""Unit tests for NativeSign invite email content and send helper."""
from unittest.mock import patch

from email_util import esign_invite_email_content, send_esign_invite_email


def test_esign_invite_email_content_fields():
    subject, text, html = esign_invite_email_content(
        firm_name="Acme Law",
        document_title="Retainer Agreement",
        matter_label="2026-001",
        signer_name="Jane Client",
        sign_url="https://app.example.com/sign/abc123",
        expires_date="2026-07-15",
    )
    assert "Acme Law" in subject
    assert "Retainer Agreement" in subject
    assert "Jane Client" in text
    assert "https://app.example.com/sign/abc123" in text
    assert "2026-07-15" in text
    assert "Review and sign" in html
    assert "viewport" in html
    assert "min-height:44px" in html or "min-height:44px" in html.replace(" ", "")


def test_esign_invite_email_content_no_signer_name():
    _, text, _ = esign_invite_email_content(
        firm_name="Firm",
        document_title="Doc",
        matter_label="M-1",
        signer_name="",
        sign_url="https://x/sign/t",
        expires_date="2026-01-01",
    )
    assert text.startswith("Hello,")


@patch("email_util.send_transactional_email", return_value=True)
def test_send_esign_invite_email(mock_send):
    ok = send_esign_invite_email(
        "client@example.com",
        "https://app/sign/token",
        firm_name="Demo Firm",
        document_title="Agreement",
        matter_label="CASE-1",
        signer_name="Client",
        expires_date="2026-08-01",
    )
    assert ok is True
    mock_send.assert_called_once()
    args, kwargs = mock_send.call_args
    assert args[0] == "client@example.com"
    assert "Demo Firm" in args[1]
    assert kwargs.get("html")
    assert "Review and sign" in kwargs["html"]
