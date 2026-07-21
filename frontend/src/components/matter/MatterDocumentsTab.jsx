import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { toast } from "sonner";
import { Copy, ExternalLink, Eye, Plus, ShieldCheck } from "lucide-react";
import PageLoader from "@/components/common/PageLoader";
import PdfViewerModal from "@/components/pdf/PdfViewerModal";
import { isPdfDoc, viewDocument } from "@/lib/documentsApi";

const TYPE_BADGE = {
  intake: "bg-blue-100 text-blue-900",
  medical: "bg-emerald-100 text-emerald-900",
  auto_insurance: "bg-amber-100 text-amber-900",
  health_subro: "bg-purple-100 text-purple-900",
  invoice_receipt: "bg-zinc-100 text-zinc-700",
  pleadings: "bg-slate-100 text-slate-800",
  misc: "bg-zinc-100 text-zinc-500",
};

function UploadTaxonomyModal({ open, file, catalog, onClose, onConfirm, uploading }) {
  const [docType, setDocType] = useState("misc");
  const [medicalCode, setMedicalCode] = useState("MR");
  const [providerLabel, setProviderLabel] = useState("");

  if (!open || !file) return null;

  const submit = (e) => {
    e.preventDefault();
    if (docType === "medical" && !medicalCode) {
      toast.error("Select MR, B, FE, or COR for medical documents");
      return;
    }
    onConfirm({ docType, medicalCode: docType === "medical" ? medicalCode : "", providerLabel });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" data-testid="upload-taxonomy-modal">
      <form onSubmit={submit} className="data-card p-5 max-w-md w-full space-y-4">
        <div className="overline">// classify upload</div>
        <p className="text-sm font-medium truncate">{file.name}</p>
        <p className="text-xs text-praxium-subtle">Every inbound item needs a type — drives Meds, insurance, and disbursement tabs.</p>

        <label className="block text-sm">
          <span className="text-xs font-mono uppercase text-praxium-subtle">Document type *</span>
          <select className="mt-1 w-full text-sm border border-praxium-line rounded-sm px-2 py-1.5" value={docType} onChange={(e) => setDocType(e.target.value)} required data-testid="upload-doc-type">
            {(catalog?.doc_types || []).map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </label>

        {docType === "medical" ? (
          <>
            <label className="block text-sm">
              <span className="text-xs font-mono uppercase text-praxium-subtle">Medical code *</span>
              <select className="mt-1 w-full text-sm border border-praxium-line rounded-sm px-2 py-1.5" value={medicalCode} onChange={(e) => setMedicalCode(e.target.value)} data-testid="upload-medical-code">
                {(catalog?.medical_codes || []).map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-xs font-mono uppercase text-praxium-subtle">Provider (for naming)</span>
              <input className="mt-1 w-full text-sm border border-praxium-line rounded-sm px-2 py-1.5" placeholder="Dr Smith / Hospital ABC" value={providerLabel} onChange={(e) => setProviderLabel(e.target.value)} />
            </label>
          </>
        ) : null}

        {(docType === "medical" || docType === "auto_insurance") ? (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
            Redaction will be required before carrier share (training checklist).
          </p>
        ) : null}

        <div className="flex gap-2 justify-end pt-2">
          <button type="button" className="btn-ghost text-sm" onClick={onClose} disabled={uploading}>Cancel</button>
          <button type="submit" className="btn-praxium text-sm" disabled={uploading}>{uploading ? "Uploading…" : "Upload"}</button>
        </div>
      </form>
    </div>
  );
}

function RedactionModal({ open, doc, checklist, onClose, onConfirm, busy }) {
  if (!open || !doc) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" data-testid="redaction-modal">
      <div className="data-card p-5 max-w-md w-full">
        <div className="overline mb-2">// redaction checklist</div>
        <p className="text-sm font-medium mb-2">{doc.name}</p>
        <p className="text-xs text-praxium-subtle mb-3">Confirm these items are redacted before carrier share:</p>
        <ul className="text-xs space-y-1 mb-4 list-disc pl-4">
          {(checklist || []).map((item) => <li key={item}>{item}</li>)}
        </ul>
        <div className="flex gap-2 justify-end">
          <button type="button" className="btn-ghost text-sm" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-praxium text-sm" disabled={busy} onClick={onConfirm}>
            {busy ? "Saving…" : "Redaction complete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MatterDocumentsTab({
  matterId,
  documents,
  reload,
  uploadLinkUrl,
  onCreateUploadLink,
  onCreateSignRequest,
  signDocId,
  setSignDocId,
  toggleDocVisible,
}) {
  const [catalog, setCatalog] = useState(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [pendingFile, setPendingFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [pdfViewer, setPdfViewer] = useState({ open: false, title: "", b64: "" });
  const [redactionDoc, setRedactionDoc] = useState(null);
  const [redactionBusy, setRedactionBusy] = useState(false);
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    api.get("/pi/documents/taxonomy").then((r) => setCatalog(r.data)).finally(() => setLoadingCatalog(false));
  }, []);

  const typeLabel = useCallback(
    (id) => catalog?.doc_types?.find((t) => t.id === id)?.label || id || "Unclassified",
    [catalog],
  );

  const onFilePick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPendingFile(file);
  };

  const uploadWithTaxonomy = async ({ docType, medicalCode, providerLabel }) => {
    if (!pendingFile) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", pendingFile);
    fd.append("matter_id", matterId);
    let name = pendingFile.name;
    if (docType === "medical" && medicalCode && providerLabel) {
      name = `${medicalCode} ${providerLabel} ${pendingFile.name}`;
    }
    fd.append("name", name);
    fd.append("doc_type", docType);
    if (docType === "medical") fd.append("medical_code", medicalCode);
    if (providerLabel) fd.append("provider_label", providerLabel);
    try {
      await api.post("/documents", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Uploaded");
      setPendingFile(null);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const patchTaxonomy = async (docId, patch) => {
    try {
      await api.patch(`/documents/${docId}/taxonomy`, patch);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Update failed");
    }
  };

  const confirmRedaction = async () => {
    if (!redactionDoc) return;
    setRedactionBusy(true);
    try {
      await api.patch(`/documents/${redactionDoc.id}/taxonomy`, { acknowledge_redaction: true });
      toast.success("Redaction marked complete");
      setRedactionDoc(null);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    } finally {
      setRedactionBusy(false);
    }
  };

  const openPdfView = async (docId, name) => {
    try {
      const data = await viewDocument(docId);
      setPdfViewer({ open: true, title: name || data.name, b64: data.data_b64 });
    } catch {
      toast.error("Could not open PDF");
    }
  };

  if (loadingCatalog) return <PageLoader label="Loading documents…" />;

  const filtered = filterType === "all"
    ? documents
    : documents.filter((d) => (d.taxonomy?.doc_type || "misc") === filterType);

  const unclassified = documents.filter((d) => !d.taxonomy?.doc_type || d.taxonomy.doc_type === "misc").length;

  return (
    <>
      <div className="data-card p-5" data-testid="matter-documents-tab">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="overline">// documents</div>
          <Link to="/training/article/18-document-taxonomy" className="text-xs text-praxium-accent hover:underline inline-flex items-center gap-1">
            <ExternalLink size={11} /> Taxonomy guide
          </Link>
        </div>

        {unclassified > 0 ? (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 mb-4">
            {unclassified} document(s) unclassified or misc — re-tag for PI file integrity.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2 mb-4">
          <label className="btn-praxium inline-flex cursor-pointer" data-testid="matter-upload-doc">
            <Plus size={14} /> Upload document
            <input type="file" onChange={onFilePick} className="hidden" />
          </label>
          <button type="button" className="btn-ghost text-xs" onClick={onCreateUploadLink}>
            <Copy size={12} /> Magic upload link
          </button>
          <button type="button" className="btn-ghost text-xs" onClick={onCreateSignRequest}>
            Request signature
          </button>
          <select className="input-praxium text-xs py-1" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">All types</option>
            {(catalog?.doc_types || []).map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
          {documents.some(isPdfDoc) ? (
            <select className="input-praxium text-xs py-1 max-w-[200px]" value={signDocId} onChange={(e) => setSignDocId(e.target.value)} title="PDF to send for signature">
              <option value="">Blank agreement PDF</option>
              {documents.filter(isPdfDoc).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          ) : null}
        </div>

        {uploadLinkUrl ? (
          <code className="text-[10px] font-mono block break-all bg-praxium-bg p-2 rounded-sm mb-4">{uploadLinkUrl}</code>
        ) : null}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-praxium-line">
              <th className="text-left py-2 overline">Name</th>
              <th className="text-left py-2 overline">Type</th>
              <th className="text-left py-2 overline">Redaction</th>
              <th className="text-left py-2 overline">Uploaded</th>
              <th className="text-left py-2 overline">Client</th>
              <th className="text-right py-2 overline">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-praxium-line">
            {filtered.map((d) => {
              const tax = d.taxonomy || {};
              const dt = tax.doc_type || "misc";
              const needsRedaction = dt === "medical" || dt === "auto_insurance";
              return (
                <tr key={d.id} data-testid={`doc-${d.id}`}>
                  <td className="py-2 font-medium max-w-[200px] truncate" title={d.name}>{d.name}</td>
                  <td className="py-2">
                    <select
                      className={`text-[10px] font-mono uppercase rounded px-1.5 py-0.5 border-0 ${TYPE_BADGE[dt] || TYPE_BADGE.misc}`}
                      value={dt}
                      onChange={(e) => patchTaxonomy(d.id, { doc_type: e.target.value })}
                    >
                      {(catalog?.doc_types || []).map((t) => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                    {tax.medical_code ? (
                      <span className="ml-1 text-[10px] font-mono text-praxium-subtle">{tax.medical_code}</span>
                    ) : null}
                  </td>
                  <td className="py-2 text-xs">
                    {needsRedaction ? (
                      tax.redaction_status === "complete" ? (
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={Boolean(tax.carrier_share_ok)}
                            onChange={(e) => patchTaxonomy(d.id, { carrier_share_ok: e.target.checked })}
                            title="OK for carrier share"
                          />
                          <ShieldCheck size={12} className="text-emerald-600" /> Carrier OK
                        </label>
                      ) : (
                        <button type="button" className="text-amber-700 underline text-xs" onClick={() => setRedactionDoc(d)}>
                          Redact pending
                        </button>
                      )
                    ) : (
                      <span className="text-praxium-subtle">—</span>
                    )}
                  </td>
                  <td className="py-2 text-xs font-mono text-praxium-subtle">{timeAgo(d.uploaded_at)}</td>
                  <td className="py-2">
                    <input type="checkbox" checked={Boolean(d.client_visible)} onChange={(e) => toggleDocVisible(d.id, e.target.checked)} title="Visible in client portal" />
                  </td>
                  <td className="py-2 text-right text-xs font-mono space-x-1">
                    {isPdfDoc(d) ? (
                      <button type="button" className="btn-ghost py-0.5 px-2 inline-flex items-center gap-1" onClick={() => openPdfView(d.id, d.name)}>
                        <Eye size={12} /> View
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="py-6 text-center text-xs text-praxium-subtle">No documents yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <UploadTaxonomyModal
        open={Boolean(pendingFile)}
        file={pendingFile}
        catalog={catalog}
        onClose={() => !uploading && setPendingFile(null)}
        onConfirm={uploadWithTaxonomy}
        uploading={uploading}
      />

      <RedactionModal
        open={Boolean(redactionDoc)}
        doc={redactionDoc}
        checklist={catalog?.redaction_checklist}
        onClose={() => setRedactionDoc(null)}
        onConfirm={confirmRedaction}
        busy={redactionBusy}
      />

      <PdfViewerModal open={pdfViewer.open} title={pdfViewer.title} pdfBase64={pdfViewer.b64} onClose={() => setPdfViewer({ open: false, title: "", b64: "" })} />
    </>
  );
}
