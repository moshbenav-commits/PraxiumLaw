# Praxium Law — brand asset pack

**Product:** [Praxium Suite](https://www.praxiumlaw.com) · B2B legal OS  
**Consumer line:** [Praxa HQ](https://www.praxahq.com) → `/praxa`  
**Codebase:** `PraxiumLaw/frontend/`  
**Intake:** `PLX_INTAKE.md` · `PLX_INTAKE.json`  
**Copy SSOT:** `PLX_COPY_SLOTS.json`

---

## Live URLs

| URL | Role |
|-----|------|
| https://www.praxiumlaw.com | B2B landing (password gate) |
| https://api.praxiumlaw.com/api | Backend |
| https://www.praxahq.com | Praxa consumer → `/praxa` |

---

## Palette (from `tailwind.config.js`)

| Token | Hex |
|-------|-----|
| bg | `#F9F8F6` |
| ink | `#121212` |
| accent | `#E85D04` |
| line | `#E5E4E1` |
| Praxa sage | `#8A9A86` |
| Praxa accent | `#D4A373` |

---

## Asset manifests

| File | Purpose |
|------|---------|
| `SITE_ASSET_MANIFEST.json` | Index + tier summary |
| `PLX_ASSET_MANIFEST.json` | Full asset list PLX001–PLX015 |
| `PLX_BROLL_STAGING.json` | 8 Seedance b-roll clips |
| `PLX_COPY_SLOTS.json` | Meta, hero, CTA, overlay quotes |
| `higgsfield/staging/PLX_PENDING.json` | Nano Banana queue (after build) |

---

## Generation

```bash
npm run brand:site-nano:build -- --site=praxium-law
npm run video:staging:build
npm run video:flow:upload-staging
```

Design Lab: `brand/design-lab/praxium-law-staging.html`

---

## Hero copy (shipped in React — mirror in assets)

> **The operating system for the modern law firm.**  
> Replace eight tools with one. Save $86,000 a year. Get AI that actually ships your demand letter.

See `PLX_COPY_SLOTS.json` for full slot map.
