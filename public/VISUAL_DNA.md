# Praxium Suite — Visual DNA

**Status:** locked · `brandDna.status: locked` in `SITE_ASSET_MANIFEST.json`  
**Site:** `praxium-law` · **Type:** legal SaaS (B2B) · **Created:** 2026-07-06  
**HF inject:** `docs/prompts/higgsfield/praxium-law-visual-dna-prompt-block.txt`  
**Forge spec:** `brand/BRAND_DNA_MASTER_SPEC.md`

---

## One-line DNA

Editorial Swiss legal SaaS — cream canvas, ink typography, orange π accent, product UI mocks and photoreal firm atmosphere. Modern law firm operating system, not consumer injury app (Praxa branch uses sage/sand).

---

## Locked palette

| Token | Hex | Use |
|-------|-----|-----|
| Cream canvas | `#F9F8F6` | Page background, marketing shells |
| Surface | `#FFFFFF` | Cards, panels |
| Ink | `#121212` | Headlines, wordmark |
| Muted | `#5C5C5C` | Secondary copy |
| Border | `#E5E4E1` | Dividers |
| Orange accent | `#E85D04` | π mark, CTAs, highlights |
| Orange hover | `#DC2F02` | Hover states |

Praxa consumer (`/praxa`): sage `#8A9A86` · warm sand `#D4A373` — separate from B2B chrome.

---

## Banned

- Expedia automotive orange truck · EXPEDIA/PARTS · EP monogram  
- EarnedStar origami star · navy/gold merchant review SaaS  
- Readable PII, client names, case numbers in UI mocks  
- Purple AI gradient blobs · generic template SaaS hero  

---

## Lock checklist

- [x] Palette hex table complete  
- [x] One-line DNA + bans filled  
- [x] HF prompt block at `docs/prompts/higgsfield/praxium-visual-dna-prompt-block.txt`  
- [x] `SITE_ASSET_MANIFEST.json` → `"brandDna": { "status": "locked" }`  
- [x] `npm run brand:dna:validate -- --site=praxium-law --require-locked` exits 0  
