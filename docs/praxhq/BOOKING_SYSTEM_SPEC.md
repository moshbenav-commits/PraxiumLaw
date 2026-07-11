# PraxHQ Booking — Full Booking-System Spec (beyond WellSky)

Builds the [Unified Scheduling Module](./SCHEDULING_MODULE.md) into a complete **booking product** for medical providers and law firms. Competitive target: **WellSky-class medical scheduling** — match its table stakes, then win on the legal-medical coordination layer nobody else has.

*Competitive claims below are a working baseline for positioning; verify against WellSky's current feature set before publishing any comparison externally.*

## Positioning

WellSky (and peers) schedule **inside one healthcare organization**. PraxHQ Booking schedules **across the whole injury-case ecosystem** — clinic, law firm, client, transport — with the case as the organizing object. A clinic gets a modern scheduler; a firm gets treatment visibility; the client gets one app. That cross-org layer is the moat.

## Table stakes (match WellSky-class)

- Provider/room/equipment resource calendars, block + template scheduling, recurring visits, waitlists.
- Multi-location, multi-provider group scheduling; role-based access.
- Reminders (push/SMS/email/voice), confirmations, cancellation + reschedule flows.
- Authorization/visit-count tracking per care plan (visits authorized vs. used).
- Check-in, no-show, and completion statuses feeding reports.
- Standards interop: ICS/RFC 5545, CalDAV two-way, Google/Outlook/Apple connect ([scheduling module](./SCHEDULING_MODULE.md)); HL7 FHIR appointment resources for EHR integration (`CORE-BUILD`, phased).

## Differentiators (win)

| # | Capability | Why WellSky-class tools can't follow easily |
|---|-----------|---------------------------------------------|
| 1 | **Case-linked scheduling** — every appointment can carry `case_id`; treatment calendars, [treatment-gap detection](../pi-case-os/articles/05-treatment-gaps-and-mri-timing.md), and firm dashboards update in real time | They have no concept of a legal case |
| 2 | **Cross-org booking** — firm requests a slot at the clinic; clinic confirms; client sees it instantly; all three calendars stay in sync | Single-tenant architecture |
| 3 | **Gap-driven outreach** — a missed/uncancelled visit triggers the [treatment-compliance](../pi-case-os/articles/16-treatment-compliance-coaching.md) cadence automatically (client nudge → CM task → provider reschedule offer) | No downstream consumer of no-show events |
| 4 | **Transport-aware booking** — rides bookable as a linked resource on the appointment (no PHI to the vendor), cutting the #1 no-show cause for injury clients | Out of scope for them |
| 5 | **PraxHQ Live embedded** — any booking can open as an in-app A/V session with doc co-browse and e-sign ([LIVE_SESSION_AND_ESIGN](./LIVE_SESSION_AND_ESIGN.md)) | Separate telehealth stack |
| 6 | **Client self-serve in one app** — the injury client already lives in PraxHQ for their case; booking, reminders, directions, reschedule in the same place | Their patient is not their user |
| 7 | **Smart slotting** — offer slots that minimize treatment gaps and respect care-plan frequency (e.g. 3×/week chiro), waitlist auto-backfill on cancellations | Requires care-plan + case context |
| 8 | **Lien-practice awareness** — provider portal shows attorney-verified case status alongside the schedule ([PROVIDER_PORTAL](./PROVIDER_PORTAL.md)), so lien clinics can book confidently | No legal-side data at all |
| 9 | **White-label multi-tenant** — firms and clinics run it under their brand (Creytix agency-in-a-box model) | Enterprise single-brand product |

## Booking flows

1. **Provider-initiated** (classic): front desk books patient into a block; conflicts checked; reminders fan out.
2. **Firm-initiated**: CM requests appointment for client at connected clinic → clinic accepts/counters → booked. SLA timer on requests.
3. **Client-initiated**: client picks from offered slots in-app (only slots the clinic exposes to self-serve); identity already verified by the case relationship.
4. **System-initiated**: gap detector or care-plan frequency rule proposes bookings into open slots; human confirms (clinic side) — automation proposes, staff disposes.

## Data model additions (beyond scheduling module)

| Entity | Purpose |
|--------|---------|
| **CarePlan** | provider, client, case_id?, frequency rule, authorized visit count, duration window |
| **BookingRequest** | requester (firm/client/system), target provider, constraints, status, SLA timer |
| **TransportLink** | event_id, vendor, pickup, status — **no medical fields** |
| **VisitOutcome** | event_id, status (kept/no-show/cancelled/rescheduled), checked_in_at, note-to-firm flag (minimum-necessary) |
| **SlotPolicy** | per provider: which slots are self-serve bookable, lead times, buffer rules |

## No-show engine

Target: measurably beat clinic baseline no-show rates. Levers: multi-channel reminder ladder (T-72h confirm, T-24h remind, T-2h nudge with directions/ride link), one-tap reschedule instead of silent no-show, transport pairing, waitlist auto-backfill within minutes of a cancellation, no-show → same-day outreach task. Every lever is measured (see KPIs) — this is the headline ROI stat for clinic sales.

## Compliance

- PHI minimum-necessary between orgs: the firm sees attendance and treatment-phase status, **not clinical content**, unless records flow through the normal records rail. HIPAA BAAs per [HIPAA_COMPLIANCE](./HIPAA_COMPLIANCE.md).
- Scheduling remains a neutral efficiency tool — no steering, no pay-for-referral mechanics ([44](../pi-case-os/articles/44-referral-sources-and-marketing-compliance.md)); slot offers are availability-ranked, never firm-preferenced.
- Reminder content contains no diagnosis/treatment detail on unauthenticated channels (SMS/voice).

## KPIs

No-show rate vs. clinic baseline, fill rate (booked/available slots), waitlist-backfill latency, booking-request SLA compliance, treatment-gap days per case (the cross-org metric that proves the moat), reminder-channel effectiveness.

## Build phases

1. **P0** — resource calendars, blocks, reminders, ICS/CalDAV, VisitOutcome (parity core).
2. **P1** — cross-org BookingRequest flow, client self-serve, no-show engine, transport links (the moat).
3. **P2** — CarePlan/smart slotting, gap-driven proposals, FHIR interop, analytics pack (the lead).
