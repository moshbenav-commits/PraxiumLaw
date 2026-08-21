"""
Praxa HQ — Stripe Checkout via REST (stdlib only; no stripe pip package).

Gated by PRAXA_CHECKOUT_ENABLED=1. Catalog SSOT: scripts/praxa-stripe-setup.mjs
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Optional

STRIPE_API = "https://api.stripe.com/v1"

SKU_PREMIUM = "premium"
SKU_SECOND_OPINION = "second_opinion"
VALID_SKUS = {SKU_PREMIUM, SKU_SECOND_OPINION}

LOOKUP_PREMIUM = "praxa_premium_monthly"
LOOKUP_SECOND_OPINION = "praxa_second_opinion"

WEBHOOK_TOLERANCE_SEC = 300
_STATEMENT_SUFFIX = "PRAXA"

_price_cache: dict[str, str] = {}


def checkout_enabled() -> bool:
    return os.environ.get("PRAXA_CHECKOUT_ENABLED", "").strip() == "1"


def checkout_disabled_message() -> str:
    return (
        "Card checkout is disabled. Set PRAXA_CHECKOUT_ENABLED=1 and STRIPE_SECRET_KEY "
        "on the API host to enable Stripe Checkout."
    )


def _stripe_secret() -> str:
    key = (os.environ.get("STRIPE_SECRET_KEY") or "").strip()
    if not key:
        raise ValueError("STRIPE_SECRET_KEY is required when checkout is enabled")
    if not key.startswith(("sk_", "rk_")):
        raise ValueError("STRIPE_SECRET_KEY must be an sk_* or rk_* key")
    return key


def frontend_base_url() -> str:
    for env in ("PRAXA_FRONTEND_URL", "PRAXIUM_FRONTEND_URL"):
        raw = (os.environ.get(env) or "").strip().rstrip("/")
        if raw:
            return raw
    return "https://www.praxahq.com"


def _flatten_params(prefix: str, value: Any, out: list[tuple[str, str]]) -> None:
    if value is None:
        return
    if isinstance(value, dict):
        for k, v in value.items():
            key = f"{prefix}[{k}]" if prefix else str(k)
            _flatten_params(key, v, out)
        return
    if isinstance(value, list):
        for i, item in enumerate(value):
            _flatten_params(f"{prefix}[{i}]", item, out)
        return
    out.append((prefix, str(value)))


def _stripe_request(method: str, path: str, params: Optional[dict] = None) -> dict:
    secret = _stripe_secret()
    flat: list[tuple[str, str]] = []
    if params:
        for k, v in params.items():
            _flatten_params(k, v, flat)
    encoded = urllib.parse.urlencode(flat).encode("utf-8")
    url = f"{STRIPE_API}{path}"
    headers = {"Authorization": f"Bearer {secret}"}
    if method == "GET":
        if encoded:
            url = f"{url}?{encoded.decode()}"
        req = urllib.request.Request(url, method="GET", headers=headers)
    else:
        headers["Content-Type"] = "application/x-www-form-urlencoded"
        req = urllib.request.Request(url, data=encoded, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        try:
            err_json = json.loads(detail)
            msg = err_json.get("error", {}).get("message") or detail
        except json.JSONDecodeError:
            msg = detail or str(e)
        raise RuntimeError(f"Stripe API error ({e.code}): {msg}") from e
    return json.loads(body)


def resolve_price_id(sku: str) -> str:
    key = (sku or "").strip().lower()
    if key not in VALID_SKUS:
        raise ValueError(f"sku must be one of {sorted(VALID_SKUS)}")

    if key in _price_cache:
        return _price_cache[key]

    if key == SKU_PREMIUM:
        override = (os.environ.get("PRAXA_STRIPE_PRICE_PREMIUM") or "").strip()
        lookup = LOOKUP_PREMIUM
    else:
        override = (os.environ.get("PRAXA_STRIPE_PRICE_SECOND_OPINION") or "").strip()
        lookup = LOOKUP_SECOND_OPINION

    if override:
        _price_cache[key] = override
        return override

    resp = _stripe_request(
        "GET",
        "/prices",
        {"lookup_keys[]": lookup, "active": "true", "limit": 1},
    )
    rows = resp.get("data") or []
    if not rows:
        raise RuntimeError(f"No active Stripe price for lookup_key {lookup!r}")
    price_id = rows[0].get("id")
    if not price_id:
        raise RuntimeError(f"Stripe price row missing id for lookup_key {lookup!r}")
    _price_cache[key] = price_id
    return price_id


def create_checkout_session(
    user: dict,
    sku: str,
    success_url: str,
    cancel_url: str,
) -> dict:
    key = (sku or "").strip().lower()
    if key not in VALID_SKUS:
        raise ValueError(f"sku must be one of {sorted(VALID_SKUS)}")

    user_id = (user.get("id") or "").strip()
    email = (user.get("email") or "").strip()
    if not user_id:
        raise ValueError("user id required")

    price_id = resolve_price_id(key)
    metadata = {
        "product_line": "praxa_hq",
        "sku": key,
        "praxa_user_id": user_id,
        "email": email,
    }

    params: dict[str, Any] = {
        "mode": "subscription" if key == SKU_PREMIUM else "payment",
        "success_url": success_url,
        "cancel_url": cancel_url,
        "client_reference_id": user_id,
        "line_items[0][price]": price_id,
        "line_items[0][quantity]": 1,
        "metadata[product_line]": metadata["product_line"],
        "metadata[sku]": metadata["sku"],
        "metadata[praxa_user_id]": metadata["praxa_user_id"],
        "metadata[email]": metadata["email"],
    }
    if email:
        params["customer_email"] = email

    if key == SKU_PREMIUM:
        # Subscription Checkout rejects statement_descriptor_suffix on
        # subscription_data — descriptor is account / invoice level.
        params["subscription_data[metadata][product_line]"] = metadata["product_line"]
        params["subscription_data[metadata][sku]"] = metadata["sku"]
        params["subscription_data[metadata][praxa_user_id]"] = metadata["praxa_user_id"]
    else:
        params["payment_intent_data[metadata][product_line]"] = metadata["product_line"]
        params["payment_intent_data[metadata][sku]"] = metadata["sku"]
        params["payment_intent_data[metadata][praxa_user_id]"] = metadata["praxa_user_id"]
        params["payment_intent_data[statement_descriptor_suffix]"] = _STATEMENT_SUFFIX

    session = _stripe_request("POST", "/checkout/sessions", params)
    url = session.get("url")
    session_id = session.get("id")
    if not url or not session_id:
        raise RuntimeError("Stripe checkout session missing url or id")
    return {"url": url, "session_id": session_id}


def verify_and_parse_webhook(payload_bytes: bytes, stripe_signature_header: Optional[str]) -> dict:
    # Prefer Praxa-specific secret so EP's shared vault whsec is not reused.
    secret = (
        (os.environ.get("PRAXA_STRIPE_WEBHOOK_SECRET") or "").strip()
        or (os.environ.get("STRIPE_WEBHOOK_SECRET") or "").strip()
    )
    if not secret:
        raise ValueError(
            "PRAXA_STRIPE_WEBHOOK_SECRET (or STRIPE_WEBHOOK_SECRET) is not configured"
        )
    if not stripe_signature_header:
        raise ValueError("Missing Stripe-Signature header")

    parts: dict[str, str] = {}
    for chunk in stripe_signature_header.split(","):
        piece = chunk.strip()
        if "=" not in piece:
            continue
        k, _, v = piece.partition("=")
        parts[k.strip()] = v.strip()

    timestamp = parts.get("t")
    v1_sig = parts.get("v1")
    if not timestamp or not v1_sig:
        raise ValueError("Invalid Stripe-Signature header")

    try:
        ts = int(timestamp)
    except ValueError as e:
        raise ValueError("Invalid Stripe-Signature timestamp") from e

    if abs(time.time() - ts) > WEBHOOK_TOLERANCE_SEC:
        raise ValueError("Stripe webhook timestamp outside tolerance")

    signed_payload = f"{timestamp}.{payload_bytes.decode('utf-8')}"
    expected = hmac.new(secret.encode(), signed_payload.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, v1_sig):
        raise ValueError("Invalid webhook signature")

    try:
        return json.loads(payload_bytes)
    except json.JSONDecodeError as e:
        raise ValueError("Webhook payload is not valid JSON") from e


async def apply_checkout_completed(db: Any, session_obj: dict, now: str) -> dict:
    session_id = (session_obj.get("id") or "").strip()
    if not session_id:
        raise ValueError("checkout session missing id")

    existing = await db.praxa_stripe_events.find_one({"session_id": session_id}, {"_id": 0})
    if existing:
        return {"ok": True, "duplicate": True, "session_id": session_id, "applied": existing.get("applied")}

    metadata = session_obj.get("metadata") or {}
    sku = (metadata.get("sku") or "").strip().lower()
    user_id = (metadata.get("praxa_user_id") or session_obj.get("client_reference_id") or "").strip()
    if not user_id:
        raise ValueError("checkout session missing praxa_user_id")

    customer_id = session_obj.get("customer")
    subscription_id = session_obj.get("subscription")
    payment_intent = session_obj.get("payment_intent")
    amount_total = session_obj.get("amount_total")
    currency = (session_obj.get("currency") or "usd").lower()

    applied: dict[str, Any] = {"sku": sku, "user_id": user_id}

    if sku == SKU_PREMIUM:
        await db.praxa_users.update_one(
            {"id": user_id},
            {
                "$set": {
                    "plan": "premium",
                    "premium_unlocked_at": now,
                    "stripe_customer_id": customer_id,
                    "stripe_subscription_id": subscription_id,
                    "premium_source": "stripe_checkout",
                }
            },
        )
        applied["plan"] = "premium"
    elif sku == SKU_SECOND_OPINION:
        payment_doc = {
            "session_id": session_id,
            "user_id": user_id,
            "sku": sku,
            "amount_total": amount_total,
            "currency": currency,
            "stripe_customer_id": customer_id,
            "stripe_payment_intent_id": payment_intent,
            "status": "paid",
            "created_at": now,
            "email": metadata.get("email"),
        }
        await db.praxa_stripe_payments.update_one(
            {"session_id": session_id},
            {"$set": payment_doc},
            upsert=True,
        )
        open_req = await db.praxa_second_opinion.find_one(
            {"user_id": user_id, "status": "queued"},
            {"_id": 0},
            sort=[("created_at", -1)],
        )
        if open_req:
            await db.praxa_second_opinion.update_one(
                {"id": open_req["id"]},
                {
                    "$set": {
                        "status": "paid",
                        "paid_at": now,
                        "stripe_session_id": session_id,
                    }
                },
            )
            applied["second_opinion_id"] = open_req["id"]
        applied["payment_recorded"] = True
    else:
        raise ValueError(f"Unknown checkout sku in metadata: {sku!r}")

    event_doc = {
        "session_id": session_id,
        "event_type": "checkout.session.completed",
        "sku": sku,
        "user_id": user_id,
        "applied": applied,
        "created_at": now,
    }
    await db.praxa_stripe_events.insert_one(event_doc)
    event_doc.pop("_id", None)
    return {"ok": True, "duplicate": False, "session_id": session_id, "applied": applied}
