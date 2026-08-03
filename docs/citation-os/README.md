# PraxiumLaw Citation OS — Ticket Resolution Pipeline

White-label system for handling **citations that arrive by mail/email** (traffic tickets, parking/photo-enforcement citations, code-enforcement notices, minor misdemeanor citations): detect the ticket, extract its facts, generate and submit the correct legal documents, run the correspondence loop, and **negotiate the penalty down** — with the attorney owning every legal decision.

**Status:** spec only — product code not built. Companion to the [PI Case OS](../pi-case-os/README.md) and reuses its intake, document, and communication rails.

## Documents

| Doc | Purpose |
|-----|---------|
| [`PIPELINE_SPEC.md`](./PIPELINE_SPEC.md) | End-to-end pipeline: mail intake → extraction → document generation → submission → negotiation → resolution. State machine + automation map. |
| [`DOCUMENT_AND_LETTER_MATRIX.md`](./DOCUMENT_AND_LETTER_MATRIX.md) | Which document/letter to file at each stage, per citation type; template rules. |

## Required reading

Everything in [`../pi-case-os/DISCLOSURE.md`](../pi-case-os/DISCLOSURE.md) and [`../pi-case-os/WHITE_LABEL.md`](../pi-case-os/WHITE_LABEL.md) applies. In addition:

- **UPL guardrail.** Selecting a plea, deciding to contest, and negotiating with a prosecutor are the **practice of law**. The pipeline drafts, calendars, tracks, and submits **only what a licensed attorney has approved** for that jurisdiction and matter. Automation never "decides the defense."
- **Jurisdiction variance is extreme.** Courts differ on e-filing vs. mail-only, trial-by-declaration availability, traffic-school eligibility, and whether attorneys may appear without the client. Every jurisdiction gets a row in the [Jurisdiction Matrix](../pi-case-os/JURISDICTION_MATRIX.md) **before** the pipeline is enabled there.
- **Deadlines are unforgiving.** A missed response date converts a negotiable fine into a default judgment, license hold, or warrant. Deadline calendaring uses the same SOL-grade rules as the PI system (*never let a deadline run*).
- **No fee promises.** Marketing may not guarantee dismissal or reduction outcomes.

## Where it lives

Citation OS is a **practice-area module** on the shared PraxiumLaw core — see [`../practice-areas/README.md`](../practice-areas/README.md) for the core-vs-module architecture it plugs into.
