import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import PdfViewer from "@/components/pdf/PdfViewer";
import { b64ToBlobUrl } from "@/lib/documentsApi";

const FIELD_TYPES = [
  { id: "signature", label: "Signature" },
  { id: "date", label: "Date" },
  { id: "text", label: "Signer name" },
];

function newField(page, x, y, type = "signature") {
  return {
    id: `f_${Date.now().toString(36)}`,
    type,
    page,
    x: Math.max(0, Math.min(0.85, x - 0.1)),
    y: Math.max(0, Math.min(0.9, y - 0.04)),
    w: type === "signature" ? 0.32 : 0.22,
    h: type === "signature" ? 0.08 : 0.06,
    label: FIELD_TYPES.find((t) => t.id === type)?.label || type,
  };
}

export default function PdfFieldEditor({
  pdfB64,
  initialFields = [],
  onSave,
  onCancel,
  saving = false,
}) {
  const [fields, setFields] = useState(initialFields);
  const [addType, setAddType] = useState("signature");
  const fileUrl = useMemo(() => (pdfB64 ? b64ToBlobUrl(pdfB64) : null), [pdfB64]);

  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  const onPageClick = (page, x, y) => {
    setFields((prev) => [...prev, newField(page, x, y, addType)]);
  };

  const removeField = (id) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSave = () => {
    if (fields.length === 0) {
      toast.error("Add at least one signature field");
      return;
    }
    onSave?.(fields);
  };

  if (!fileUrl) {
    return <p className="text-sm text-praxium-subtle">No PDF loaded.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="overline">Place fields</span>
        <select
          className="input-praxium text-xs py-1"
          value={addType}
          onChange={(e) => setAddType(e.target.value)}
        >
          {FIELD_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <span className="text-[10px] font-mono text-praxium-subtle">Click on the page to place · click field to remove</span>
      </div>
      <PdfViewer
        file={fileUrl}
        fields={fields}
        editable
        onPageClick={onPageClick}
        onRemoveField={removeField}
        maxWidth={560}
      />
      <div className="flex gap-2">
        <button type="button" className="btn-praxium" disabled={saving} onClick={handleSave}>
          {saving ? "Saving…" : "Save field layout"}
        </button>
        {onCancel ? (
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}
