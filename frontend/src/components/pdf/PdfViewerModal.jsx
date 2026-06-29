import { useEffect, useMemo } from "react";
import { X } from "lucide-react";
import PdfViewer from "@/components/pdf/PdfViewer";
import { b64ToBlobUrl } from "@/lib/documentsApi";

export default function PdfViewerModal({ open, title, pdfB64, onClose, fields = [] }) {
  const fileUrl = useMemo(() => (open && pdfB64 ? b64ToBlobUrl(pdfB64) : null), [open, pdfB64]);

  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="data-card w-full max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="overline mb-1">// pdf viewer</div>
            <h2 className="font-display font-bold text-lg">{title || "Document"}</h2>
          </div>
          <button type="button" className="btn-ghost p-2" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {fileUrl ? (
          <PdfViewer file={fileUrl} fields={fields} maxWidth={680} />
        ) : (
          <p className="text-sm text-praxium-subtle">Loading…</p>
        )}
      </div>
    </div>
  );
}
