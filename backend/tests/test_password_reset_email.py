"""Unit tests for the password-reset email helper (no Mongo)."""
from unittest.mock import patch

from email_util import send_password_reset_email


@patch("email_util.send_transactional_email", return_value=True)
def test_send_password_reset_email(mock_send):
    ok = send_password_reset_email(
        "client@example.com",
        "https://app.example.com/reset-password?token=abc123",
    )
    assert ok is True
    mock_send.assert_called_once()
    args, kwargs = mock_send.call_args
    assert args[0] == "client@example.com"
    assert args[1] == "Reset your PraxiumLaw password"
    assert "https://app.example.com/reset-password?token=abc123" in args[2]
    assert kwargs.get("html")
    assert "https://app.example.com/reset-password?token=abc123" in kwargs["html"]
