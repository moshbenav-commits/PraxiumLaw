# PraxiumLaw PI Case OS

White-label **pre-litigation personal injury case management** system: workflows, capabilities, knowledge articles, and template patterns any law firm can adopt.

**Where we are:** Specs + corpus are done; **product code is not built yet.** See [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) for status, how documents map to the backend, and next steps.

## Required reading before use

| Doc | Purpose |
|-----|---------|
| [`DISCLOSURE.md`](./DISCLOSURE.md) | **Not legal advice.** Firms must **edit documents** and have **counsel review language** before use. |
| [`WHITE_LABEL.md`](./WHITE_LABEL.md) | Placeholders, no firm-specific branding, site/app checklist |

Anything added to the **site, app, or exports** must be white-labeled (`{{FIRM_NAME}}`, etc.) and show the disclosure.

## Product docs (shippable / firm-neutral)

| Path | Description |
|------|-------------|
| [`product-capabilities.md`](./product-capabilities.md) | What PraxiumLaw must do |
| [`system-spec.md`](./system-spec.md) | Full process map |
| [`gaps.md`](./gaps.md) | Gaps and attorney gates |
| [`articles/`](./articles/) | Knowledge-base articles (white-label) |
| [`IMPROVEMENTS.md`](./IMPROVEMENTS.md) | Prioritized backlog from full source review |

## Internal source corpus (historical training materials)

| Path | Description |
|------|-------------|
| [`sources/`](./sources/) | Raw PI training docs, letter templates, Training PI scripts (text-extracted), video transcripts, intake audio |
| [`sources/training-pi-text/`](./sources/training-pi-text/) | **All Training PI `.docx` scripts extracted to `.txt`** (38 files) |
| [`sources/transcripts/`](./sources/transcripts/) | Video training transcripts (168 modules) |
| [`intake-calls/`](./intake-calls/) | Intake audio transcripts (all 4 done) |
| [`sources/docs/white-label-templates/`](./sources/docs/white-label-templates/) | 106 scrubbed DOCX + 106 PDFs |
| [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) | **Status, plan, backend mapping** |
| [`SOURCES.md`](./SOURCES.md) | Inventory notes |

**Do not ship `sources/` to customers.** Use white-label templates + product docs only.

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

