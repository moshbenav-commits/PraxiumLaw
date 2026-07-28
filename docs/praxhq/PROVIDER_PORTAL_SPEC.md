# PraxHQ — Provider Portal: Data Model & Tab Layout

A build sketch for the doctor/clinic portal ([concept](./PROVIDER_PORTAL.md)). Platform-neutral; adapt field names to the [case-management system](../pi-case-os/articles/36-case-management-system-setup.md). **PHI everywhere here → BAA + Security Rule** ([HIPAA](./HIPAA_COMPLIANCE.md)).

## Data model (core entities)

| Entity | Key fields | Notes |
|--------|-----------|-------|
| **Provider** (clinic/org) | id, name, type, addresses, tax id, remittance address, BAA status/date | The org account |
| **ProviderUser** | id, provider_id, name, role (admin/scheduler/biller/clinician), email, auth | Role-based access |
| **PatientLink** | id, provider_id, case_id (firm), patient_name, DOB (masked), DOL, status | **Minimum-necessary** link between a clinic patient and a firm case |
| **RecordsRequest** | id, case_id, provider_id, type (records/bills/COR/futures), date_range, status, due | Firm → provider ask; ties to [21](../pi-case-os/articles/21-medical-lor-workflow.md), [20](../pi-case-os/articles/20-certificate-of-records.md) |
| **Submission** | id, request_id, files[], submitted_by, date, cert_of_records? | Provider → firm response |
| **Appointment** | id, patient_link_id, provider_user_id, resource_id, start, end, type, status, reminders[] | Shared with [Scheduling module](./SCHEDULING_MODULE.md) |
| **ScheduleBlock** | id, provider_id, resource_id, template, recurrence, capacity | Block/template scheduling |
| **BillLedger** | id, patient_link_id, line_items[], billed_total, adjustments, paid, balance, lien/LOP_status | Feeds firm [disbursement](../pi-case-os/articles/25-disbursement-sheet-preparation.md)/[subrogation](../pi-case-os/articles/29-health-insurance-subrogation.md) |
| **Document** | id, provider_id, template_id, type, generated_pdf, branding | Doc-gen output |
| **Message** | id, thread, case_id, sender, body, attachments, logged_to_file | Threads to firm file ([34](../pi-case-os/articles/34-correspondence-and-communications.md)) |
| **Consent/BAA** | id, provider_id, type, signed_by, date, doc | Gate for PHI flows |

## Tab layout

| Tab | Purpose | Key elements / fields | Primary actions |
|-----|---------|-----------------------|-----------------|
| **Dashboard** | At-a-glance | Open requests, today's appointments, unsent submissions, overdue items | Jump to item |
| **Requests / Inbox** | Firm asks | List by case/patient: type, due date, status; filters | Fulfill, upload, mark complete |
| **Scheduling** | Appointments (Tier 1) | Calendar (day/week/month), provider/room blocks, waitlist, reminders | Book, drag-drop, recur, **export ICS**, launch [PraxHQ Live](./LIVE_SESSION_AND_ESIGN.md) |
| **Billing** | Statements & liens (Tier 2) | Ledger per patient: billed, adjustments, paid, balance, **lien/LOP status**, reduction state | Generate bill/statement, mark reduction, export settlement-ready ledger |
| **Records** | Medical docs | Records by patient/DOS; certificates of records; futures estimates | Attach, submit, request signature |
| **Documents** | Doc generator (Tier 2) | Templates: LOP, cover sheet, billing statement, records affidavit; provider branding | Generate → PDF, send to firm |
| **Messages** | Comms | Threads per case; attachments; status | Message firm, log to file |
| **Settings** | Admin | Users/roles, BAA status, calendar connections, branding, remittance | Manage users, connect Google/Outlook |

## Scheduling tab (detail)

Drag-and-drop calendar with **block/template scheduling** per provider/room/resource; recurring & multi-step visits; **waitlist** auto-fill on cancellations; automated **text/email/phone reminders**; per-specialty labels. Interop: **iCalendar/ICS export + subscribe, CalDAV sync, Google/Outlook/Apple export**, so a clinic builds its itinerary here and pushes it to their own system. Any appointment can be flagged **"PraxHQ Live"** to open an in-app call. (Same engine as the firm scheduler — see [SCHEDULING_MODULE](./SCHEDULING_MODULE.md).)

## Billing tab (detail)

Per-patient ledger: itemized line items → **billed total**, adjustments/write-offs, insurance/MedPay credits, **balance**, and **lien/LOP status** synced to the firm's [disbursement sheet](../pi-case-os/articles/25-disbursement-sheet-preparation.md). Generate itemized statements and reduction/settlement-ready ledgers via the doc generator. **Reminder:** billing here is for *services rendered*; it is never a referral fee (see [portal guardrails](./PROVIDER_PORTAL.md)).

## Access & security

Role-based (admin/scheduler/biller/clinician); a provider user sees **only their org's patients**; encryption + audit logging; minimum-necessary throughout. Towing/roadside vendors are a **separate** vendor app and never see this data.
