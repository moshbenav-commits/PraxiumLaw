import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PRAXIUM_ROOT = path.resolve(__dirname, '../../..');
export const TRANSCRIPTS_DIR = path.join(
  PRAXIUM_ROOT,
  'docs/pi-case-os/sources/transcripts',
);
export const TRAINING_ARCHIVE_DIR = path.join(PRAXIUM_ROOT, 'training-archive');
export const WIRING_REGISTRY_PATH = path.join(
  PRAXIUM_ROOT,
  'docs/pi-case-os/filevine-ui-wiring.json',
);
export const VIDEO_MAP_PATH = path.join(
  PRAXIUM_ROOT,
  'docs/pi-case-os/filevine-video-map.json',
);
export const PACKS_DIR = path.join(PRAXIUM_ROOT, 'docs/pi-case-os/packs');

export const DEFAULT_QUARANTINE_DIR = path.join(
  process.env.HOME || '',
  'Desktop/CPP Training - Video Quarantine',
);

export function quarantineDir() {
  return process.env.PI_VIDEO_QUARANTINE || DEFAULT_QUARANTINE_DIR;
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

export function listTranscriptSlugs() {
  if (!fs.existsSync(TRANSCRIPTS_DIR)) return [];
  return fs
    .readdirSync(TRANSCRIPTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => fs.existsSync(path.join(TRANSCRIPTS_DIR, name, 'meta.json')));
}

export function loadTranscriptMeta(slug) {
  const metaPath = path.join(TRANSCRIPTS_DIR, slug, 'meta.json');
  if (!fs.existsSync(metaPath)) return null;
  return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
}

export function screenshotsDirForMeta(meta) {
  const rel = meta.screenshotsDir || `training-archive/van-law-the case system/${meta.slug}/screenshots`;
  return path.join(PRAXIUM_ROOT, rel);
}
