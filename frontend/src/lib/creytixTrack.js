/**
 * Creytix Analytics — first-party beacon client, adapted from the SSOT
 * template (packages/creytix-analytics-lite/templates/creytix-track.ts at
 * the workspace root) for this app's stack: a Vite/React Router SPA with a
 * separate-origin FastAPI backend (REACT_APP_BACKEND_URL), rather than a
 * Next.js same-origin /api route.
 *
 * Cookieless: visitor id is a random localStorage id, never a cookie. Honors
 * Do-Not-Track/GPC. Page views count on every route change (React Router
 * BrowserRouter doesn't reload the page, so this listens for popstate +
 * patches pushState/replaceState the same way the Next.js template does for
 * plain History API navigation).
 */

const SITE = "praxiumlaw";
const BACKEND_URL = import.meta.env.REACT_APP_BACKEND_URL || "";
const ENDPOINT = `${BACKEND_URL}/api/track`;
const VISITOR_KEY = "cx-visitor";

function privacySignalsBlock() {
  if (typeof navigator === "undefined") return true;
  return navigator.doNotTrack === "1" || navigator.globalPrivacyControl === true;
}

function visitorId() {
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    return "no-storage";
  }
}

function send(payload) {
  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: "application/json" }))) return;
    void fetch(ENDPOINT, { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
  } catch {
    /* analytics must never break the page */
  }
}

function trackPageView(path) {
  if (typeof window === "undefined" || !BACKEND_URL || privacySignalsBlock()) return;
  send({
    site: SITE,
    event: "page_view",
    path: path ?? window.location.pathname,
    visitorId: visitorId(),
    referrer: document.referrer || undefined,
    at: Date.now(),
  });
}

/** Boot: first view + SPA navigations (History API patch, popstate). Idempotent. */
export function initCreytixTrack() {
  if (typeof window === "undefined") return;
  if (window.__cxTrackBooted) return;
  window.__cxTrackBooted = true;
  trackPageView();
  const emit = () => trackPageView();
  const { pushState, replaceState } = window.history;
  window.history.pushState = function (...args) {
    pushState.apply(this, args);
    emit();
  };
  window.history.replaceState = function (...args) {
    replaceState.apply(this, args);
    emit();
  };
  window.addEventListener("popstate", emit);
}
