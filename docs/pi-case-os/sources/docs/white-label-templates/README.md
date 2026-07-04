# White-label templates (DOCX + PDF)

Firm-neutral letter and intake templates for PraxiumLaw.

## Pipeline

1. **PDF → DOCX** (`pdf2docx`) for PDF-only sources  
2. **Scrub** firm names / addresses / emails → `{{FIRM_NAME}}`, `{{ATTORNEY_NAME}}`, `{{FIRM_ADDRESS}}`, etc.  
3. **DOCX → PDF** (Microsoft Word via `docx2pdf`) for clean PDFs  

Also includes scrubbed copies of existing letter-template `.docx` files (NV/WA packs).

## Folders

| Path | Contents |
|------|----------|
| `docx/` | Editable Word templates (primary format for firms) |
| `pdf/` | Regenerated PDFs from scrubbed DOCX |

## Before use

1. Replace all `{{PLACEHOLDERS}}` with your firm details  
2. Have **licensed counsel** review language for your jurisdiction  
3. See [`../../../DISCLOSURE.md`](../../../DISCLOSURE.md) and [`../../../WHITE_LABEL.md`](../../../WHITE_LABEL.md)

## Notes

- Layout from PDF conversion may not be pixel-perfect (forms/checkboxes). Prefer DOCX for editing.  
- Scanned PDFs (image-only) convert poorly — use DOCX originals when available.  
- Non-PI files (leases, resumes) were excluded from this pack.  
