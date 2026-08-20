#!/usr/bin/env python3
"""Upsert the Gold Medal Injury firm row used by GMI intake firm_slug routing.

Usage (never prints secrets):
  cd PraxiumLaw/backend
  MONGO_URL=… DB_NAME=praxium_prod python3 scripts/ensure_gmi_firm.py

Or from workspace vault (Atlas URI shared with EP, separate DB_NAME):
  npm run secrets:run -- MONGODB_URI -- env DB_NAME=praxium_prod \\
    python3 PraxiumLaw/backend/scripts/ensure_gmi_firm.py
"""
from __future__ import annotations

import os
import sys
import uuid
from datetime import datetime, timezone

from pymongo import MongoClient

SLUG = "gold-medal-injury"
NAME = "Gold Medal Injury"


def main() -> int:
    url = (os.environ.get("MONGO_URL") or os.environ.get("MONGODB_URI") or "").strip()
    db_name = (os.environ.get("DB_NAME") or "praxium_prod").strip()
    if not url:
        print("FAIL: MONGO_URL or MONGODB_URI required", file=sys.stderr)
        return 2
    if "127.0.0.1" in url or "localhost" in url:
        print("FAIL: refusing localhost URI for firm seed", file=sys.stderr)
        return 2

    client = MongoClient(url, serverSelectionTimeoutMS=12_000)
    client.admin.command("ping")
    db = client[db_name]
    existing = db.firms.find_one({"slug": SLUG}, {"_id": 0, "id": 1, "name": 1, "slug": 1})
    if existing:
        print(f"OK: firm already present id={existing.get('id')} slug={SLUG}")
        return 0

    firm_id = uuid.uuid4().hex
    doc = {
        "id": firm_id,
        "name": NAME,
        "slug": SLUG,
        "subscription_tier": "starter",
        "owner_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "settings": {"timezone": "America/Los_Angeles", "intake_source": "gold-medal-injury-site"},
    }
    db.firms.insert_one(doc)
    print(f"OK: created firm id={firm_id} slug={SLUG} db={db_name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
