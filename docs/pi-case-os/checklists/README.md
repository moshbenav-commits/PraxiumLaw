# PraxiumLaw — Phase Checklists (structured data)

Machine-readable per-phase checklists that mirror the [case lifecycle](../articles/00-case-lifecycle-and-workflow-map.md). Intended to drive the app's task/gate UI (the P2 data layer in [`../GAP_ANALYSIS_AND_ROADMAP.md`](../GAP_ANALYSIS_AND_ROADMAP.md)) and to keep the written SOPs and the product in sync.

- [`phase-checklists.json`](./phase-checklists.json) — all lifecycle phases, each with ordered items, the SOP article each item traces to, and the attorney gate (if any).
- Companion existing file: `../intake-packet-checklist.json`.

## Conventions

- `gate: "attorney"` means the phase cannot advance without licensed-attorney approval — enforce in the app.
- `article` is the source SOP (keep in sync when SOPs change).
- `phi: true` items involve protected health info → apply [HIPAA controls](../articles/46-firm-hipaa-and-data-security.md).

**Not legal advice** — see [`../DISCLOSURE.md`](../DISCLOSURE.md). Firms must adapt items to their policy and jurisdiction.
