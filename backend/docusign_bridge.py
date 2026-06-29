"""Optional DocuSign bridge — v2 stub; NativeSign is primary."""
from __future__ import annotations

import os
from typing import Any, List, Optional


def docusign_enabled() -> bool:
    flag = os.environ.get("DOCUSIGN_INTEGRATION_ENABLED", "").lower() in ("1", "true", "yes")
    has_keys = bool(os.environ.get("DOCUSIGN_INTEGRATION_KEY")) and bool(
        os.environ.get("DOCUSIGN_USER_ID")
    )
    return flag and has_keys


class DocuSignBridge:
    """Stub adapter — implement OAuth + REST v2.1 when keys are present."""

    def is_available(self) -> bool:
        return docusign_enabled()

    async def create_envelope(
        self,
        *,
        subject: str,
        message: str,
        pdf_bytes: bytes,
        filename: str,
        signers: List[dict],
    ) -> dict[str, Any]:
        if not self.is_available():
            raise RuntimeError(
                "DocuSign integration disabled — set DOCUSIGN_INTEGRATION_ENABLED and API keys, "
                "or use NativeSign in-app signing."
            )
        return {
            "provider": "docusign",
            "status": "stub",
            "message": "DocuSign OAuth envelope creation is deferred to v2.",
            "subject": subject,
            "filename": filename,
            "signer_count": len(signers),
        }

    async def download_signed_pdf(self, envelope_id: str) -> bytes:
        raise RuntimeError("DocuSign download stub — not implemented in v1")
