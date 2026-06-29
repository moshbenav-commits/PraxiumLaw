"""PDF utilities — text extraction, signature merge, light page ops."""
from __future__ import annotations

import base64
import io
from typing import List, Optional, Tuple

from pypdf import PdfReader, PdfWriter
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


def is_pdf(content_type: Optional[str], name: str = "") -> bool:
    if content_type and "pdf" in content_type.lower():
        return True
    return name.lower().endswith(".pdf")


def page_count(data: bytes) -> int:
    try:
        return len(PdfReader(io.BytesIO(data)).pages)
    except Exception:
        return 0


def extract_text_from_pdf_bytes(data: bytes, max_chars: int = 500_000) -> str:
    try:
        reader = PdfReader(io.BytesIO(data))
        parts: List[str] = []
        for page in reader.pages:
            parts.append(page.extract_text() or "")
            if sum(len(p) for p in parts) > max_chars:
                break
        return "\n".join(parts)[:max_chars]
    except Exception:
        return ""


def _page_size(reader: PdfReader, page_index: int) -> Tuple[float, float]:
    page = reader.pages[page_index]
    box = page.mediabox
    return float(box.width), float(box.height)


def _draw_fields_on_page(
    c: canvas.Canvas,
    w: float,
    h: float,
    page_fields: List[dict],
    sig_img: ImageReader,
    signer_name: str,
    signed_at: str,
) -> None:
    for field in page_fields:
        fx = float(field.get("x", 0.1))
        fy = float(field.get("y", 0.8))
        fw = float(field.get("w", 0.25))
        fh = float(field.get("h", 0.08))
        ftype = field.get("type", "signature")
        x = fx * w
        y = h - (fy * h) - (fh * h)
        if ftype == "signature":
            c.drawImage(sig_img, x, y, width=fw * w, height=fh * h, mask="auto")
        else:
            c.setFont("Helvetica", max(8, min(14, fh * h * 0.45)))
            label = signed_at[:19].replace("T", " ") if ftype == "date" else signer_name[:80]
            c.drawString(x + 2, y + (fh * h * 0.25), label)


def merge_signature_fields(
    pdf_bytes: bytes,
    signature_png_b64: str,
    fields: List[dict],
    signer_name: str,
    signed_at: str,
) -> bytes:
    """Flatten signature/date/text overlays onto PDF pages."""
    reader = PdfReader(io.BytesIO(pdf_bytes))
    writer = PdfWriter()
    sig_bytes = base64.b64decode(signature_png_b64)
    sig_img = ImageReader(io.BytesIO(sig_bytes))

    fields_by_page: dict[int, List[dict]] = {}
    for field in fields or []:
        page_idx = int(field.get("page", 0))
        fields_by_page.setdefault(page_idx, []).append(field)

    overlay_pages: dict[int, bytes] = {}
    if not fields and reader.pages:
        fields_by_page[0] = []

    for page_idx in set(fields_by_page.keys()) | ({0} if not fields and reader.pages else set()):
        if page_idx < 0 or page_idx >= len(reader.pages):
            continue
        w, h = _page_size(reader, page_idx)
        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=(w, h))
        page_fields = fields_by_page.get(page_idx, [])
        if page_fields:
            _draw_fields_on_page(c, w, h, page_fields, sig_img, signer_name, signed_at)
        elif page_idx == 0 and not fields:
            c.drawImage(sig_img, 72, 72, width=200, height=60, mask="auto")
            c.setFont("Helvetica", 10)
            c.drawString(72, 50, f"Signed by {signer_name} at {signed_at[:19].replace('T', ' ')}")
        c.save()
        overlay_pages[page_idx] = buf.getvalue()

    for i, page in enumerate(reader.pages):
        if i in overlay_pages:
            overlay_reader = PdfReader(io.BytesIO(overlay_pages[i]))
            page.merge_page(overlay_reader.pages[0])
        writer.add_page(page)

    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


def create_blank_pdf(title: str, body_lines: List[str]) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(612, 792))
    c.setFont("Helvetica-Bold", 16)
    c.drawString(72, 720, title[:80])
    c.setFont("Helvetica", 12)
    y = 680
    for line in body_lines:
        c.drawString(72, y, line[:90])
        y -= 18
        if y < 72:
            break
    c.save()
    return buf.getvalue()


def reorder_pdf_pages(data: bytes, order: List[int]) -> bytes:
    reader = PdfReader(io.BytesIO(data))
    writer = PdfWriter()
    for idx in order:
        if 0 <= idx < len(reader.pages):
            writer.add_page(reader.pages[idx])
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


def append_pdf_pages(base: bytes, extra: bytes) -> bytes:
    base_reader = PdfReader(io.BytesIO(base))
    extra_reader = PdfReader(io.BytesIO(extra))
    writer = PdfWriter()
    for page in base_reader.pages:
        writer.add_page(page)
    for page in extra_reader.pages:
        writer.add_page(page)
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()
