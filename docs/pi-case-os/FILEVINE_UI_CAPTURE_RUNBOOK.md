# Filevine UI capture runbook

Step-by-step pipeline to screenshot Filevine training videos, index UI wiring, and map to PraxiumLaw.

**Videos (local):** `~/Desktop/CPP Training - Video Quarantine/`  
**Output frames:** `PraxiumLaw/training-archive/van-law-the case system/{slug}/screenshots/`  
**Registry:** `docs/pi-case-os/filevine-ui-wiring.json`

---

## Step 1 — Map videos to transcript slugs

Matches quarantine filenames to `docs/pi-case-os/sources/transcripts/*/meta.json`.

```bash
cd PraxiumLaw
npm run pi:filevine:map
```

Optional: Filevine-only filter

```bash
npm run pi:filevine:map:filevine
```

Output: `docs/pi-case-os/filevine-video-map.json`

Override quarantine path:

```bash
PI_VIDEO_QUARANTINE="/path/to/videos" npm run pi:filevine:map
```

---

## Step 2 — Extract dense frames

Default: **one frame every 30 seconds** (vs old 45s × 15 frames).

Single video:

```bash
npm run pi:filevine:extract -- --slug=FILEVINE_-_Intake_606dc0bcc5c4 --interval=30
```

Day 1 pilot pack (9 core videos):

```bash
npm run pi:filevine:extract:day1
```

Dry run (no ffmpeg):

```bash
npm run pi:filevine:extract -- --pack=day1-filevine --dry-run
```

Each slug writes:

- `training-archive/.../screenshots/frame_NNN.jpg`
- `training-archive/.../screenshots/frame-manifest.json` — label targets
- Updates `sources/transcripts/{slug}/meta.json` with `frameCount`, `videoQuarantinePath`

---

## Step 3 — Seed wiring registry from transcripts

Scans transcripts for tab mentions (`intake tab`, `meds tab`, `taskflow`, `doc gen`, etc.) and merges into the registry.

```bash
npm run pi:filevine:wiring-seed
```

Output: `docs/pi-case-os/filevine-ui-wiring.json`

---

## One command — Day 1 pack

```bash
npm run pi:filevine:capture:day1
```

Runs map → extract (9 videos) → wiring seed.

---

## Step 4 — Label frames (human or agent)

Open `frame-manifest.json` for a slug, or author a wiring sheet:

`docs/pi-case-os/wiring-sheets/{slug}.json`

Apply to manifest + registry:

```bash
npm run pi:filevine:apply-sheet -- --slug=FILEVINE_-_Intake_606dc0bcc5c4
```

**First wiring sheet (done):** `wiring-sheets/FILEVINE_-_Intake_606dc0bcc5c4.json` — 16 functions, 16 labeled anchor frames.

For each function, set:

| Field | Example |
|-------|---------|
| `filevineTab` | Intake |
| `filevineSection` | Needs List |
| `functionId` | `intake.needs_list` |
| `praxiumTab` | intake |
| `status` | partial · missing · done |

Add labeled functions to `filevine-ui-wiring.json` → `videos[slug].functions[]`.

---

## Step 5 — Implement PraxiumLaw wiring

Use registry `tabs` + labeled `functions` as the build checklist. Match Filevine section layout first; simplify UX after parity.

---

## Packs

| Pack | File | Videos |
|------|------|--------|
| Day 1 Filevine | `docs/pi-case-os/packs/day1-filevine.json` | 9 |

Add packs for Taskflow, DocGen, Status Charts, Disbursements.

---

## Git / storage

- **JPG frames** are gitignored (regenerate with Step 2).
- **Committed:** `frame-manifest.json` paths via meta, `filevine-ui-wiring.json`, `filevine-video-map.json`, packs.

Requires **ffmpeg**: `brew install ffmpeg`
