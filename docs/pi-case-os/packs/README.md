# Filevine screenshot extraction packs

Each pack = batch of transcript slugs @ **30s** frame interval.

| Pack | File | Focus |
|------|------|--------|
| Day 1 | `day1-filevine.json` | Intake, basics, activity feed, new project (9) |
| 2 | `pack2-taskflow-feed-reports.json` | Taskflow, feed, status charts, case review (10) |
| 3 | `pack3-docgen.json` | DocGen letters (12) |
| 4 | `pack4-meds-treatment-tasks.json` | Meds, treatment tracker, med/insurance tasks (10) |
| 5 | `pack5-settlement-disbursement.json` | Settlement calc, disbursements (5) |
| 6 | `pack6-filevine-misc.json` | Remaining Filevine training (12) |
| 7 | `pack7-documents-saving.json` | Saving docs, Docs tab, medical records filing (10) |
| 8 | `pack8-demand-claims.json` | Demand prep, 3P/1P claims, LOR (16) |
| 9 | `pack9-reductions-liens.json` | Lien verification, reductions (4) |
| 10 | `pack10-case-audit-review.json` | Case audit, cleaner fish, 30-day review (8) |
| 11 | `pack11-subrogation-medical.json` | Subrogation, hospital/client medical (4) |
| 12 | `pack12-pi-workflow-misc.json` | Remaining PI workflow (34) |

```bash
npm run pi:filevine:extract:rest          # Filevine packs 2–6
npm run pi:filevine:extract:pi-rest       # PI ops packs 7–12 (~76 videos)
npm run pi:filevine:extract:dense         # packs 2,3,4,8 @ 15s (force re-extract)
```

**Coverage (2026-07-05):** ~134 videos · ~7k+ frames. Packs **2, 3, 4, 8** re-shot @ **15s** (~48 videos, ~2× frame density). Remaining 25 quarantine matches skipped as non-PI (jobs, MLS, DocuSign real estate, admin).

See `../FILEVINE_UI_CAPTURE_RUNBOOK.md`.
