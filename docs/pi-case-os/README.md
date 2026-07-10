# PraxiumLaw PI Case OS

White-label **pre-litigation personal injury case management** system: workflows, capabilities, knowledge articles, and template patterns any law firm can adopt.

**Where we are:** Specs + corpus are done; **product code is not built yet.** See [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) for status, how documents map to the backend, and next steps.

## Required reading before use

| Doc | Purpose |
|-----|---------|
| [`DISCLOSURE.md`](./DISCLOSURE.md) | **Not legal advice.** Recommended procedures only — **cross-reference against your own** and have **counsel review language** before use. |
| [`WHITE_LABEL.md`](./WHITE_LABEL.md) | Placeholders, no firm-specific branding, site/app checklist |
| [`REFERENCES.md`](./REFERENCES.md) | Public legal authorities (ABA rules, CMS/Medicare, ERISA, court rules) behind the articles |
| [`GLOSSARY.md`](./GLOSSARY.md) | Industry terms to keep vs. firm jargon to avoid |
| [`GAP_ANALYSIS_AND_ROADMAP.md`](./GAP_ANALYSIS_AND_ROADMAP.md) | What's missing and the prioritized improvement plan |
| [`../praxhq/`](../praxhq/) | **PraxHQ** coordination platform — role, integration map, and **legal/regulatory research** (read before building) |

Anything added to the **site, app, or exports** must be white-labeled (`{{FIRM_NAME}}`, etc.) and show the disclosure.

## Product docs (shippable / firm-neutral)

| Path | Description |
|------|-------------|
| [`product-capabilities.md`](./product-capabilities.md) | What PraxiumLaw must do |
| [`system-spec.md`](./system-spec.md) | Full process map |
| [`gaps.md`](./gaps.md) | Gaps and attorney gates |
| [`GAP_ANALYSIS_AND_ROADMAP.md`](./GAP_ANALYSIS_AND_ROADMAP.md) · [`GLOSSARY.md`](./GLOSSARY.md) · [`REFERENCES.md`](./REFERENCES.md) | Roadmap · terminology · public authorities |
| [`KPIS_AND_CASE_GRADE.md`](./KPIS_AND_CASE_GRADE.md) · [`DAMAGES_WORKSHEET.md`](./DAMAGES_WORKSHEET.md) · [`JURISDICTION_MATRIX.md`](./JURISDICTION_MATRIX.md) | Metrics/case-grade · damages data-capture · per-state matrix template |
| [`checklists/`](./checklists/) | Machine-readable per-phase checklists (JSON) for the app task/gate UI |
| [`../praxhq/`](../praxhq/) | **PraxHQ** — the PI helper app (product + legal/HIPAA research) |
| [`articles/`](./articles/) | Knowledge-base articles (white-label) — **54 articles (00–53) by department**; see [`articles/README.md`](./articles/README.md). Start at [`00`](./articles/00-case-lifecycle-and-workflow-map.md) (end-to-end case map). 01–24 pre-lit PI; 25–53 add demand drafting, settlement/disbursement, liens & subrogation, litigation, specialty departments, close-out, trust accounting, firm HIPAA, referral/marketing compliance, intake call script, Medicare set-aside, UM/UIM, wage-loss, expanded property damage, records retrieval, and non-medical liens |
| [`training-guides/`](./training-guides/) | **Position training guides** (8 roles) |
| [`SITE_WIRING_AUDIT.md`](./SITE_WIRING_AUDIT.md) | PraxiumLaw app wiring vs PI spec |
| [`UI_UX_GAPS.md`](./UI_UX_GAPS.md) | Training-derived UI/UX gap backlog |
| [`training-ux-gaps.json`](./training-ux-gaps.json) | Same gaps (JSON for `/training` API) |
| [`IMPROVEMENTS.md`](./IMPROVEMENTS.md) | Prioritized backlog from full source review |

## Internal source corpus (historical training materials)

| Path | Description |
|------|-------------|
| [`sources/`](./sources/) | PI training docs, letter templates, scripts (text), video transcripts |
| [`sources/training-pi-text/`](./sources/training-pi-text/) | **All standard PI practice `.docx` scripts extracted to `.txt`** (38 files) |
| [`sources/transcripts/`](./sources/transcripts/) | Video training transcripts (168 modules) |
| [`intake-calls/`](./intake-calls/) | Intake call **transcripts only** (4 `.txt` files — no raw audio) |
| [`sources/docs/white-label-templates/`](./sources/docs/white-label-templates/) | 106 scrubbed DOCX + 106 PDFs |
| [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) | **Status, plan, backend mapping** |
| [`SOURCES.md`](./SOURCES.md) | Inventory notes |

**Do not ship `sources/` to customers.** Use white-label templates + product docs only.

**No raw training audio/video** in this folder — only transcripts and extracted text. See [`TRANSCRIPTION_STATUS.md`](./TRANSCRIPTION_STATUS.md) and [`.gitignore`](./.gitignore).

## Product rules

- **No fabrication** — operational content derived from training materials only  
- **White-label** — `the firm` / `the attorney` / `{{PLACEHOLDERS}}` in anything public  
- **Counsel review** — every template and script must be edited and attorney-approved per jurisdiction (see `DISCLOSURE.md`)  
- **Attorney gates** — demand, reductions, disbursement require attorney role  

## Repo home

**PraxiumLaw is the only repo** for this product. Specs and corpus live here under `docs/pi-case-os/`. Implement PI case OS as modules in `PraxiumLaw/backend` + `PraxiumLaw/frontend` — no separate Axiom repos.

## Next steps

1. **Build Phase 1 MVP** from `product-capabilities.md` (see `PROJECT_STATUS.md`)  
2. Wire disclosure acknowledgment + firm profile placeholders on first use  
3. Map spec fields → Mongo schema + FastAPI routes + React case file UI  

