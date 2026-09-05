/**
 * Host-based redirects — parity with the vercel.json "redirects" block.
 *
 * Pages `_redirects` matches on PATH only, so the three host-conditional rules
 * this project relied on cannot live there. They run here instead:
 *
 *   praxiumsuite.com      → https://www.praxiumlaw.com  (permanent, whole site)
 *   praxahq.com  /        → /praxa                      (temporary, root only)
 *   admin.praxiumlaw.com  → /login                      (temporary, root only)
 *
 * Every other request falls straight through to the static asset handler.
 */

const SITE_REDIRECTS = {
  'praxiumsuite.com': 'https://www.praxiumlaw.com',
  'www.praxiumsuite.com': 'https://www.praxiumlaw.com',
};

const ROOT_REDIRECTS = {
  'praxahq.com': '/praxa',
  'www.praxahq.com': '/praxa',
  'admin.praxiumlaw.com': '/login',
};

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const host = url.hostname.toLowerCase();

  const site = SITE_REDIRECTS[host];
  if (site) {
    return Response.redirect(`${site}${url.pathname}${url.search}`, 301);
  }

  const root = ROOT_REDIRECTS[host];
  if (root && url.pathname === '/') {
    return Response.redirect(new URL(`${root}${url.search}`, url).toString(), 302);
  }

  return context.next();
}
