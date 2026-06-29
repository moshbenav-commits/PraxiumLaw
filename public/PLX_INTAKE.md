# Praxium Law — intake (from shipped product)

**Researched:** 2026-06-26 from `PraxiumLaw/frontend/` + deploy docs  
**Machine-readable:** `PLX_INTAKE.json` · **Copy slots:** `PLX_COPY_SLOTS.json`

---

## Product

| Field | Value |
|-------|--------|
| **B2B name** | Praxium Suite / Praxium Law |
| **Consumer** | Praxa HQ (`/praxa`, praxahq.com) |
| **Domain** | https://www.praxiumlaw.com |
| **Tagline** | The operating system for the modern law firm. |
| **Status** | Live — password gate until public launch |

---

## B2B homepage copy (confirmed in `Landing.jsx`)

**H1:** The operating system for the **modern law firm.**

**Subhead:** Replace eight tools with one. Save $86,000 a year. Get AI that actually ships your demand letter.

**CTAs:** Start 30 days free · See the math

**Trust:** No card required · Free migration from Filevine · 90-day money back

**Math headline:** A 15-attorney firm pays **$10,150/mo** for what we do for **$2,985.**  
**Annual savings:** **$85,980**

---

## Praxa consumer copy (`PraxaLanding.jsx`)

**H1:** Be accurate. **Not strong.**

**Subhead:** Praxa is the streetwise friend who knows insurance…

**UPL:** Legal information, not legal advice.

---

## Assets needed (summary)

| Tier | Count | IDs |
|------|-------|-----|
| Brand / OG / favicon | 3 | PLX001–003 |
| Homepage + product stills | 5 | PLX004–008 |
| Route heroes | 3 | PLX009–011 |
| Textures + icons | 3 | PLX012–014 |
| Praxa mark | 1 | PLX015 |
| **B-roll clips** | **8** | `PLX_BROLL_STAGING.json` |

Full list: `PLX_ASSET_MANIFEST.json`

---

## Still TBD

- Logo SVG master (π mark is CSS-only today)
- Remove site password lock for public launch
- `EMERGENT_LLM_KEY` on prod for CoCounsel live demos
