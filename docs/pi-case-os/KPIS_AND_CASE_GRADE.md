# PraxiumLaw PI Case OS — KPIs & Case-Grade Framework

Metrics for running the practice and grading how each case was handled. Firm-neutral; adapt targets to your firm. Feeds the [case-management system](articles/36-case-management-system-setup.md) and the [gap roadmap](GAP_ANALYSIS_AND_ROADMAP.md) P2 data layer. Not legal advice — see [`DISCLOSURE.md`](./DISCLOSURE.md).

## Why measure

You can't improve what you don't track. These KPIs surface stuck cases, treatment-compliance problems, demand/settlement performance, and staff workload — early, while you can still act.

## Pipeline / operational KPIs

| KPI | Definition | Why it matters |
|-----|-----------|----------------|
| **Cycle time by phase** | Days a matter sits in each [lifecycle phase](articles/00-case-lifecycle-and-workflow-map.md) | Finds bottlenecks (e.g., demand stuck in records) |
| **Time-to-sign** | Lead → signed retainer | Intake efficiency |
| **Time-to-treatment** | Sign-up → first appointment | Early care = better case + client |
| **Records turnaround** | Request → received, by provider | Predicts demand readiness ([52](articles/52-records-retrieval-and-vendors.md)) |
| **Demand cycle** | Records complete → demand sent → response | Negotiation velocity |
| **Aging report** | Matters exceeding phase SLA | Prevents drift and SOL risk |
| **Open matters per case manager** | Active load | Capacity planning |
| **SOL/deadline exceptions** | Deadlines within buffer | **Zero-tolerance** watch |

## Outcome / financial KPIs

| KPI | Definition |
|-----|-----------|
| **Settlement vs. specials** | Recovery relative to medical specials |
| **Reduction capture** | $ saved via [reductions](articles/26-reduction-requests-and-negotiation.md) / total lien balances |
| **Net-to-client %** | Client's net ÷ gross recovery |
| **Fee realization** | Earned fee vs. expected |
| **Cost per case** | Advanced costs by case type |
| **Referral/source ROI** | Signed cases and value by lead source ([44](articles/44-referral-sources-and-marketing-compliance.md)) |

## Case grade (per-matter scorecard)

Grade each closed (and mid-stream) matter to coach staff and spot process gaps. Suggested factors (weight to taste):

- **Treatment management** — gaps avoided, imaging timed, compliance ([05](articles/05-treatment-gaps-and-mri-timing.md), [16](articles/16-treatment-compliance-coaching.md))
- **Records completeness** — bills/records/CORs complete before demand ([09](articles/09-demand-prep-checklist.md))
- **Documentation hygiene** — everything to file, correct taxonomy ([18](articles/18-document-taxonomy.md), [34](articles/34-correspondence-and-communications.md))
- **Lien handling** — all liens (medical, [subro](articles/29-health-insurance-subrogation.md), [non-medical](articles/53-non-medical-liens-and-claims.md)) identified and resolved
- **Financial outcome** — net-to-client, reduction capture
- **Compliance** — attorney gates respected, trust clean ([45](articles/45-trust-accounting-and-reconciliation.md)), no ethics flags
- **Client experience** — responsiveness, reviews

Output a simple **A–F or 1–5** per factor + overall, with notes. Review grades in the [QA/case-audit role](training-guides/case-manager.md).

## Guardrails

- Metrics inform **operations**, not case value — valuation stays an [attorney judgment](GAP_ANALYSIS_AND_ROADMAP.md).
- Never let a KPI incentivize under-treating clients, over-notifying providers, or any [referral/kickback](articles/44-referral-sources-and-marketing-compliance.md) shortcut.
- Keep client data secure ([46](articles/46-firm-hipaa-and-data-security.md)); aggregate/anonymize where possible.
