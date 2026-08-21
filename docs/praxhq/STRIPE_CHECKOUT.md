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
| `PRAXA_STRIPE_WEBHOOK_SECRET` | Webhook (preferred) | Signing secret for the Praxa endpoint only (`whsec_*`) |
| `STRIPE_WEBHOOK_SECRET` | Webhook fallback | Shared vault secret — prefer `PRAXA_STRIPE_WEBHOOK_SECRET` so EP's webhook is not reused |
| `PRAXA_STRIPE_PRICE_PREMIUM` | Optional | Override price id (else lookup `praxa_premium_monthly`) |
| `PRAXA_STRIPE_PRICE_SECOND_OPINION` | Optional | Override price id (else lookup `praxa_second_opinion`) |
| `PRAXA_FRONTEND_URL` | Optional | Success/cancel redirect base (else `PRAXIUM_FRONTEND_URL` or `https://www.praxahq.com`) |

## Stripe Dashboard — webhook endpoint

- **URL:** `https://api.praxiumlaw.com/api/praxa/stripe/webhook`
- **Events:** `checkout.session.completed` (minimum)
- **Auth:** none (signature verified via `Stripe-Signature` header)
- **Endpoint id (live):** `we_1U6hyqHWiwLnRBZ8h5yVogUy`

Routes are mounted under `/api` in `backend/server.py`.

## API routes

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/praxa/checkout` | Bearer Praxa JWT — body `{ "sku": "premium" \| "second_opinion" }` → `{ url, session_id }` |
| `POST` | `/api/praxa/stripe/webhook` | Stripe signature only |

## Production status (2026-08-21)

| Item | Status |
|------|--------|
| Catalog prices | Live on shared Expedia Solutions Stripe account |
| Webhook endpoint | Created + `PRAXA_STRIPE_WEBHOOK_SECRET` on `praxiumlaw-back` |
| `STRIPE_SECRET_KEY` | Set on `praxiumlaw-back` (live `rk_`/`sk_`) |
| `PRAXA_CHECKOUT_ENABLED` | **`1`** — card checkout is live |
| Consumer CTAs | Account / Estimate → Premium $9.99/mo · Opinion → $99 second opinion |

**Smoke:** unauthenticated `POST /api/praxa/checkout` should return **401** (not 503). Signed-in Account shows **Subscribe Premium**. First real charge uses **live** Stripe — prefer vault `sk_test_` for sandbox smokes with card `4242`.

## Local tests

```bash
cd PraxiumLaw && python3 -m py_compile backend/praxa_stripe.py backend/praxa_product.py
python3 backend/tests/test_praxa_stripe.py
```
