# PraxHQ Live — In-App Sessions, Document Co-Browse & Live E-Sign

**PraxHQ Live** is an in-app A/V session (think Zoom, but inside PraxHQ and tied to the case) where the firm can **talk to the client, walk them through a document on a shared screen, and have them sign it live from their phone.** It turns "I'm sending you some documents — you'll see them right now" into one seamless, logged interaction.

> **Not legal advice / attorney present:** for any legal document (retainer, release, disbursement statement), the **attorney or supervised staff** runs the session; PraxHQ provides the pipe and the signature rails, not legal advice.

## What a session includes

| Feature | What it does |
|---------|--------------|
| **A/V call** | In-app video/voice (WebRTC), 1:1 or small group (client, attorney, CM, interpreter) |
| **Document co-browse** | Presenter opens a PDF; **the client's view scrolls/zooms in sync** as they're walked through it ("this is the paragraph you're signing") |
| **Live push** | Firm drops a doc into the live session; it **appears on the client's screen instantly** |
| **Live e-signature** | Client signs on their **mobile** during the call; signature drops into the doc in real time; all parties see it complete |
| **Annotations** | Highlight/point at clauses while talking |
| **Interpreter mode** | Add an interpreter to the session (EN/ES priority) |
| **Audit + recording** | Timestamped event log; optional recording **with consent** (mind two-party-consent states) |

## Typical uses

- **Sign-up:** walk through and sign the retainer/HIPAA/intake packet ([23](../pi-case-os/articles/23-intake-forms-and-signature-packet.md)).
- **Disbursement:** review the disbursement statement/release line-by-line and sign ([27](../pi-case-os/articles/27-settlement-and-disbursement-workflow.md)).
- **Any milestone call** the [scheduler](./SCHEDULING_MODULE.md) launches.

## Live e-signature — compliance

Electronic signatures are valid under the federal **ESIGN Act** and state **UETA** when done right. Build for these elements (confirm specifics with counsel):

- **Intent to sign** and **consent to do business electronically** (captured and logged).
- **Attribution / identity** — verify who is signing (login + the invite-code identity link below; step-up verification for high-stakes docs).
- **Association** of the signature with the specific record and its terms.
- **Audit trail** — who, what, when, IP/device, doc hash/version.
- **Record retention & reproduction** — store the signed PDF + audit certificate; let the client download a copy.
- Some documents have **special formalities** (notarization, witnesses); flag those — remote online notarization (RON) may be needed and is state-specific.

## Onboarding & invite-code flow

Exactly the sequence you described — code first, then sign-up, then sign from mobile:

1. **Firm generates an invite code** for the client (tied to the specific case/matter) from the firm console.
2. **Firm shares the code** ("download the PraxHQ app; here's your code").
3. **Client downloads PraxHQ**, opens it, and **enters the code** (or taps a deep link).
4. **Identity link:** the code maps the client to their case and pre-fills who they are; client completes **sign-up** (name, mobile verify, consent to e-records).
5. **Account linked to their case** — client now sees their journey, messages, and any pending documents.
6. **Sign from mobile:** pending docs (or a live session) let them **e-sign on their phone**; signed docs flow into the case file with the audit trail.

```
Firm console ──(generate)──▶ Invite code ──▶ Client downloads app ──▶ enters code
      │                                                                   │
      └──────────────── case_id linked ◀── sign-up + verify + consent ◀───┘
                                   │
                                   ▼
                     Sees case · joins PraxHQ Live · e-signs from mobile
```

**Data:** `InviteCode { code, case_id, client_ref, created_by, expires_at, used_at }` — single-use, expiring, case-scoped.

## Security & privacy

- Sessions and documents are encrypted; recordings (if any) are access-controlled and consented.
- If **PHI** is shown in a session, HIPAA applies ([HIPAA_COMPLIANCE](./HIPAA_COMPLIANCE.md)); minimum-necessary.
- Invite codes are **single-use, case-scoped, and expiring**; revoke on misuse.
- Signed legal documents remain attorney-supervised; the app is the delivery + signature rail.

## Where this sits

[Scheduling](./SCHEDULING_MODULE.md) launches Live sessions · [Customer journey](./CUSTOMER_JOURNEY.md) is where the client experiences them · [Provider portal](./PROVIDER_PORTAL.md) can use Live for provider calls · guardrails in [LEGAL_REGULATORY_RESEARCH](./LEGAL_REGULATORY_RESEARCH.md).
