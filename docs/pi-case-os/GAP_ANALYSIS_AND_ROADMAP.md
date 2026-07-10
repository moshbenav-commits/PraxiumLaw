# PraxiumLaw PI Case OS — Gap Analysis & Improvement Roadmap

Where the SOP set (44 articles, [`articles/`](./articles/)) is strong, what's still missing, and a prioritized plan to improve Praxium Law's procedures — including where **PraxHQ** ([`../praxhq/`](../praxhq/)) plugs in. See [`DISCLOSURE.md`](./DISCLOSURE.md); legal-sensitive items need counsel.

## Where we're strong

End-to-end pre-lit → litigation → settlement → disbursement → close-out is covered, plus specialty departments (minor's compromise, mass torts, premises, workers' comp, MIST), lien/subrogation, ethics/CLE, and firm operations — all white-label with a [lifecycle map](articles/00-case-lifecycle-and-workflow-map.md) and public [references](./REFERENCES.md).

## Gaps & additions — prioritized

### P0 — Compliance-critical (do before scaling / before PraxHQ launch)

| Gap | Add | Ties to |
|-----|-----|---------|
| Referral/marketing legality was implicit | ✅ Added [44 — Referral sources & marketing compliance](articles/44-referral-sources-and-marketing-compliance.md) | [PraxHQ legal memo](../praxhq/LEGAL_REGULATORY_RESEARCH.md) |
| Trust-accounting detail thin (art. 27/40 summarize) | ✅ Added [45 — Trust accounting & three-way reconciliation](articles/45-trust-accounting-and-reconciliation.md) (Rule 1.15) | Disbursement, PraxHQ "money stays in trust" |
| Data/privacy policy is high-level | ✅ Added [46 — Firm HIPAA & client-data security](articles/46-firm-hipaa-and-data-security.md) | [PraxHQ HIPAA](../praxhq/HIPAA_COMPLIANCE.md), ops |
| Future-medicals/government-benefit protection | ✅ Added [48 — Medicare set-aside, structured settlements & future medicals](articles/48-medicare-set-aside-and-future-medicals.md) | Subrogation (29), minor's compromise (30) |

### P1 — Completeness (finish the operational chain)

| Gap | Add |
|-----|-----|
| Demand exists; **UM/UIM claim** has no standalone procedure | ✅ Added [49 — UM/UIM & first-party claims](articles/49-um-uim-and-first-party-claims.md) (setoffs, stacking, consent-to-settle) |
| Wage-loss/lost-earnings documentation is referenced, not detailed | ✅ Added [50 — Wage-loss & lost-earning-capacity documentation](articles/50-wage-loss-documentation.md) |
| Property damage (03) is thin on total-loss/diminished-value/rental | ✅ Added [51 — Property damage: total loss, diminished value, rental & deductible](articles/51-property-damage-total-loss-and-diminished-value.md) |
| Records retrieval process assumes manual | ✅ Added [52 — Records retrieval & vendor management](articles/52-records-retrieval-and-vendors.md) |
| Other liens on recovery | ✅ Added [53 — Non-medical liens & claims](articles/53-non-medical-liens-and-claims.md) |
| Bad-faith handling | ✅ Folded into [49 — UM/UIM & first-party claims](articles/49-um-uim-and-first-party-claims.md) (policy-limits time-limit demands) |
| Client experience is procedural | **Client-communication template library** (multilingual, esp. EN/ES) — *still open* |

### P2 — Enhancement / product & data

| Gap | Add |
|-----|-----|
| Checklists mostly prose | ✅ Added [`checklists/phase-checklists.json`](checklists/phase-checklists.json) (13 phases, 58 items, article refs + attorney gates) |
| KPIs/case-grade referenced | ✅ Added [KPIS_AND_CASE_GRADE.md](KPIS_AND_CASE_GRADE.md) |
| Valuation is attorney-gated (correctly) | ✅ Added [DAMAGES_WORKSHEET.md](DAMAGES_WORKSHEET.md) (data capture only) |
| Jurisdiction differences | ✅ Added [JURISDICTION_MATRIX.md](JURISDICTION_MATRIX.md) (template + methodology; verify-per-state) |
| Onboarding/training | Extend [`training-guides/`](./training-guides/) into a **certification path** per role — *still open* |
| Client experience | **Multilingual (EN/ES) client-communication template library** — *still open* |

## How PraxHQ improves the procedures

- **Automates the client-facing cadence** ([11](articles/11-client-call-cadence.md)), reminders, and document capture — reducing missed appointments and treatment gaps ([05](articles/05-treatment-gaps-and-mri-timing.md), [16](articles/16-treatment-compliance-coaching.md)).
- **Standardizes logistics** (towing, rides) as a repeatable, logged workflow tied to [PD timing](articles/03-property-damage-liability-timing.md).
- **Feeds structured data** back into the case file for the metrics/case-grade framework (P2) — the data foundation for later automation.
- **Keeps compliance visible**: every PraxHQ touchpoint carries the guardrails in [44](articles/44-referral-sources-and-marketing-compliance.md) and the [integration map](../praxhq/INTEGRATION_MAP.md).

## Suggested order

1. **P0** trust-accounting + firm HIPAA/data SOPs (compliance foundation for PraxHQ).
2. **Counsel review** of the PraxHQ model (research-memo checklist) — gate before build.
3. **P1** UM/UIM, wage-loss, PD expansion, records-retrieval (highest daily-use value).
4. **P2** structured checklists + metrics (the data layer PraxHQ needs).
5. Template library + state matrix as capacity allows.

*Everything here is process/compliance guidance, not legal advice. P0 and any fee/referral/data item require qualified counsel per jurisdiction.*
