# Citation OS — Document & Letter Matrix

Which instrument the pipeline generates at each stage, per citation type. Every template is white-label (`{{FIRM_NAME}}`, `{{ATTORNEY_NAME}}`, `{{COURT}}`, `{{CITATION_NO}}`, `{{CLIENT_NAME}}`), jurisdiction-parameterized, and **attorney-certified per jurisdiction before first live use** (see [PIPELINE_SPEC §3](./PIPELINE_SPEC.md)).

## By stage

| Stage | Instrument | Notes |
|-------|-----------|-------|
| Engagement | Limited-scope representation agreement + flat-fee agreement | E-sign packet; scope limited to the citation matter |
| Appearance | Entry/Notice of appearance of counsel | Required before court will talk to the firm |
| Plea/response | Not-guilty plea · written not-guilty (trial by declaration where offered) · nolo request | **Attorney selects**; deadline-critical |
| Discovery | Discovery/evidence request (officer notes, calibration/maintenance records, photo-enforcement imagery) | Gaps found here feed the mitigation pack |
| Scheduling | Continuance motion · remote-appearance request | Uses court's local form where one exists |
| Mitigation | Mitigation letter with exhibits · proof-of-correction submission ("fix-it") · hardship statement | Assembled by the mitigation pack builder |
| Negotiation | Amendment request (non-moving / no-point) · deferral request · fine-reduction request · traffic-school/diversion request · payment-plan request | One template per **ask-ladder rung** |
| Follow-up | Status-inquiry letter (+14/+30d) · records-confirmation request | The "keep the letters moving" loop |
| Resolution | Disposition acceptance · dismissal confirmation request · compliance-completion filing | Client consent recorded first |
| Closeout | Client closing letter (outcome, obligations, point/insurance info flag) | Bilingual EN/ES like [client-comms templates](../pi-case-os/templates/client-comms/) |

## By citation type — deltas

| Type | What changes |
|------|--------------|
| **Moving violation (officer-issued)** | Full matrix applies; discovery targets officer notes/equipment |
| **Photo enforcement (red light / speed camera)** | Add: identity/driver-affidavit response, calibration + signage discovery; many jurisdictions treat as civil — different response form and negotiation counterparty |
| **Parking** | Administrative appeal letter track (no plea); agency-level review then hearing request |
| **Equipment ("fix-it")** | Proof-of-correction + inspection sign-off path first; dismissal-on-compliance letter |
| **Code enforcement / municipal notice** | Cure-period response letter, extension request, compliance-evidence submission |
| **Minor misdemeanor citation** | **Escalation flag** — attorney decides whether it stays in the pipeline or moves to full criminal representation; system only calendars and assembles |

## Template rules

- Same rules as the PI system: [no fabrication, white-label, counsel review, attorney gates](../pi-case-os/README.md#product-rules).
- Templates carry a `jurisdiction_certified_by` + date; a change to court rules voids certification and re-flags the template.
- Every generated document embeds the citation record's verified fields only — an unverified field blocks generation rather than guessing.
