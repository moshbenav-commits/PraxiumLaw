#!/usr/bin/env node
/**
 * Step 2 — Dense frame extraction from quarantine videos into training-archive/.
 *
 *   node scripts/pi-case-os/filevine-extract-frames.mjs --slug=FILEVINE_-_Intake_606dc0bcc5c4
 *   node scripts/pi-case-os/filevine-extract-frames.mjs --pack=day1-filevine
 *   node scripts/pi-case-os/filevine-extract-frames.mjs --all-matched --interval=30
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  PACKS_DIR,
  TRANSCRIPTS_DIR,
  VIDEO_MAP_PATH,
  loadTranscriptMeta,
  quarantineDir,
  readJson,
  screenshotsDirForMeta,
  writeJson,
  ensureDir,
  PRAXIUM_ROOT,
} from './lib/paths.mjs';
import { bestMatch } from './lib/normalize-video-name.mjs';

function argValue(flag, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`${flag}=`));
  return hit ? hit.slice(flag.length + 1) : fallback;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

const intervalSec = Number(argValue('--interval', '30')) || 30;
const maxFrames = Number(argValue('--max-frames', '0')) || 0;
const slugArg = argValue('--slug', '');
const packArg = argValue('--pack', '');
const packsArg = argValue('--packs', '');
const dryRun = hasFlag('--dry-run');
const skipExisting = hasFlag('--skip-existing');
const force = hasFlag('--force');

function requireFfmpeg() {
  const r = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error('ffmpeg not found — install with: brew install ffmpeg');
    process.exit(1);
  }
}

function videoDurationSec(videoPath) {
  const out = execFileSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      videoPath,
    ],
    { encoding: 'utf8' },
  ).trim();
  return Number(out) || 0;
}

function resolveVideoPath(slug, videoMap) {
  const meta = loadTranscriptMeta(slug);

  const fromMap = videoMap?.matched?.find((m) => m.slug === slug);
  if (fromMap && fs.existsSync(fromMap.quarantinePath)) {
    return fromMap.quarantinePath;
  }

  if (meta?.sourceVideo && fs.existsSync(meta.sourceVideo)) {
    return meta.sourceVideo;
  }

  if (!meta) return null;

  const quarantine = quarantineDir();
  if (!fs.existsSync(quarantine)) return null;

  const exact = path.join(quarantine, meta.filename);
  if (fs.existsSync(exact)) return exact;

  const files = fs.readdirSync(quarantine).filter((f) => /\.(mp4|mov|m4v)$/i.test(f));
  const hit = bestMatch(meta.filename, files.map((f) => ({ filename: f })));
  if (hit) return path.join(quarantine, hit.filename);

  return null;
}

function loadPackSlugs(packId) {
  const packPath = path.join(PACKS_DIR, `${packId}.json`);
  const pack = readJson(packPath);
  if (!pack?.slugs?.length) {
    console.error(`Pack not found or empty: ${packPath}`);
    process.exit(1);
  }
  return pack.slugs;
}

function loadSlugsToProcess(videoMap) {
  if (slugArg) return [slugArg];
  if (packArg) return loadPackSlugs(packArg);
  if (packsArg) {
    const ids = packsArg.split(',').map((s) => s.trim()).filter(Boolean);
    return [...new Set(ids.flatMap(loadPackSlugs))];
  }
  if (hasFlag('--all-packs')) {
    const ids = fs
      .readdirSync(PACKS_DIR)
      .filter((f) => f.endsWith('.json') && f !== 'filevine-all-remaining.json')
      .map((f) => f.replace(/\.json$/, ''));
    return [...new Set(ids.flatMap(loadPackSlugs))];
  }
  if (hasFlag('--all-matched')) {
    return (videoMap.matched || []).map((m) => m.slug);
  }
  console.error('Pass --slug=, --pack=, --packs=, --all-packs, or --all-matched');
  process.exit(1);
}

function alreadyExtracted(slug) {
  if (force) return false;
  const meta = loadTranscriptMeta(slug);
  if (!meta) return false;
  const outDir = screenshotsDirForMeta(meta);
  const manifestPath = path.join(outDir, 'frame-manifest.json');
  if (!fs.existsSync(manifestPath)) return false;
  const manifest = readJson(manifestPath);
  return (
    skipExisting &&
    manifest?.intervalSec === intervalSec &&
    (manifest?.frameCount || 0) >= 10
  );
}

function extractFrames(slug, videoPath) {
  const meta = loadTranscriptMeta(slug);
  if (!meta) {
    console.warn(`Skip ${slug}: no meta.json`);
    return null;
  }

  const outDir = screenshotsDirForMeta(meta);
  const duration = videoDurationSec(videoPath);
  const estimated = Math.max(1, Math.ceil(duration / intervalSec));
  const frameLimit = maxFrames > 0 ? maxFrames : estimated;

  console.log(`\n→ ${slug}`);
  console.log(`  video: ${videoPath}`);
  console.log(`  duration: ${Math.round(duration)}s · interval: ${intervalSec}s · ~${frameLimit} frames`);
  console.log(`  out: ${outDir}`);

  if (dryRun) {
    return { slug, frameCount: frameLimit, outDir, dryRun: true };
  }

  ensureDir(outDir);

  // Clear prior sparse frames
  for (const f of fs.readdirSync(outDir)) {
    if (/^frame_\d+\.jpg$/i.test(f)) fs.unlinkSync(path.join(outDir, f));
  }

  execFileSync(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-i',
      videoPath,
      '-vf',
      `fps=1/${intervalSec}`,
      '-frames:v',
      String(frameLimit),
      path.join(outDir, 'frame_%03d.jpg'),
    ],
    { stdio: 'inherit' },
  );

  const frames = fs
    .readdirSync(outDir)
    .filter((f) => /^frame_\d+\.jpg$/i.test(f))
    .sort();

  const manifest = {
    slug,
    title: meta.title,
    videoPath,
    extractedAt: new Date().toISOString(),
    intervalSec,
    durationSec: duration,
    frameCount: frames.length,
    frames: frames.map((filename, index) => ({
      filename,
      timestampSec: Math.round(index * intervalSec),
      labeled: false,
      filevineTab: null,
      filevineSection: null,
      functionId: null,
      praxiumTab: null,
      status: 'unreviewed',
    })),
  };

  writeJson(path.join(outDir, 'frame-manifest.json'), manifest);

  const transcriptMetaPath = path.join(TRANSCRIPTS_DIR, slug, 'meta.json');
  const updatedMeta = {
    ...meta,
    frameCount: frames.length,
    intervalSec,
    frames: frames.map((f) => f),
    videoQuarantinePath: videoPath,
    framesExtractedAt: manifest.extractedAt,
    frameManifest: path.relative(PRAXIUM_ROOT, path.join(outDir, 'frame-manifest.json')),
  };
  fs.writeFileSync(transcriptMetaPath, `${JSON.stringify(updatedMeta, null, 2)}\n`);

  return manifest;
}

requireFfmpeg();

const videoMap = readJson(VIDEO_MAP_PATH);
if (!videoMap && !slugArg) {
  console.error(`Run filevine-video-map.mjs first (missing ${VIDEO_MAP_PATH})`);
  process.exit(1);
}

const slugs = loadSlugsToProcess(videoMap);
const results = [];

let skipped = 0;
for (const slug of slugs) {
  if (alreadyExtracted(slug)) {
    console.log(`\n↷ ${slug} (skip-existing)`);
    skipped += 1;
    continue;
  }
  const videoPath = resolveVideoPath(slug, videoMap);
  if (!videoPath) {
    console.warn(`Skip ${slug}: no video in quarantine`);
    continue;
  }
  results.push(extractFrames(slug, videoPath));
}

const ok = results.filter(Boolean).length;
console.log(`\nDone — extracted ${ok} video(s), skipped ${skipped}, total queued ${slugs.length}.`);
