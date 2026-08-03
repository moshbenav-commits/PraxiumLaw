"""
Shared pytest bootstrap for the whole backend/tests/ suite (Phase 1a — see
docs/PRAXIUMLAW_BIBLE.md "Current State").

Why this exists: server.py reads MONGO_URL/DB_NAME/JWT_SECRET/... via mandatory
os.environ[...] lookups AND builds its Mongo client at *module import time*
(`mongo_client = AsyncIOMotorClient(mongo_url)`). Before this file existed, the
only place those env vars got set — and the only place `AsyncIOMotorClient` got
monkeypatched to the in-memory `mongomock_motor` client — was a side effect of
importing tests/test_intake_attribution.py. That worked by accident for a
full `pytest` run (alphabetical collection order happens to import that file
before anything else that touches `server`), but broke immediately for any
partial run, e.g. `pytest tests/test_pi_phases.py` on its own raised
`KeyError: 'MONGO_URL'` at collection time.

conftest.py is always collected before any test module in its directory, for
any selection, so putting the bootstrap here makes `pytest <anything>` behave
the same regardless of which tests you ask for. No real MongoDB is required
or used — every test in this suite runs against an in-memory mongomock.
"""
from __future__ import annotations

import os
import sys
from unittest.mock import patch

# server.py reads these via os.environ[...] (mandatory) at import time.
os.environ.setdefault("MONGO_URL", "mongodb://127.0.0.1:27017")
os.environ.setdefault("DB_NAME", "praxium_test")
os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")
os.environ.setdefault("PRAXIUM_FRONTEND_URL", "http://localhost:3000")
# No outbound-email provider configured on purpose — notify paths should
# degrade to log-only behavior in tests, never attempt a real send.
os.environ.pop("RESEND_API_KEY", None)
os.environ.pop("PRAXIUM_LEAD_NOTIFY_EMAIL", None)
os.environ.pop("LEAD_NOTIFY_EMAIL", None)
# Inbound webhook receiver: leave unset so webhook_security tests exercise the
# documented dev fail-open path unless a test explicitly overrides it.
os.environ.pop("GENERIC_WEBHOOK_KEY", None)

if "server" not in sys.modules:
    from mongomock_motor import AsyncMongoMockClient  # noqa: E402

    with patch("motor.motor_asyncio.AsyncIOMotorClient", AsyncMongoMockClient):
        import server  # noqa: E402, F401

    # Seed the provider-secret sync cache so email_util's lazy pymongo refresh
    # doesn't waste time (or hang) trying to reach a real Mongo at MONGO_URL.
    import provider_secrets  # noqa: E402
    import time as _time

    provider_secrets._CACHE["at"] = _time.monotonic()
    provider_secrets._CACHE["values"] = {}
    provider_secrets._CACHE["extras"] = {}
