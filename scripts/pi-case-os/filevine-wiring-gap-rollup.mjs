#!/usr/bin/env node
/**
 * Roll up filevine-ui-wiring.json functions → implementation backlog by Praxium tab.
 *
 *   node scripts/pi-case-os/filevine-wiring-gap-rollup.mjs
 *   node scripts/pi-case-os/filevine-wiring-gap-rollup.mjs --write
 */
import fs from 'node:fs';
import path from 'node:path';
import { WIRING_REGISTRY_PATH, PRAXIUM_ROOT, readJson, writeJson } from './lib/paths.mjs';

const writeOut = process.argv.includes('--write');
const reg = readJson(WIRING_REGISTRY_PATH);
const byTab = new Map();
const byId = new Map();

for (const [slug, video] of Object.entries(reg.videos || {})) {
  if (video.captureStatus !== 'wiring_labeled') continue;
  for (const fn of video.functions || []) {
    const tab = fn.praxiumTab || fn.praxiumRoute || 'unknown';
    if (!byTab.has(tab)) byTab.set(tab, { missing: 0, partial: 0, functions: [] });
    const bucket = byTab.get(tab);
    if (fn.status === 'missing') bucket.missing += 1;
    else if (fn.status === 'partial') bucket.partial += 1;
    bucket.functions.push({
      id: fn.id,
      slug,
      title: video.title,
      status: fn.status,
      gapNotes: fn.gapNotes || '',
      filevineTab: fn.filevineTab,
    });
    if (fn.id) byId.set(fn.id, fn);
  }
}

const sorted = [...byTab.entries()].sort(
  (a, b) => b[1].missing + b[1].partial - (a[1].missing + a[1].partial),
);

const rollup = {
  generatedAt: new Date().toISOString(),
  videoCount: Object.values(reg.videos || {}).filter((v) => v.captureStatus === 'wiring_labeled').length,
  functionCount: byId.size,
  tabs: Object.fromEntries(
    sorted.map(([tab, data]) => [
      tab,
      {
        missing: data.missing,
        partial: data.partial,
        total: data.missing + data.partial,
        topGaps: data.functions
          .filter((f) => f.status === 'missing')
          .slice(0, 8)
          .map((f) => ({ id: f.id, gapNotes: f.gapNotes, source: f.title })),
      },
    ]),
  ),
};

const mdPath = path.join(PRAXIUM_ROOT, 'docs/pi-case-os/WIRING_GAP_ROLLUP.md');
const jsonPath = path.join(PRAXIUM_ROOT, 'docs/pi-case-os/wiring-gap-rollup.json');

const lines = [
  '# Filevine → Praxium wiring gap rollup',
  '',
  `**Generated:** ${rollup.generatedAt.slice(0, 10)}`,
  `**Videos labeled:** ${rollup.videoCount} · **Functions:** ${rollup.functionCount}`,
  '',
  'Use with [`UI_UX_GAPS.md`](./UI_UX_GAPS.md) for build priority.',
  '',
  '| Praxium tab | Missing | Partial | Total |',
  '|-------------|---------|---------|-------|',
];

for (const [tab, data] of sorted) {
  const total = data.missing + data.partial;
  lines.push(`| ${tab} | ${data.missing} | ${data.partial} | ${total} |`);
}

lines.push('', '---', '');

for (const [tab, data] of sorted.slice(0, 10)) {
  lines.push(`## ${tab}`, '');
  const tops = data.functions.filter((f) => f.status === 'missing').slice(0, 6);
  for (const f of tops) {
    lines.push(`- **${f.id}** — ${f.gapNotes} _(from: ${f.title})_`);
  }
  lines.push('');
}

console.log(JSON.stringify({ tabs: sorted.length, functions: rollup.functionCount }, null, 2));

if (writeOut) {
  writeJson(jsonPath, rollup);
  fs.writeFileSync(mdPath, `${lines.join('\n')}\n`);
  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}`);
}
