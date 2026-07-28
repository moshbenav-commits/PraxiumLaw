// Lead-attribution capture (Q1-C2). First-touch UTM/click-id data is captured
// once per browser and persisted to localStorage so it survives across pages
// up to and including the intake form submission — even if the visitor lands
// on a UTM-tagged page and only fills out the form days later.
const STORAGE_KEY = "praxium-attribution-v1";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"];
const MAX_LEN = 300;

function trunc(v) {
  if (typeof v !== "string") return v;
  return v.trim().slice(0, MAX_LEN);
}

function readStored() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStored(data) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable (private mode/quota) — attribution capture is best-effort
  }
}

function utmsFromSearch(search) {
  const params = new URLSearchParams(search || "");
  const out = {};
  for (const key of UTM_KEYS) {
    const v = params.get(key);
    if (v) out[key] = v;
  }
  return out;
}

function hasAnyUtm(obj) {
  return UTM_KEYS.some((k) => obj && obj[k]);
}

/**
 * Capture first-touch attribution once per browser. Safe to call on every
 * app mount — it is a no-op after the first landing unless the stored entry
 * has no UTMs and the current URL introduces some (late-arriving campaign
 * click on an already-visited browser), in which case they are merged in
 * while keeping the original landing_page/first_touch_at.
 */
export function recordFirstTouch() {
  if (typeof window === "undefined") return;
  const currentUtms = utmsFromSearch(window.location.search);
  const existing = readStored();

  if (!existing) {
    writeStored({
      landing_page: trunc(window.location.pathname + window.location.search),
      referrer: trunc(document.referrer || ""),
      first_touch_at: new Date().toISOString(),
      ...currentUtms,
    });
    return;
  }

  if (!hasAnyUtm(existing) && hasAnyUtm(currentUtms)) {
    writeStored({ ...existing, ...currentUtms });
  }
}

/**
 * Returns the stored first-touch attribution (if any) plus the given
 * source_page, with every value trimmed/truncated to 300 chars — ready to
 * spread into an intake submission payload.
 */
export function getAttribution(sourcePage) {
  const stored = readStored() || {};
  const merged = { ...stored, source_page: sourcePage };
  const out = {};
  for (const [key, value] of Object.entries(merged)) {
    out[key] = trunc(value);
  }
  return out;
}
