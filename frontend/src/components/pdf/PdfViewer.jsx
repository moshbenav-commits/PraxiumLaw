import { Document, Page, pdfjs } from "react-pdf";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const FIELD_COLORS = {
  signature: "border-emerald-500 bg-emerald-500/10",
  date: "border-blue-500 bg-blue-500/10",
  text: "border-amber-500 bg-amber-500/10",
};

function FieldOverlay({ field, interactive, onRemove }) {
  const style = {
    left: `${field.x * 100}%`,
    top: `${field.y * 100}%`,
    width: `${field.w * 100}%`,
    height: `${field.h * 100}%`,
  };
  return (
    <div
      className={cn(
        "absolute border-2 rounded-sm pointer-events-auto text-[9px] font-mono uppercase tracking-wide flex items-end p-0.5",
        FIELD_COLORS[field.type] || FIELD_COLORS.signature,
        interactive && "cursor-pointer hover:opacity-90"
      )}
      style={style}
      title={field.label || field.type}
      onClick={interactive && onRemove ? () => onRemove(field.id) : undefined}
      role="presentation"
    >
      <span className="truncate">{field.label || field.type}</span>
    </div>
  );
}

export default function PdfViewer({
  file,
  fields = [],
  pageFieldsFilter,
  className = "",
  editable = false,
  onPageClick,
  onRemoveField,
  maxWidth = 640,
}) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const docFile = useMemo(() => file, [file]);

  const visibleFields = fields.filter((f) => {
    const onPage = f.page === pageNumber - 1 || f.page === undefined;
    return pageFieldsFilter ? pageFieldsFilter(f, pageNumber - 1) : onPage;
  });

  return (
    <div className={cn("pdf-viewer", className)}>
      <div className="flex items-center justify-between gap-2 mb-2 text-xs font-mono text-praxium-subtle">
        <span>
          Page {pageNumber}
          {numPages ? ` / ${numPages}` : ""}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            className="btn-ghost py-0.5 px-2 text-[10px]"
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <button
            type="button"
            className="btn-ghost py-0.5 px-2 text-[10px]"
            disabled={!numPages || pageNumber >= numPages}
            onClick={() => setPageNumber((p) => Math.min(numPages || p, p + 1))}
          >
            Next
          </button>
        </div>
      </div>
      <div
        className={cn(
          "relative border border-praxium-line rounded-sm bg-white overflow-hidden mx-auto",
          editable && onPageClick && "cursor-crosshair"
        )}
        style={{ maxWidth }}
        onClick={
          editable && onPageClick
            ? (e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const y = (e.clientY - rect.top) / rect.height;
                onPageClick(pageNumber - 1, x, y);
              }
            : undefined
        }
      >
        <Document
          file={docFile}
          onLoadSuccess={({ numPages: n }) => {
            setNumPages(n);
            setPageNumber((p) => Math.min(p, n));
          }}
          loading={<p className="p-8 text-sm text-praxium-subtle">Loading PDF…</p>}
          error={<p className="p-8 text-sm text-rose-600">Could not load PDF.</p>}
        >
          <Page
            pageNumber={pageNumber}
            width={maxWidth}
            renderTextLayer
            renderAnnotationLayer
          />
        </Document>
        {visibleFields.map((f) => (
          <FieldOverlay
            key={f.id}
            field={f}
            interactive={editable}
            onRemove={onRemoveField}
          />
        ))}
      </div>
    </div>
  );
}
