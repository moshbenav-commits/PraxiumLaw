/**
 * Normalize training video filenames for fuzzy match between quarantine
 * folder names and transcript meta.json `filename` values.
 */
export function normalizeVideoName(name) {
  let s = String(name || '')
    .replace(/\.(mp4|mov|MP4|MOV|m4v)$/i, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/\bthe case system\b/g, 'filevine')
    .replace(/\bfilevine\b/g, 'filevine')
    .replace(/^\d+\.\s*/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  return s;
}

/** Token-set similarity — good enough for ~350 local filenames. */
export function tokenSimilarity(a, b) {
  const ta = new Set(normalizeVideoName(a).split(' ').filter(Boolean));
  const tb = new Set(normalizeVideoName(b).split(' ').filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) {
    if (tb.has(t)) inter += 1;
  }
  return inter / Math.max(ta.size, tb.size);
}

export function bestMatch(quarantineName, candidates) {
  let best = null;
  let bestScore = 0;
  const qNorm = normalizeVideoName(quarantineName);

  for (const c of candidates) {
    const cNorm = normalizeVideoName(c.filename || c.title || '');
    if (qNorm === cNorm) {
      return { ...c, score: 1, matchKind: 'exact' };
    }
    const score = tokenSimilarity(quarantineName, c.filename || c.title || '');
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }

  if (best && bestScore >= 0.72) {
    return { ...best, score: bestScore, matchKind: 'fuzzy' };
  }
  return null;
}
