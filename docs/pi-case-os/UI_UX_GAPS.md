# PraxiumLaw — UI / UX Gaps (training vs live app)

**Updated:** 2026-07-04  
**Source:** Position training guides compared to PraxiumLaw frontend v0.3.0 + backend phase 20.  
**Machine-readable:** [`training-ux-gaps.json`](./training-ux-gaps.json) · **In-app:** `/training` → UI / UX gaps tab

---

## Summary

| Priority | Count | Meaning |
|----------|-------|---------|
| **P0** | 13 | Training assumes feature; app cannot support workflow without workaround |
| **P1** | 10 | Important PI ops; partial or manual workaround |
| **P2** | 5 | Polish, RBAC nav, or Phase 2 |

**Wired:** Intake · Insurance · **PD** · Medical · Documents · Pipeline · Demand · Settlement on PI matters.

---

## P0 — Critical (build first)

| ID | Area | Training expects | App today |
|----|------|------------------|-----------|
| UX-002 | Intake | Needs List checklist on matter | **Intake tab** — checkboxes + notes |
| UX-003 | Intake | Assign CM, attorney, clerical | **Intake tab** — team role dropdowns |
| UX-004 | Intake | Conflict check + related cases | **Intake tab** — status + notes (no linker yet) |
| UX-005 | Insurance | 3P/1P panel, LOR, adjuster | **Insurance tab** — full 3P/1P panels |
| UX-006 | Insurance | Policy limits + claimant count | **Insurance tab** — limits + pro rata count |
| UX-007 | Medical | Full Meds ledger + COR | **Medical tab** — full editable ledger |
| UX-008 | Medical | No-show / MRI / gap alerts | **Medical tab** — compliance alert panel + row color codes |
| UX-009 | Documents | Required taxonomy on upload | **Documents tab** — classify on upload |
| UX-010 | Documents | Redaction gate before carrier send | **Documents tab** — checklist + carrier OK flag |
| UX-011 | Demand | Demand builder + exhibits | **Demand tab** — yellow-sheet order + rebuild from Meds |
| UX-012 | Attorney gates | Block demand send without attorney | **Demand tab** — approve/reject + send gate (RBAC) |
| UX-013 | Settlement | Calculator + reductions | **Settlement tab** — offers, scenarios, attorney net gate |
| UX-014 | Pipeline | PI phases (Treating → Demand…) | **Pipeline tab** + PI kanban on `/matters` |

---

## P1 — High

| ID | Area | Gap |
|----|------|-----|
| UX-015 | Property damage | **PD tab** — rental, estimates, total-loss alerts |
| UX-016 | Client comms | **Comms tab** — cadence prompts + contact log; VoxLine SMS Phase 2 |
| UX-017 | Records | **Medical tab** — LOR status per provider (no date-range LOR builder) |
| UX-018 | Records | **Medical tab** — COR + alert |
| UX-019 | Subrogation | **Subrogation tab** — Medicare-critical checklist + alerts |
| UX-020 | Templates | **Settings** white-label profile + merged DOCX at `/settings/templates` |
| UX-021 | Onboarding | **Disclosure gate** — modal on login + template download block |
| UX-022 | Case audit | **Reports** — PI audit dashboard (cleaner-fish rollup) |
| UX-023 | Navigation | No contextual help on matter tabs |
| Portal upload | Documents | Magic-link upload taxonomy on `/upload/:token` (matches staff classify flow) |

---

## P2 — Later

| ID | Area | Gap |
|----|------|-----|
| UX-024 | RBAC | Sidebar shows all items to every role |
| UX-025 | Search | ⌘K excludes training content |
| UX-026 | Litigation | No transfer-to-lit wizard |
| UX-027 | Billing | Disbursement module missing (disbursement *letter* DocGen shipped on Settlement tab; W9 registry + firm-wide queue still open) |
| UX-028 | Intake | Cold phone lead script still a content gap |

---

## Recommended build order (from gaps + training)

1. ~~Document taxonomy + redaction~~ — shipped (UX-009, UX-010)  
2. ~~**PI phase engine**~~ — shipped (UX-014 partial — task templates not auto-created)  
3. ~~**Demand builder** + attorney gate~~ — shipped (UX-011, UX-012 incl. DocGen demand/MedPay/drop letters, DRAFT-watermarked until attorney approval)  
4. ~~**Settlement calculator**~~ — shipped (UX-013 incl. DocGen reduction-request + disbursement letters; disbursement gated on attorney-approved scenario)  
5. **DocGen letters** — shipped (`backend/pi_letters.py`): demand, MedPay (1P), drop, reduction request, disbursement — DOCX/PDF, white-label merge, filed to matter Documents under `Letters`, optional AI narrative draft (`/matters/{id}/letters/ai-draft`). UX-027 disbursement *letter* done; full disbursement module (W9 registry, queue) still open.  
6. **Letter pipeline pass** — shipped: bill-PDF packets on MedPay/demand PDFs (`include_bills`, closes `medpay_nitro_attach_bills`), MedPay bill picker (`select_bills_for_medpay`), provider-address auto-fill on reduction/drop letters from the provider directory, per-letter merge-field coverage in the Letters card ("what's missing and which tab fills it"), phase-change letter tasks + `pi.phase_changed` workflow trigger (letters slice of `phase_change_auto_tasks`), and **AI intake fill** (`backend/pi_ai_intake.py` + Intake-tab modal): extracts client/matter/3P/1P fields from uploaded documents, staff reviews in a popup with per-field voice dictation (Web Speech API), applies through existing endpoints. AI extraction quality needs a live key — verify on a real matter after attaching the Anthropic key in Settings → Integrations.  
7. **LOR + lien-verification letters** — shipped: letter of representation (3P adverse carrier / 1P own carrier, side picker on the Demand tab) and lien-balance verification (per scenario line on the Settlement tab, addresses the `lien_holder` when set and auto-fills its address). Closes `customs.meds.lien_balance_verification_letter` and the LOR-docgen gap; lien holders are now first-class letter recipients. Phase triggers extended: Treating → LOR task, Settlement/disbursement → lien-verification task.  

See also [`product-capabilities.md`](./product-capabilities.md) MVP order · [`SITE_WIRING_AUDIT.md`](./SITE_WIRING_AUDIT.md).

---

## How gaps were derived

For each position guide we extracted:

1. **“PraxiumLaw — wired today”** — verified route exists in `App.js` / `MatterDetail.jsx`  
2. **“Not wired yet”** — confirmed absent in codebase  
3. **Training task → UI mapping** — e.g. Needs List → matter tab; Meds → Medical tab fields  
4. **Attorney gates** — training requires approval; RBAC has no matching enforcement  

Update [`training-ux-gaps.json`](./training-ux-gaps.json) when UI ships or training changes.

**Wiring-derived backlog:** [`WIRING_GAP_ROLLUP.md`](./WIRING_GAP_ROLLUP.md) · regenerate: `npm run pi:filevine:gap-rollup`
