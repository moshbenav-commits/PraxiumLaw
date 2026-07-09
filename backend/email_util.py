"""Transactional email via Resend (optional — logs when RESEND_API_KEY unset)."""
from __future__ import annotations

import logging
import os
from typing import Optional

import requests

from provider_secrets import get_extra_cached, get_secret_cached

log = logging.getLogger("praxium.email")


def _from_address() -> str:
    vault_from = get_extra_cached("resend", "email_from").strip()
    if vault_from:
        return vault_from
    return os.environ.get("PRAXIUM_EMAIL_FROM", "Praxium Suite <onboarding@resend.dev>").strip()


def send_transactional_email(
    to: str,
    subject: str,
    text: str,
    *,
    html: Optional[str] = None,
) -> bool:
    """Send email when a Resend key is configured (Settings → Integrations vault,
    or RESEND_API_KEY env). Returns True if sent, False if skipped/failed."""
    api_key = get_secret_cached("resend")
    recipient = to.strip().lower()
    if not recipient:
        return False

    if not api_key:
        log.info("Resend skipped (no key in vault or RESEND_API_KEY): to=%s subject=%s", recipient, subject)
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


def _mobile_cta_button(href: str, label: str) -> str:
    """Inline-styled CTA button — readable on mobile mail clients."""
    return (
        f'<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0">'
        f'<tr><td align="center" style="border-radius:6px;background:#121212">'
        f'<a href="{href}" target="_blank" rel="noopener" '
        f'style="display:inline-block;padding:14px 28px;font-family:Inter,Arial,sans-serif;'
        f'font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;'
        f'line-height:1.25;min-height:44px;box-sizing:border-box">'
        f"{label}</a></td></tr></table>"
    )


def esign_invite_email_content(
    *,
    firm_name: str,
    document_title: str,
    matter_label: str,
    signer_name: str,
    sign_url: str,
    expires_date: str,
) -> tuple[str, str, str]:
    """Returns (subject, text, html) for NativeSign invite emails."""
    subject = f"{firm_name} — please sign: {document_title}"
    greeting = f"Hi {signer_name}," if signer_name.strip() else "Hello,"
    text = (
        f"{greeting}\n\n"
        f"{firm_name} has sent you \"{document_title}\" to review and sign"
        f" (matter {matter_label}).\n\n"
        f"Open this link on your phone or computer (no account required):\n"
        f"{sign_url}\n\n"
        f"This link expires {expires_date}.\n\n"
        "If you did not expect this request, you can ignore this email."
    )
    html = (
        '<!DOCTYPE html><html><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1"></head>'
        '<body style="margin:0;padding:0;background:#f5f3ef;font-family:Inter,Arial,sans-serif">'
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">'
        '<tr><td align="center" style="padding:24px 16px">'
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        'style="max-width:560px;background:#ffffff;border:1px solid #e5e2dc;border-radius:8px">'
        '<tr><td style="padding:28px 24px">'
        f'<p style="margin:0 0 8px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280">'
        f"{firm_name}</p>"
        f'<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#121212">'
        f"Signature requested</h1>"
        f'<p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#374151">{greeting}</p>'
        f'<p style="margin:0 0 8px;font-size:15px;line-height:1.5;color:#374151">'
        f"Please review and sign <strong>{document_title}</strong>"
        f" for matter <strong>{matter_label}</strong>.</p>"
        f'<p style="margin:0;font-size:14px;line-height:1.5;color:#6b7280">'
        f"Works on mobile — open the link, scroll the PDF, and draw your signature.</p>"
        f"{_mobile_cta_button(sign_url, 'Review and sign')}"
        f'<p style="margin:0;font-size:13px;line-height:1.5;color:#6b7280">'
        f"Link expires <strong>{expires_date}</strong>.</p>"
        f'<p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#9ca3af">'
        f'Or copy this URL:<br><span style="word-break:break-all">{sign_url}</span></p>'
        "</td></tr></table></td></tr></table></body></html>"
    )
    return subject, text, html


def send_esign_invite_email(
    to: str,
    sign_url: str,
    *,
    firm_name: str = "Your firm",
    document_title: str = "Document",
    matter_label: str = "your matter",
    signer_name: str = "",
    expires_date: str = "",
) -> bool:
    subject, text, html = esign_invite_email_content(
        firm_name=firm_name,
        document_title=document_title,
        matter_label=matter_label,
        signer_name=signer_name,
        sign_url=sign_url,
        expires_date=expires_date,
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
