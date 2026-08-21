# Praxa HQ — Stripe Checkout

Card billing is **off by default**. Enable only when `STRIPE_SECRET_KEY` and webhook secret are set on the API host.

## Catalog (shared Expedia Solutions Stripe account)

| SKU | Product | Price ID | lookup_key | Amount |
|-----|---------|----------|------------|--------|
| `premium` | `prod_V6vYiUIgO9q9MO` | `price_1U6hhoHWiwLnRBZ8khY7BvXY` | `praxa_premium_monthly` | $9.99/mo |
| `second_opinion` | `prod_V6vYyVUHvffOk0` | `price_1U6hhpHWiwLnRBZ8okOAXF6I` | `praxa_second_opinion` | $99 one-time |

Recreate or verify catalog (workspace root):

```bash
cd "/Users/ricardo/Expedia Solutions" && npm run praxa:stripe:setup -- --from-vault
```

## Environment variables (API / Vultr)

| Variable | Required | Notes |
|----------|----------|-------|
| `PRAXA_CHECKOUT_ENABLED` | To charge | Must be exactly `1` or checkout routes return **503** |
| `STRIPE_SECRET_KEY` | When enabled | `sk_*` or `rk_*` (test or live) |
| `STRIPE_WEBHOOK_SECRET` | Webhook | From Stripe Dashboard → Webhooks → signing secret (`whsec_*`) |
| `PRAXA_STRIPE_PRICE_PREMIUM` | Optional | Override price id (else lookup `praxa_premium_monthly`) |
| `PRAXA_STRIPE_PRICE_SECOND_OPINION` | Optional | Override price id (else lookup `praxa_second_opinion`) |
| `PRAXA_FRONTEND_URL` | Optional | Success/cancel redirect base (else `PRAXIUM_FRONTEND_URL` or `https://www.praxahq.com`) |

**Do not** set `PRAXA_CHECKOUT_ENABLED=1` until webhook + keys are configured on production.

## Stripe Dashboard — webhook endpoint

- **URL:** `https://api.praxiumlaw.com/api/praxa/stripe/webhook`
- **Events:** `checkout.session.completed` (minimum)
- **Auth:** none (signature verified via `Stripe-Signature` header)

Routes are mounted under `/api` in `backend/server.py`.

## API routes

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/praxa/checkout` | Bearer Praxa JWT — body `{ "sku": "premium" \| "second_opinion" }` → `{ url, session_id }` |
| `POST` | `/api/praxa/stripe/webhook` | Stripe signature only |

## Enable checkout (production)

1. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` on the API host (vault / env).
2. Register webhook URL in Stripe Dashboard (above).
3. Set `PRAXA_CHECKOUT_ENABLED=1` on the API host and redeploy.
4. Confirm `/praxa/me` returns `entitlements.card_checkout: true`.
5. Test with Stripe test mode before live keys.

## Local tests

```bash
cd PraxiumLaw && python3 -m py_compile backend/praxa_stripe.py backend/praxa_product.py
python3 backend/tests/test_praxa_stripe.py
```
