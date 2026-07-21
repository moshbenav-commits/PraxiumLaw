/**
 * Site-wide password gate for praxiumlaw.com (and shared domains on this Vercel project).
 *
 * Set in Vercel production env:
 *   SITE_LOCK_PASSWORD  — password visitors enter
 *   SITE_LOCK_SECRET    — random token stored in cookie after unlock
 *
 * Leave SITE_LOCK_PASSWORD empty to disable the gate (local dev / public launch).
 */
import { next } from '@vercel/functions';

const COOKIE_NAME = 'praxium_site_unlock';

function lockPageHtml(errorMessage = '') {
  const errorBlock = errorMessage
    ? `<p class="error" role="alert">${errorMessage}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Praxium — Private preview</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: linear-gradient(160deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
      color: #e2e8f0;
      padding: 1.5rem;
    }
    .card {
      width: 100%;
      max-width: 24rem;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 1rem;
      padding: 2rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.45);
    }
    h1 {
      font-size: 1.25rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      margin-bottom: 0.5rem;
    }
    p.sub {
      font-size: 0.875rem;
      color: #94a3b8;
      margin-bottom: 1.5rem;
      line-height: 1.5;
    }
    label {
      display: block;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
      margin-bottom: 0.5rem;
    }
    input {
      width: 100%;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      border: 1px solid rgba(148, 163, 184, 0.3);
      background: #0f172a;
      color: #f8fafc;
      font-size: 1rem;
      margin-bottom: 1rem;
    }
    input:focus {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
      border-color: #3b82f6;
    }
    button {
      width: 100%;
      padding: 0.75rem 1rem;
      border: none;
      border-radius: 0.5rem;
      background: #2563eb;
      color: #fff;
      font-size: 0.9375rem;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover { background: #1d4ed8; }
    button:disabled { opacity: 0.6; cursor: wait; }
    .error {
      font-size: 0.875rem;
      color: #fca5a5;
      margin-bottom: 1rem;
      padding: 0.625rem 0.75rem;
      background: rgba(239, 68, 68, 0.12);
      border-radius: 0.5rem;
      border: 1px solid rgba(239, 68, 68, 0.25);
    }
  </style>
</head>
<body>
  <main class="card">
    <h1>Private preview</h1>
    <p class="sub">This site is password protected. Enter the access password to continue.</p>
    ${errorBlock}
    <form id="unlock-form" method="post" action="/api/site-unlock">
      <label for="password">Access password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required autofocus />
      <button type="submit" id="submit-btn">Continue</button>
    </form>
  </main>
  <script>
    document.getElementById('unlock-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var btn = document.getElementById('submit-btn');
      var password = document.getElementById('password').value;
      btn.disabled = true;
      btn.textContent = 'Checking…';
      try {
        var res = await fetch('/api/site-unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: password })
        });
        if (res.ok) {
          window.location.reload();
          return;
        }
        var data = await res.json().catch(function () { return {}; });
        window.location.href = '/?lock_error=1';
      } catch (err) {
        window.location.href = '/?lock_error=1';
      }
    });
  </script>
</body>
</html>`;
}

function getCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}

// Paths that must always work regardless of the landing-page lock:
// essence/asset URLs the HF prompt system depends on, the actual product
// (login/signup/portal/praxa), and the unlock API itself.
const ALWAYS_OPEN_PREFIXES = [
  '/api/site-unlock',
  '/higgsfield/',
  '/static/',
  '/login',
  '/signup',
  '/portal',
  '/praxa',
  '/accept-invite',
  '/forgot-password',
  '/reset-password',
  '/upload/',
  '/sign/',
  '/verify-identity/',
];

function isAlwaysOpen(pathname) {
  return ALWAYS_OPEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

export default function middleware(request) {
  const password = process.env.SITE_LOCK_PASSWORD;
  const secret = process.env.SITE_LOCK_SECRET;

  if (!password || !secret) {
    return next();
  }

  const url = new URL(request.url);

  // admin.praxiumlaw.com goes straight through (redirected to /login by vercel.json) — never gated.
  const host = request.headers.get('host') || '';
  if (host.startsWith('admin.')) {
    return next();
  }

  if (isAlwaysOpen(url.pathname)) {
    return next();
  }

  const cookie = getCookie(request, COOKIE_NAME);
  if (cookie === secret) {
    return next();
  }

  const lockError = url.searchParams.get('lock_error') === '1';
  return new Response(lockPageHtml(lockError ? 'Incorrect password. Try again.' : ''), {
    status: 401,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export const config = {
  matcher: ['/((?!api/site-unlock).*)'],
};
