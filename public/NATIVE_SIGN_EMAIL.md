# NativeSign — customer email setup

NativeSign sends **sign-request emails** via [Resend](https://resend.com) when staff creates an envelope (`POST /matters/{id}/sign-requests`) or clicks **Resend email** on `/esign`.

## Env vars (backend)

| Variable | Required | Notes |
|----------|----------|-------|
| `RESEND_API_KEY` | Prod | Without it, emails are skipped (logged only) |
| `PRAXIUM_EMAIL_FROM` | Prod | Verified sender in Resend, e.g. `Acme Law <sign@yourfirm.com>` |
| `PRAXIUM_FRONTEND_URL` | Yes | Public app URL — sign links are `{FRONTEND}/sign/{token}` |
| `PRAXIUM_SIGN_LINK_TTL_DAYS` | Optional | Default `14` |
| `PRAXIUM_PORTAL_DEV_RETURN_LINK` | Dev only | `true` → API returns `dev_sign_url` + UI copies link |

See `PraxiumLaw/backend/env.local.example`.

## Email template

- **Subject:** `{firm_name} — please sign: {document_title}`
- **CTA:** Review and sign (mobile-friendly button, 44px+ tap target in HTML)
- **Body:** firm name, document title, matter label, expiry date, plain URL fallback
- **Audit:** `esign.invite_sent` (create + resend)

## Client paths

| Surface | Behavior |
|---------|----------|
| Email link | `/sign/:token` — mobile PDF + sticky signature pad |
| Client portal | Matter detail banner → **Sign document** when pending envelope matches client email |

## Resend checklist (production)

1. Verify domain in Resend dashboard
2. Set `PRAXIUM_EMAIL_FROM` to that domain
3. Set `RESEND_API_KEY` on Vercel backend
4. Set `PRAXIUM_FRONTEND_URL=https://your-app.vercel.app` (or custom domain)
5. **Disable** `PRAXIUM_PORTAL_DEV_RETURN_LINK` in production
6. Send test envelope from `/esign` or matter **Request signature**

## Code

- `backend/email_util.py` — `send_esign_invite_email`, `esign_invite_email_content`
- `backend/esign.py` — create, resend (`POST /sign-requests/{id}/resend`)
- `backend/portal.py` — `GET /portal/matters/{id}/sign-requests`
