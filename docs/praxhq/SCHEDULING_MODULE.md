# PraxHQ — Unified Scheduling Module (Firm + Providers)

**One scheduling engine, used by both sides.** The firm uses it to schedule client appointments, **court dates, hearings, depositions, mediations, and calls**; providers use it for patient appointments (WellSky-style block scheduling). Same data model, same calendar interop, and any event can launch a [PraxHQ Live](./LIVE_SESSION_AND_ESIGN.md) session inside the app.

## Who schedules what

| Scheduler | Event types |
|-----------|-------------|
| **Firm (attorney / case manager)** | Client meetings & **calls**, sign-up/disbursement signings, **court dates, hearings, depositions, mediations**, internal case tasks, SOL/deadline calendaring |
| **Provider (clinic)** | Patient treatment appointments, follow-ups, procedures, provider/room blocks |
| **Client (via app)** | Requests/confirms appointments and calls; gets reminders & directions |

## Event types & resources

- **Event types:** `client_appointment` (treatment) · `firm_client_meeting` · `call` · `court_date` · `deposition` · `mediation` · `internal_task` · `deadline` (SOL/statutory).
- **Resources:** attorney, case manager, provider, room/equipment — bookable with conflict detection.

## Data model

| Entity | Key fields |
|--------|-----------|
| **CalendarEvent** | id, type, title, case_id?, start, end, all_day, location/virtual, status, notes, **praxlive_session_id?** |
| **Attendee** | event_id, party (client/attorney/CM/provider/other), rsvp, notify_via |
| **Resource** | id, kind (person/room/equip), availability, blocks |
| **RecurrenceRule** | event_id, RRULE (RFC 5545), exceptions |
| **Reminder** | event_id, offset, channel (push/text/email/phone), sent_at |
| **ExternalCalendarLink** | user_id, provider (Google/Outlook/Apple/CalDAV), direction (import/export/2-way), token |
| **DeadlineLink** | event_id, case_id, deadline_type (SOL, response, discovery), source_article |

## Views

- **Firm case calendar** — everything for a matter (appointments, court, calls, deadlines) in one timeline.
- **Deadline / SOL calendar** — statutory and case deadlines with buffers; ties to [litigation handoff](../pi-case-os/articles/31-litigation-handoff-and-management.md) and the [lifecycle map](../pi-case-os/articles/00-case-lifecycle-and-workflow-map.md). *Never let an SOL run.*
- **Provider blocks** — drag-and-drop day/week with block/template scheduling, waitlist, recurring.
- **Client view** — their upcoming appointments/calls with reminders and directions ([customer journey](./CUSTOMER_JOURNEY.md)).

## Calendar interoperability (build to standards)

- **iCalendar / ICS (RFC 5545)** export + subscribe feeds; **CalDAV** two-way sync.
- One-click connect to **Google Calendar / Outlook / Apple Calendar**.
- Import an existing calendar so firms/clinics **build the itinerary in PraxHQ and export to their own system** (and pull theirs in).
- Reminders over push / text / email / phone (cuts no-shows → supports [treatment compliance](../pi-case-os/articles/16-treatment-compliance-coaching.md)).

## Link to PraxHQ Live

Any `call`, `firm_client_meeting`, or signing event can carry a **`praxlive_session_id`**. Tapping the event in the app **opens a live A/V session** with document co-browse and live e-sign — see [LIVE_SESSION_AND_ESIGN](./LIVE_SESSION_AND_ESIGN.md). Example: a "disbursement signing" event on the firm calendar opens as a PraxHQ Live call where the client signs on mobile.

## Guardrails

- Scheduling is a **neutral efficiency tool** — it does not create a paid steering arrangement between clinic and firm ([referral compliance](../pi-case-os/articles/44-referral-sources-and-marketing-compliance.md)).
- PHI in appointments follows minimum-necessary; rides/tow vendors get **no** medical detail.
- Deadlines are calendared but **the attorney owns** the legal deadline — the tool assists, it doesn't practice law.
