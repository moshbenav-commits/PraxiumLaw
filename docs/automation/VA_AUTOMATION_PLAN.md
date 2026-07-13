# Virtual-Assistant Automation & Phase-Out Plan

Plan to **automate the work currently done by offshore virtual assistants** (Philippines-based VA teams common in injury firms) so those functions run on PraxiumLaw/PraxHQ automation permanently, and the roles can be wound down. This doubles as a **sales asset**: the ROI story for every firm we sell to is "replace $X/month of VA labor with the platform."

**Principles:** capture the knowledge before winding anything down (VAs are the best source of edge-case truth — exit interviews and process recording are step zero); automate the *task*, gate the *judgment*; wind down by attrition/contract-end where possible and honor all contractual/labor obligations in the workers' jurisdiction (firm's employment counsel owns that piece — this doc plans the automation, not the HR execution).

## 1. Role inventory → task decomposition

Typical injury-firm VA roles (map each firm's actual roster to these; the [training guides](../pi-case-os/training-guides/) define the onboard version of the same roles):

| VA role | Core tasks |
|---------|-----------|
| **Intake VA** | Answer/qualify leads, run intake script, schedule signups, data entry into CMS |
| **Records/bills chaser** | Send record requests, call providers for status, log balances, upload documents |
| **Case-status VA** | Client check-in calls/texts, status updates, appointment reminders |
| **Medical scheduler** | Book/reschedule treatment appointments, track attendance |
| **Billing VA** | Key bills into spreadsheets, request itemized statements, maintain lien lists |
| **Demand-prep assistant** | Assemble records chronologically, fill demand shells, exhibit prep |
| **Admin/calendar VA** | Calendar maintenance, task chasing, mailbox triage, filing |

Step zero per firm: **task-log the actual VAs for 2 weeks** (activity categories, volumes, systems touched, exceptions encountered) → produces the firm-specific automation map and the true baseline cost.

## 2. Task → automation mapping

| VA task | Automated by | Residual human work |
|---------|--------------|---------------------|
| Lead qualification + script | Intake rail + [inbound script](../pi-case-os/articles/47-inbound-lead-intake-call-script.md) as guided flow; AI voice/chat intake where the firm opts in | Attorney-gated signup decision; empathy-critical calls stay human until quality bar is proven |
| Signup scheduling | [Booking](../praxhq/BOOKING_SYSTEM_SPEC.md) client self-serve + e-sign packet | Exceptions |
| CMS data entry | Structured intake → case record directly (no re-keying by design) | Verification queue on low-confidence extraction |
| Record requests + chasing | Records-request generator + the persistence letter loop ([Billing OS flow 1](../billing-os/AUTOMATION_SPEC.md)); vendor APIs ([52](../pi-case-os/articles/52-records-retrieval-and-vendors.md)) | Phone-only providers (shrinking set) — pooled human queue |
| Balance logging | Bill parsing to ledger (automated) | Exception queue |
| Client status updates | Case-phase-driven auto-updates (EN/ES [templates](../pi-case-os/templates/client-comms/)) on the [call cadence](../pi-case-os/articles/11-client-call-cadence.md); client app shows live status | CM handles the conversations that matter (bad news, coaching) |
| Appointment reminders + reschedules | No-show engine ([Booking spec](../praxhq/BOOKING_SYSTEM_SPEC.md)) | None |
| Treatment attendance tracking | VisitOutcome feed from provider portal | None |
| Bill keying / lien spreadsheets | [Billing OS](../billing-os/AUTOMATION_SPEC.md) ledger + lien state machine | Exception queue |
| Demand assembly | Chronology builder + demand shell auto-fill ([39](../pi-case-os/articles/39-demand-letter-drafting.md)) | Attorney drafting judgment (never automated) |
| Calendar/task chasing | Lifecycle engine tasks + deadline calendar (self-chasing) | None |
| Mailbox triage | Intake-mailbox classifier (same engine as [Citation OS §1](../citation-os/PIPELINE_SPEC.md)) | Low-confidence queue |

## 3. Phase-out sequence (per firm)

Each role retires through four stages; a role never skips a stage:

1. **Instrument** — task-log the role; wire its systems into the platform; measure baseline (volume, error rate, cycle time, cost).
2. **Assist** — automation drafts/prepares, VA reviews and sends. Error rate of automation vs. human is measured here. Exit criterion: automation ≥ human quality on 95%+ of volume for 4 consecutive weeks.
3. **Supervise** — automation executes, VA handles the exception queue only. Headcount for the role shrinks to the exception volume (typically 1 pooled person covering what several did).
4. **Retire** — exception queue is absorbed by onshore case managers as part of their normal work; role is closed permanently. Knowledge captured in stage 1–2 lives in the runbooks; **no re-hiring path — a regression reopens the exception queue, not the role.**

Recommended order (fastest wins first): reminders/attendance → status updates → bill keying/lien lists → records chasing → calendar/mailbox → demand assembly → intake (last: highest judgment + revenue risk).

## 4. Guardrails

- Anything client-facing keeps the firm's voice: templates are firm-approved before automation sends a single message.
- Attorney-judgment tasks are **out of scope permanently** (strategy, negotiation decisions, legal advice) — this plan eliminates *clerical* roles, not legal ones.
- Quality regression monitoring runs after retirement (KPIs below) — silent quality decay is the failure mode that makes firms re-hire.
- Data access for offshore staff during transition follows [firm HIPAA](../pi-case-os/articles/46-firm-hipaa-and-data-security.md) minimum-necessary rules; access is revoked at each stage boundary, not just at the end.

## 5. KPIs / ROI model

Per role: baseline monthly cost (fully loaded) → cost at each stage → $0 at retire, minus platform allocation. Quality: task error rate, cycle time, client-response latency, exception-queue volume trend (must trend down). **Firm-level headline: VA payroll eliminated per month vs. platform subscription — the sales pitch writes itself from this table.**
