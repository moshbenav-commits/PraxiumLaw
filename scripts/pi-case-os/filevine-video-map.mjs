#!/usr/bin/env node
/**
 * Step 1 — Map quarantine video files ↔ transcript slugs.
 *
 *   node scripts/pi-case-os/filevine-video-map.mjs
 *   node scripts/pi-case-os/filevine-video-map.mjs --quarantine="~/Desktop/..."
 *   node scripts/pi-case-os/filevine-video-map.mjs --filter=filevine
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  VIDEO_MAP_PATH,
  listTranscriptSlugs,
  loadTranscriptMeta,
  quarantineDir,
  writeJson,
} from './lib/paths.mjs';
import { bestMatch, normalizeVideoName } from './lib/normalize-video-name.mjs';

function argValue(flag, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`${flag}=`));
  return hit ? hit.slice(flag.length + 1) : fallback;
}

const filter = argValue('--filter', '').toLowerCase();
const quarantine = argValue('--quarantine', quarantineDir());

if (!fs.existsSync(quarantine)) {
  console.error(`Quarantine folder not found: ${quarantine}`);
  console.error('Set PI_VIDEO_QUARANTINE or pass --quarantine=');
  process.exit(1);
}

const slugs = listTranscriptSlugs();
const transcriptIndex = slugs.map((slug) => {
  const meta = loadTranscriptMeta(slug);
  return {
    slug,
    filename: meta.filename,
    title: meta.title,
    category: meta.category,
  };
});

const videoExts = new Set(['.mp4', '.mov', '.m4v', '.MP4', '.MOV']);
const quarantineFiles = fs
  .readdirSync(quarantine)
  .filter((f) => videoExts.has(path.extname(f)))
  .sort();

const matched = [];
const unmatchedQuarantine = [];
const slugToVideo = new Map();

for (const file of quarantineFiles) {
  if (filter) {
    const norm = normalizeVideoName(file);
    if (!norm.includes(filter.replace(/\s+/g, ' '))) continue;
  }

  const hit = bestMatch(file, transcriptIndex);
  if (hit) {
    matched.push({
      quarantineFile: file,
      quarantinePath: path.join(quarantine, file),
      slug: hit.slug,
      transcriptFilename: hit.filename,
      score: hit.score,
      matchKind: hit.matchKind,
    });
    slugToVideo.set(hit.slug, path.join(quarantine, file));
  } else {
    unmatchedQuarantine.push(file);
  }
}

const unmatchedSlugs = transcriptIndex
  .filter((t) => !slugToVideo.has(t.slug))
  .filter((t) => {
    if (!filter) return true;
    const blob = `${t.slug} ${t.filename} ${t.title}`.toLowerCase();
    return blob.includes(filter);
  })
  .map((t) => ({ slug: t.slug, filename: t.filename }));

const report = {
  generatedAt: new Date().toISOString(),
  quarantineDir: quarantine,
  filter: filter || null,
  counts: {
    quarantineVideos: quarantineFiles.length,
    matched: matched.length,
    unmatchedQuarantine: unmatchedQuarantine.length,
    unmatchedTranscriptSlugs: unmatchedSlugs.length,
  },
  matched,
  unmatchedQuarantine,
  unmatchedTranscriptSlugs: unmatchedSlugs,
};

writeJson(VIDEO_MAP_PATH, report);

console.log(`Wrote ${VIDEO_MAP_PATH}`);
console.log(
  `Matched ${matched.length} videos (${unmatchedQuarantine.length} quarantine orphans, ${unmatchedSlugs.length} transcript slugs without video)`,
);

if (matched.length) {
  console.log('\nSample matches:');
  for (const row of matched.slice(0, 8)) {
    console.log(`  ${row.quarantineFile} → ${row.slug} (${row.matchKind}, ${row.score.toFixed(2)})`);
  }
}
