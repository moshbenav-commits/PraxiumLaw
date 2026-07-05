#!/usr/bin/env node
/**
 * Step 3 — Seed wiring registry from transcript tab/UI mentions.
 *
 *   node scripts/pi-case-os/filevine-wiring-seed.mjs
 *   node scripts/pi-case-os/filevine-wiring-seed.mjs --slug=FILEVINE_-_Intake_606dc0bcc5c4
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  TRANSCRIPTS_DIR,
  WIRING_REGISTRY_PATH,
  listTranscriptSlugs,
  loadTranscriptMeta,
  readJson,
  writeJson,
  PRAXIUM_ROOT,
} from './lib/paths.mjs';

const TAB_PATTERNS = [
  { id: 'feed', re: /\b(feed|task feed|activity feed)\b/gi, filevineTab: 'Feed', praxiumRoute: '/inbox' },
  { id: 'intake', re: /\bintake tab\b/gi, filevineTab: 'Intake', praxiumTab: 'intake' },
  { id: 'treatment', re: /\btreatment tab\b/gi, filevineTab: 'Treatment', praxiumTab: 'medical' },
  { id: 'insurance', re: /\binsurance tab\b/gi, filevineTab: 'Insurance', praxiumTab: 'insurance' },
  { id: 'auto', re: /\bauto tab\b/gi, filevineTab: 'Auto', praxiumTab: 'pd' },
  { id: 'health', re: /\bhealth tab\b/gi, filevineTab: 'Health', praxiumTab: 'subrogation' },
  { id: 'meds', re: /\bmeds tab\b/gi, filevineTab: 'Meds', praxiumTab: 'medical' },
  { id: 'activity', re: /\bactivity tab\b/gi, filevineTab: 'Activity', praxiumTab: 'notes' },
  { id: 'team', re: /\bteam tab\b/gi, filevineTab: 'Team', praxiumTab: 'intake' },
  { id: 'docs', re: /\bdocs tab\b/gi, filevineTab: 'Docs', praxiumTab: 'documents' },
  { id: 'taskflow', re: /\btaskflow\b/gi, filevineTab: 'Taskflow', praxiumRoute: '/tasks' },
  { id: 'docgen', re: /\b(doc gen|docgen|doc gen)\b/gi, filevineTab: 'DocGen', praxiumRoute: '/settings/templates' },
  { id: 'reports', re: /\b(all projects|status chart|export to excel|reports)\b/gi, filevineTab: 'Reports', praxiumRoute: '/reports' },
  { id: 'disbursement', re: /\b(disbursement|disbursement sheet)\b/gi, filevineTab: 'Disbursement', praxiumTab: 'settlement' },
  { id: 'textline', re: /\btextline\b/gi, filevineTab: 'Textline', praxiumTab: 'comms' },
  { id: 'subrogation', re: /\b(subrogation|health subrogation)\b/gi, filevineTab: 'Subrogation', praxiumTab: 'subrogation' },
  { id: 'demand', re: /\b(demand tab|send in demand)\b/gi, filevineTab: 'Demand', praxiumTab: 'demand' },
  { id: 'settlement', re: /\bsettlement calc\b/gi, filevineTab: 'Settlement Calc', praxiumTab: 'settlement' },
];

const PRAXIUM_TAB_STATUS = {
  intake: 'partial',
  insurance: 'partial',
  pd: 'partial',
  medical: 'partial',
  documents: 'partial',
  demand: 'partial',
  settlement: 'partial',
  pipeline: 'partial',
  comms: 'partial',
  subrogation: 'partial',
  notes: 'missing',
};

function argValue(flag, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`${flag}=`));
  return hit ? hit.slice(flag.length + 1) : fallback;
}

function readText(filePath) {
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

function sampleQuote(text, index, radius = 90) {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

function analyzeTranscript(slug) {
  const dir = path.join(TRANSCRIPTS_DIR, slug);
  const blob = [readText(path.join(dir, 'transcript.md')), readText(path.join(dir, 'training-guide.md'))].join('\n');
  const mentions = [];

  for (const pat of TAB_PATTERNS) {
    const re = new RegExp(pat.re.source, pat.re.flags);
    let m;
    let count = 0;
    let firstQuote = '';
    while ((m = re.exec(blob)) !== null) {
      count += 1;
      if (!firstQuote) firstQuote = sampleQuote(blob, m.index);
    }
    if (count > 0) {
      mentions.push({
        id: pat.id,
        filevineTab: pat.filevineTab,
        praxiumTab: pat.praxiumTab || null,
        praxiumRoute: pat.praxiumRoute || null,
        count,
        sampleQuote: firstQuote,
      });
    }
  }

  return mentions;
}

function isFilevineRelated(slug, meta) {
  const blob = `${slug} ${meta?.title || ''} ${meta?.filename || ''}`.toLowerCase();
  return /filevine|docgen|status chart|meds tab|docs tab|settlement calc|taskflow|the case system/.test(blob);
}

const slugFilter = argValue('--slug', '');
const slugs = slugFilter
  ? [slugFilter]
  : listTranscriptSlugs().filter((slug) => {
      const meta = loadTranscriptMeta(slug);
      return isFilevineRelated(slug, meta);
    });

const existing = readJson(WIRING_REGISTRY_PATH, {
  version: 1,
  description: 'Filevine UI wiring capture — screens → PraxiumLaw routes/tabs',
  tabs: {},
  videos: {},
});

for (const slug of slugs) {
  const meta = loadTranscriptMeta(slug);
  if (!meta) continue;

  const mentions = analyzeTranscript(slug);
  const screenshotsDir = meta.screenshotsDir || null;
  const manifestRel = meta.frameManifest || null;
  const manifestPath = manifestRel ? path.join(PRAXIUM_ROOT, manifestRel) : null;
  const hasFrames = manifestPath && fs.existsSync(manifestPath);

  existing.videos[slug] = {
    title: meta.title,
    filename: meta.filename,
    category: meta.category,
    screenshotsDir,
    frameManifest: manifestRel,
    frameCount: meta.frameCount || 0,
    intervalSec: meta.intervalSec || null,
    videoQuarantinePath: meta.videoQuarantinePath || null,
    tabMentions: mentions,
    functions: existing.videos[slug]?.functions || [],
    captureStatus: hasFrames ? 'frames_extracted' : 'transcript_only',
  };

  for (const m of mentions) {
    if (!existing.tabs[m.id]) {
      existing.tabs[m.id] = {
        id: m.id,
        filevineTab: m.filevineTab,
        praxiumTab: m.praxiumTab,
        praxiumRoute: m.praxiumRoute,
        status: m.praxiumTab ? PRAXIUM_TAB_STATUS[m.praxiumTab] || 'missing' : 'missing',
        mentionCount: 0,
        sourceSlugs: [],
      };
    }
    existing.tabs[m.id].mentionCount += m.count;
    if (!existing.tabs[m.id].sourceSlugs.includes(slug)) {
      existing.tabs[m.id].sourceSlugs.push(slug);
    }
  }
}

existing.updatedAt = new Date().toISOString();
existing.stats = {
  videoCount: Object.keys(existing.videos).length,
  tabCount: Object.keys(existing.tabs).length,
  framesExtracted: Object.values(existing.videos).filter((v) => v.captureStatus === 'frames_extracted').length,
};

writeJson(WIRING_REGISTRY_PATH, existing);
console.log(`Wrote ${WIRING_REGISTRY_PATH}`);
console.log(`Videos: ${existing.stats.videoCount} · Tabs indexed: ${existing.stats.tabCount} · With frames: ${existing.stats.framesExtracted}`);
