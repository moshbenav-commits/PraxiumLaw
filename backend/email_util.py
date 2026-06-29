"""Transactional email via Resend (optional — logs when RESEND_API_KEY unset)."""
from __future__ import annotations

import logging
import os
from typing import Optional

import requests

log = logging.getLogger("praxium.email")


def _from_address() -> str:
    return os.environ.get("PRAXIUM_EMAIL_FROM", "Praxium Suite <onboarding@resend.dev>").strip()


def send_transactional_email(
    to: str,
    subject: str,
    text: str,
    *,
    html: Optional[str] = None,
) -> bool:
    """Send email when RESEND_API_KEY is set. Returns True if sent, False if skipped/failed."""
    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    recipient = to.strip().lower()
    if not recipient:
        return False

    if not api_key:
        log.info("Resend skipped (no RESEND_API_KEY): to=%s subject=%s", recipient, subject)
        return False

    payload: dict = {
        "from": _from_address(),
        "to": [recipient],
        "subject": subject,
        "text": text,
    }
    if html:
        payload["html"] = html

    try:
        resp = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=15,
        )
        if resp.status_code >= 400:
            log.error("Resend failed %s: %s", resp.status_code, resp.text[:300])
            return False
        return True
    except Exception as exc:
        log.error("Resend error: %s", exc)
        return False


def send_portal_login_email(to: str, verify_url: str, firm_name: str = "your firm") -> bool:
    subject = f"{firm_name} — secure client portal link"
    text = (
        f"Use this one-time link to sign in to the {firm_name} client portal:\n\n"
        f"{verify_url}\n\n"
        "This link expires in 24 hours and can only be used once.\n"
        "If you did not request this, you can ignore this email."
    )
    html = (
        f"<p>Use this one-time link to sign in to the <strong>{firm_name}</strong> client portal:</p>"
        f'<p><a href="{verify_url}">Open client portal</a></p>'
        f"<p>This link expires in 24 hours and can only be used once.</p>"
        f"<p>If you did not request this, you can ignore this email.</p>"
    )
    return send_transactional_email(to, subject, text, html=html)


def send_portal_invite_email(
    to: str,
    verify_url: str,
    *,
    firm_name: str = "your firm",
    matter_title: str = "your matter",
) -> bool:
    subject = f"{firm_name} — client portal invitation"
    text = (
        f"You have been invited to the {firm_name} client portal for: {matter_title}.\n\n"
        f"Sign in here (one-time link):\n{verify_url}\n\n"
        "View documents, messages, and tasks shared with you."
    )
    html = (
        f"<p>You have been invited to the <strong>{firm_name}</strong> client portal "
        f"for <strong>{matter_title}</strong>.</p>"
        f'<p><a href="{verify_url}">Open client portal</a></p>'
        f"<p>View documents, messages, and tasks shared with you.</p>"
    )
    return send_transactional_email(to, subject, text, html=html)


def send_upload_link_email(
    to: str,
    upload_url: str,
    *,
    firm_name: str = "your firm",
    matter_label: str = "your matter",
) -> bool:
    subject = f"{firm_name} — secure document upload"
    text = (
        f"Upload documents for {matter_label} using this secure link:\n\n"
        f"{upload_url}\n\n"
        "No account required. Link expires on the date shown on the upload page."
    )
    html = (
        f"<p>Upload documents for <strong>{matter_label}</strong> using this secure link:</p>"
        f'<p><a href="{upload_url}">Open secure upload</a></p>'
        f"<p>No account required.</p>"
    )
    return send_transactional_email(to, subject, text, html=html)
