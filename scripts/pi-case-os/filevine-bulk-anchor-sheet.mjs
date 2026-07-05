#!/usr/bin/env node
/**
 * Bulk-generate anchor wiring sheets from transcripts + frame manifests.
 *
 *   node scripts/pi-case-os/filevine-bulk-anchor-sheet.mjs --pack=pack8-demand-claims
 *   node scripts/pi-case-os/filevine-bulk-anchor-sheet.mjs --slugs=slug1,slug2
 *   node scripts/pi-case-os/filevine-bulk-anchor-sheet.mjs --packs=pack8-demand-claims,pack9-reductions-liens
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  TRANSCRIPTS_DIR,
  PACKS_DIR,
  readJson,
  writeJson,
  loadTranscriptMeta,
  screenshotsDirForMeta,
  PRAXIUM_ROOT,
} from './lib/paths.mjs';

const SHEETS_DIR = path.join(PRAXIUM_ROOT, 'docs/pi-case-os/wiring-sheets');

const TAB_PATTERNS = [
  { id: 'feed', re: /\b(feed|task feed|activity feed|bolded vine)\b/gi, filevineTab: 'Feed', praxiumTab: 'pipeline', praxiumRoute: '/inbox' },
  { id: 'intake', re: /\bintake tab\b/gi, filevineTab: 'Intake', praxiumTab: 'intake', praxiumRoute: '/matters/:id' },
  { id: 'treatment', re: /\btreatment tab\b/gi, filevineTab: 'Treatment', praxiumTab: 'medical', praxiumRoute: '/matters/:id' },
  { id: 'insurance', re: /\b(insurance tab|insurance old|opening a claim|letter of rep|lor|adjuster|claim number|policy number)\b/gi, filevineTab: 'Insurance', praxiumTab: 'insurance', praxiumRoute: '/matters/:id' },
  { id: 'auto', re: /\bauto tab\b/gi, filevineTab: 'Auto', praxiumTab: 'pd', praxiumRoute: '/matters/:id' },
  { id: 'health', re: /\b(health tab|health insurance|hospital bills)\b/gi, filevineTab: 'Health', praxiumTab: 'subrogation', praxiumRoute: '/matters/:id' },
  { id: 'meds', re: /\b(meds tab|medical bills|medical records|yellow sheet|provider)\b/gi, filevineTab: 'Meds', praxiumTab: 'medical', praxiumRoute: '/matters/:id' },
  { id: 'activity', re: /\bactivity tab\b/gi, filevineTab: 'Activity', praxiumTab: 'notes', praxiumRoute: '/matters/:id' },
  { id: 'team', re: /\b(team tab|assign primary|roles)\b/gi, filevineTab: 'Team', praxiumTab: 'intake', praxiumRoute: '/matters/:id' },
  { id: 'docs', re: /\b(docs tab|documents tab|save.*doc|scan|dropbox|hashtag)\b/gi, filevineTab: 'Docs', praxiumTab: 'documents', praxiumRoute: '/matters/:id' },
  { id: 'taskflow', re: /\b(taskflow|assign.*task|needs list|7 day|30 day)\b/gi, filevineTab: 'Taskflow', praxiumTab: 'pipeline', praxiumRoute: '/tasks' },
  { id: 'docgen', re: /\b(doc gen|docgen|generate.*letter|demand letter|lor)\b/gi, filevineTab: 'DocGen', praxiumTab: 'documents', praxiumRoute: '/matters/:id' },
  { id: 'demand', re: /\b(demand tab|demand letter|demand package|policy limit|gather.*demand)\b/gi, filevineTab: 'Demand', praxiumTab: 'demand', praxiumRoute: '/matters/:id' },
  { id: 'settlement', re: /\b(settlement calc|disbursement|reduction|lien)\b/gi, filevineTab: 'Settlement', praxiumTab: 'settlement', praxiumRoute: '/matters/:id' },
  { id: 'negotiation', re: /\bnegotiation\b/gi, filevineTab: 'Negotiations', praxiumTab: 'settlement', praxiumRoute: '/matters/:id' },
  { id: 'subrogation', re: /\b(subrogation|health subrogation|lien holder)\b/gi, filevineTab: 'Subrogation', praxiumTab: 'subrogation', praxiumRoute: '/matters/:id' },
  { id: 'customs', re: /\bcustoms editor\b/gi, filevineTab: 'Customs Editor', praxiumTab: 'intake', praxiumRoute: '/settings/custom-fields' },
  { id: 'calendar', re: /\bcalendar\b/gi, filevineTab: 'Calendar', praxiumTab: 'pipeline', praxiumRoute: '/calendar' },
  { id: 'notes', re: /\bnote section\b/gi, filevineTab: 'Notes', praxiumTab: 'notes', praxiumRoute: '/matters/:id' },
];

const TITLE_BOOST = [
  { re: /CLAIMS|INS -|LOR|Opening.*claim/i, ids: ['insurance', 'docgen'] },
  { re: /DEMAND/i, ids: ['demand', 'meds', 'docgen'] },
  { re: /Lien|Reduction/i, ids: ['settlement', 'meds'] },
  { re: /Case Audit|Case Review|30 Day|Workflow/i, ids: ['intake', 'meds', 'insurance', 'taskflow'] },
  { re: /Subrogation|SUBRO/i, ids: ['subrogation', 'health', 'docgen'] },
  { re: /TASK -/i, ids: ['taskflow', 'intake'] },
  { re: /Customs Editor/i, ids: ['customs', 'insurance'] },
  { re: /DOCS|Saving|Hashtag/i, ids: ['docs'] },
  { re: /SERVER|Dropbox|folder/i, ids: ['docs'] },
  { re: /CALENDAR/i, ids: ['calendar'] },
  { re: /NOTES/i, ids: ['notes', 'activity'] },
  { re: /PLEADINGS|LITIGATION|Deposition/i, ids: ['docs', 'activity'] },
  { re: /MAIL|GMAIL|CALLS|MISC/i, ids: ['activity', 'taskflow'] },
];

function argValue(flag, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`${flag}=`));
  return hit ? hit.slice(flag.length + 1) : fallback;
}

function readText(filePath) {
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

function sampleQuote(text, index, radius = 100) {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

function analyzeTranscript(slug, title) {
  const dir = path.join(TRANSCRIPTS_DIR, slug);
  const blob = [readText(path.join(dir, 'transcript.md')), readText(path.join(dir, 'training-guide.md')), title].join('\n');
  const scored = new Map();

  for (const pat of TAB_PATTERNS) {
    const re = new RegExp(pat.re.source, pat.re.flags);
    let m;
    let count = 0;
    let firstQuote = '';
    let firstIndex = 0;
    while ((m = re.exec(blob)) !== null) {
      count += 1;
      if (!firstQuote) {
        firstQuote = sampleQuote(blob, m.index);
        firstIndex = m.index;
      }
    }
    if (count > 0) {
      scored.set(pat.id, { ...pat, count, firstQuote, firstIndex });
    }
  }

  for (const boost of TITLE_BOOST) {
    if (boost.re.test(title)) {
      for (const id of boost.ids) {
        const pat = TAB_PATTERNS.find((p) => p.id === id);
        if (!pat) continue;
        const cur = scored.get(id) || { ...pat, count: 0, firstQuote: '', firstIndex: 0 };
        cur.count += 5;
        if (!cur.firstQuote) cur.firstQuote = `Training covers ${pat.filevineTab} workflow per title: ${title}`;
        scored.set(id, cur);
      }
    }
  }

  return [...scored.values()].sort((a, b) => b.count - a.count).slice(0, 8);
}

function pickFrames(frameCount, fnCount) {
  if (frameCount <= 1) return Array.from({ length: fnCount }, () => 'frame_001.jpg');
  const maxFrame = frameCount;
  const picks = [];
  for (let i = 0; i < fnCount; i++) {
    const idx = Math.min(maxFrame, Math.max(1, Math.round(((i + 1) / (fnCount + 1)) * maxFrame)));
    picks.push(`frame_${String(idx).padStart(3, '0')}.jpg`);
  }
  return picks;
}

function sectionFor(pat) {
  const map = {
    insurance: 'Claim / adjuster fields',
    demand: 'Demand package',
    meds: 'Provider ledger',
    docgen: 'Letter generation',
    settlement: 'Calc / reductions',
    subrogation: 'Health lien workflow',
    taskflow: 'Task assignment',
    intake: 'Client intake fields',
    docs: 'Document save / naming',
    feed: 'Activity feed',
    customs: 'Custom field editor',
    calendar: 'Appointments',
    notes: 'Note sections',
    activity: 'Activity log',
    team: 'Roles / primary',
    negotiation: 'Offer log',
    health: 'Health insurance',
    auto: 'Property damage',
    treatment: 'Treatment tracker',
  };
  return map[pat.id] || pat.filevineTab;
}

function actionFor(pat, title) {
  const base = pat.id.replace(/[^a-z]/gi, '_');
  return [`review${pat.filevineTab.replace(/\s/g, '')}Workflow`, `mapToPraxium${base}`];
}

function gapFor(pat) {
  return `Praxium ${pat.praxiumTab || 'route'} lacks Filevine ${pat.filevineTab} parity`;
}

function matterShellFor(mentions, title) {
  const primary = mentions[0];
  if (!primary?.praxiumTab) return undefined;
  return {
    description: `Anchor wiring from training: ${title}`,
    route: primary.praxiumRoute || '/matters/:id',
    selectors: mentions.slice(0, 3).map((m) => m.id),
  };
}

function buildSheet(slug) {
  const meta = loadTranscriptMeta(slug);
  if (!meta) return null;

  const title = meta.title || slug;
  const mentions = analyzeTranscript(slug, title);
  if (mentions.length === 0) {
    mentions.push({
      id: 'activity',
      filevineTab: 'Activity',
      praxiumTab: 'notes',
      praxiumRoute: '/matters/:id',
      count: 1,
      firstQuote: `General PI workflow training: ${title}`,
    });
  }

  const outDir = screenshotsDirForMeta(meta);
  const manifest = readJson(path.join(outDir, 'frame-manifest.json'), { frames: [] });
  const frameCount = manifest.frames?.length || meta.frameCount || 1;
  const interval = manifest.intervalSec || meta.intervalSec || 30;
  const frames = pickFrames(frameCount, Math.min(mentions.length, 8));

  const functions = mentions.slice(0, 8).map((pat, i) => ({
    id: `${pat.id}.${slug.slice(0, 12).replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${i + 1}`,
    sequence: i + 1,
    frame: frames[i],
    timestampSec: (parseInt(frames[i].match(/\d+/)?.[0] || '1', 10) - 1) * interval || i * 30,
    filevineSurface: pat.filevineTab,
    filevineTab: pat.filevineTab,
    filevineSection: sectionFor(pat),
    fields: [],
    actions: actionFor(pat, title),
    transcriptQuote: pat.firstQuote.slice(0, 280),
    praxiumRoute: pat.praxiumRoute || '/matters/:id',
    praxiumTab: pat.praxiumTab || 'pipeline',
    status: 'missing',
    gapNotes: gapFor(pat),
  }));

  const labeledFrames = [...new Set(functions.map((f) => f.frame))];

  return {
    slug,
    title,
    labeledAt: new Date().toISOString().slice(0, 10),
    labeledBy: 'agent-bulk-anchor-packs8-12',
    videoDurationSec: meta.durationSec || null,
    matterShell: matterShellFor(mentions, title),
    functions,
    labeledFrames,
  };
}

function slugsFromArgs() {
  const slugArg = argValue('--slugs', '');
  if (slugArg) return slugArg.split(',').map((s) => s.trim()).filter(Boolean);

  const packArg = argValue('--pack', '');
  const packsArg = argValue('--packs', '');
  const packNames = packArg ? [packArg] : packsArg ? packsArg.split(',') : [];

  if (packNames.length === 0) {
    console.error('Pass --pack=, --packs=, or --slugs=');
    process.exit(1);
  }

  const slugs = [];
  for (const name of packNames) {
    const file = name.endsWith('.json') ? path.join(PACKS_DIR, name) : path.join(PACKS_DIR, `${name}.json`);
    const pack = readJson(file);
    if (!pack?.slugs) {
      console.error(`Pack not found: ${file}`);
      process.exit(1);
    }
    slugs.push(...pack.slugs);
  }
  return slugs;
}

const force = process.argv.includes('--force');
const slugs = slugsFromArgs();
let written = 0;
let skipped = 0;

for (const slug of slugs) {
  const outPath = path.join(SHEETS_DIR, `${slug}.json`);
  if (!force && fs.existsSync(outPath)) {
    skipped += 1;
    continue;
  }
  const sheet = buildSheet(slug);
  if (!sheet) {
    console.warn(`Skip — no meta: ${slug}`);
    continue;
  }
  writeJson(outPath, sheet);
  written += 1;
  console.log(`✓ ${slug} (${sheet.functions.length} functions)`);
}

console.log(`\nDone — wrote ${written}, skipped ${skipped}`);
