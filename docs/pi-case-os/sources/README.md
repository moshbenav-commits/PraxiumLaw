# PraxiumLaw PI Case OS — Source Corpus (internal only)

Raw personal-injury training materials used to derive the product. **Do not ship this folder to customers.**

**Published product** must be **white-label** and show [`../DISCLOSURE.md`](../DISCLOSURE.md). See [`../WHITE_LABEL.md`](../WHITE_LABEL.md).

All **text** files in this corpus have been scrubbed of historical firm names (replaced with `the firm` / `the attorney` / `{{FIRM_*}}` placeholders).

**Binary templates** (`.docx` / `.pdf`) may still contain old letterhead inside the file body. Treat them as **patterns only** — firms must replace branding and have counsel review language before use.

## Layout

| Path | Contents |
|------|----------|
| `docs/pi-training-docs/` | PI docs, PDFs, questionnaires, workflows |
| `docs/pi-training-docs/letter-templates/` | Original letter/form templates (patterns; may have old branding in binaries) |
| `docs/white-label-templates/` | **Scrubbed** DOCX + regenerated PDFs (`{{FIRM_NAME}}` placeholders) — use these |
| `training-pi/` | How-to scripts (docx) — text also in `training-pi-text/` |
| `training-pi-text/` | All Training PI docx extracted to `.txt` (scrubbed) |
| `transcripts/` | Video training transcripts (scrubbed text only — no raw video) |
| `../intake-calls/` | Intake audio **transcripts** (`.txt` only — no raw audio) |
| `google-drive-stubs/` | Knowledge titles only (bodies not local) |
| `notes/` | Intake field notes (scrubbed) |
