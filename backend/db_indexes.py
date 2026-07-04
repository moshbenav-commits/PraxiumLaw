"""MongoDB indexes for Praxium Suite collections."""
from __future__ import annotations

from typing import Any

INDEX_SPECS = [
    ("users", [("email", 1)], True),
    ("users", [("firm_id", 1)], False),
    ("matters", [("firm_id", 1), ("status", 1)], False),
    ("matters", [("firm_id", 1), ("case_number", 1)], False),
    ("contacts", [("firm_id", 1), ("kind", 1)], False),
    ("tasks", [("firm_id", 1), ("status", 1)], False),
    ("documents", [("firm_id", 1), ("matter_id", 1)], False),
    ("leads", [("firm_id", 1), ("status", 1)], False),
    ("audit_events", [("firm_id", 1), ("created_at", -1)], False),
    ("audit_events", [("firm_id", 1), ("action", 1), ("created_at", -1)], False),
    ("team_invites", [("email", 1), ("status", 1)], False),
    ("team_invites", [("token", 1)], True),
    ("identity_verification_sessions", [("firm_id", 1), ("status", 1)], False),
    ("workflows", [("firm_id", 1), ("trigger", 1)], False),
    ("firm_tools", [("firm_id", 1), ("tool_id", 1)], True),
    ("portal_magic_links", [("token", 1)], True),
    ("portal_magic_links", [("contact_id", 1), ("kind", 1)], False),
    ("portal_messages", [("firm_id", 1), ("matter_id", 1), ("created_at", -1)], False),
    ("portal_messages", [("firm_id", 1), ("read_by_staff", 1)], False),
    ("magic_links", [("token", 1)], True),
    ("sign_requests", [("token", 1)], True),
    ("sign_requests", [("firm_id", 1), ("matter_id", 1)], False),
    ("contacts", [("email", 1), ("kind", 1)], False),
    ("webhook_endpoints", [("firm_id", 1), ("active", 1)], False),
    ("webhook_events", [("firm_id", 1), ("created_at", -1)], False),
    ("webhook_deliveries", [("firm_id", 1), ("created_at", -1)], False),
    ("med_ledger", [("firm_id", 1), ("matter_id", 1)], False),
    ("api_keys", [("firm_id", 1), ("active", 1)], False),
    ("api_keys", [("key_hash", 1)], True),
]


async def ensure_indexes(db: Any) -> None:
    for collection, keys, unique in INDEX_SPECS:
        await db[collection].create_index(keys, unique=unique, background=True)
