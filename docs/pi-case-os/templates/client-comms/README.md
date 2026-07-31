# Client Communication Templates (Bilingual: EN / ES)

Short, white-label client-facing messages (SMS, email, or in-app push) that a personal-injury firm's staff sends at key points during a case.

## What this library is

- **Coordination messages, not legal advice.** Every template is limited to scheduling, status updates, and document requests. None of them explain legal rights, interpret law, or advise the client on what to do.
- **White-label.** No real firm name, attorney name, city, or state appears anywhere. Every variable field is a `{{PLACEHOLDER}}` your firm fills in at send time (see the placeholder list below).
- **Bilingual by default.** Each template ships with an **English (EN)** version and a formal, professional **Spanish (ES)** version (using "usted," not "tú"). The Spanish is written naturally for native speakers — it is not a literal machine translation.
- **No outcome or value language.** No template states, implies, or estimates a settlement amount, case value, fee amount, or likelihood of success. Template `08-settlement-next-steps.md` is deliberately neutral — it invites a call, it never announces a number.
- **Minimal health information.** Templates reference appointments and treatment only in general terms (date, time, provider, address). They do not include diagnoses, injury details, or other protected health information. Keep any client-specific health detail out of SMS/push channels; use your firm's secure, HIPAA-compliant system for anything more specific.

## Required before use

**These templates are drafts, not finished client documents.** Before any template goes into production use:

1. An attorney licensed in the relevant jurisdiction must review and approve the language.
2. Your firm must adapt wording for your jurisdiction's advertising, solicitation, and client-communication rules (these vary by state/bar).
3. Your firm must confirm the messaging channel (SMS, email, app push) meets your consent, opt-out, and record-retention obligations.
4. Placeholders must be replaced with your firm's real values before send — never send a template with unresolved `{{PLACEHOLDER}}` text.

See the full legal disclosure and document-review requirement: [`../../DISCLOSURE.md`](../../DISCLOSURE.md).

## Placeholder reference

| Placeholder | Meaning |
|---|---|
| `{{FIRM_NAME}}` | Your firm's name |
| `{{CLIENT_FIRST_NAME}}` | Client's first name |
| `{{CASE_MANAGER}}` | Assigned case manager's name |
| `{{DATE}}` | A specific date |
| `{{TIME}}` | A specific time |
| `{{PROVIDER}}` | Medical provider or facility name |
| `{{ADDRESS}}` | Appointment or office address |
| `{{PHONE}}` | Firm or case-manager phone number |
| `{{ITEM_LIST}}` | List of requested documents/items |

## Templates

| File | Use case |
|---|---|
| [`01-welcome-onboarding.md`](./01-welcome-onboarding.md) | Welcome message after sign-up; how the app/team works; what's next |
| [`02-appointment-reminder.md`](./02-appointment-reminder.md) | Reminder of an upcoming medical appointment |
| [`03-missed-appointment-followup.md`](./03-missed-appointment-followup.md) | Gentle follow-up after a missed/cancelled appointment; reschedule |
| [`04-treatment-checkin.md`](./04-treatment-checkin.md) | Periodic check-in on how the client is feeling / treatment progress |
| [`05-monthly-status-update.md`](./05-monthly-status-update.md) | Routine case-status update (no legal advice, no value) |
| [`06-missing-documents-request.md`](./06-missing-documents-request.md) | Request missing items from the client |
| [`07-demand-sent-update.md`](./07-demand-sent-update.md) | Notify client the demand/claim package was submitted |
| [`08-settlement-next-steps.md`](./08-settlement-next-steps.md) | Neutral "there's an update, let's schedule a call" — never states an amount |
| [`09-signing-appointment.md`](./09-signing-appointment.md) | Schedule an in-person/video signing appointment |
| [`10-closing-thank-you.md`](./10-closing-thank-you.md) | Case closed; thank-you and review request |

## Footer convention

Every message ends with a plain-language reminder of what it is:

> Coordination message — not legal advice. / Mensaje de coordinación — no es asesoría legal.

---

*These templates are part of the PraxiumLaw PI Case OS documentation set and are subject to the terms in [`../../DISCLOSURE.md`](../../DISCLOSURE.md).*
