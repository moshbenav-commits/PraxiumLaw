#!/usr/bin/env node
/**
 * Step 4 — Apply a wiring sheet to frame-manifest + filevine-ui-wiring.json
 *
 *   node scripts/pi-case-os/filevine-apply-wiring-sheet.mjs --slug=FILEVINE_-_Intake_606dc0bcc5c4
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  WIRING_REGISTRY_PATH,
  loadTranscriptMeta,
  readJson,
  screenshotsDirForMeta,
  writeJson,
  PRAXIUM_ROOT,
} from './lib/paths.mjs';

function argValue(flag, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`${flag}=`));
  return hit ? hit.slice(flag.length + 1) : fallback;
}

const slug = argValue('--slug', '');
if (!slug) {
  console.error('Pass --slug=');
  process.exit(1);
}

const sheetPath = path.join(PRAXIUM_ROOT, 'docs/pi-case-os/wiring-sheets', `${slug}.json`);
if (!fs.existsSync(sheetPath)) {
  console.error(`Wiring sheet not found: ${sheetPath}`);
  process.exit(1);
}

const sheet = readJson(sheetPath);
const meta = loadTranscriptMeta(slug);
if (!meta) {
  console.error(`No meta.json for slug ${slug}`);
  process.exit(1);
}

const outDir = screenshotsDirForMeta(meta);
const manifestPath = path.join(outDir, 'frame-manifest.json');
const manifest = readJson(manifestPath);
if (!manifest) {
  console.error(`No frame-manifest.json — run extract first: ${manifestPath}`);
  process.exit(1);
}

const fnByFrame = new Map(sheet.functions.map((f) => [f.frame, f]));

for (const frame of manifest.frames) {
  const fn = fnByFrame.get(frame.filename);
  if (!fn) continue;
  frame.labeled = true;
  frame.filevineTab = fn.filevineTab;
  frame.filevineSection = fn.filevineSection || fn.filevineSurface || null;
  frame.functionId = fn.id;
  frame.praxiumTab = fn.praxiumTab || null;
  frame.praxiumRoute = fn.praxiumRoute || null;
  frame.status = fn.status;
  frame.transcriptQuote = fn.transcriptQuote || null;
}

manifest.wiringSheet = path.relative(PRAXIUM_ROOT, sheetPath);
manifest.labeledFrameCount = manifest.frames.filter((f) => f.labeled).length;
manifest.labeledAt = sheet.labeledAt;

writeJson(manifestPath, manifest);

const registry = readJson(WIRING_REGISTRY_PATH, { version: 1, tabs: {}, videos: {} });
registry.videos[slug] = {
  ...(registry.videos[slug] || {}),
  title: sheet.title,
  wiringSheet: path.relative(PRAXIUM_ROOT, sheetPath),
  wiringLabeledAt: sheet.labeledAt,
  matterShell: sheet.matterShell,
  functions: sheet.functions,
  labeledFrameCount: sheet.labeledFrames.length,
  captureStatus: 'wiring_labeled',
};

registry.matterShell = registry.matterShell || sheet.matterShell;
registry.updatedAt = new Date().toISOString();

const statusCounts = { done: 0, partial: 0, missing: 0 };
for (const fn of sheet.functions) {
  statusCounts[fn.status] = (statusCounts[fn.status] || 0) + 1;
}
registry.videos[slug].wiringSummary = statusCounts;

writeJson(WIRING_REGISTRY_PATH, registry);

console.log(`Applied wiring sheet for ${slug}`);
console.log(`  Labeled ${manifest.labeledFrameCount} / ${manifest.frameCount} frames`);
console.log(`  Functions: ${sheet.functions.length} (${statusCounts.partial} partial, ${statusCounts.missing} missing)`);
