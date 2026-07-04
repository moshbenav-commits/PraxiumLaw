import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Upload, CheckCircle, FileUp } from "lucide-react";
import { toast } from "sonner";
import { getUploadLinkInfo, uploadViaMagicLink } from "@/lib/portalApi";
import usePageMeta from "@/components/landing/usePageMeta";
import PageLoader from "@/components/common/PageLoader";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" data-testid="portal-upload-taxonomy-modal">
      <form onSubmit={submit} className="data-card p-5 max-w-md w-full space-y-4">
        <div className="overline">// classify upload</div>
        <p className="text-sm font-medium truncate">{file.name}</p>
        <p className="text-xs text-praxium-subtle">Help your legal team route this file — same taxonomy as staff uploads.</p>

        <label className="block text-sm">
          <span className="text-xs font-mono uppercase text-praxium-subtle">Document type *</span>
          <select className="mt-1 w-full text-sm border border-praxium-line rounded-sm px-2 py-1.5" value={docType} onChange={(e) => setDocType(e.target.value)} required>
            {(catalog?.doc_types || []).map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </label>

        {docType === "medical" ? (
          <>
            <label className="block text-sm">
              <span className="text-xs font-mono uppercase text-praxium-subtle">Medical code *</span>
              <select className="mt-1 w-full text-sm border border-praxium-line rounded-sm px-2 py-1.5" value={medicalCode} onChange={(e) => setMedicalCode(e.target.value)}>
                {(catalog?.medical_codes || []).map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-xs font-mono uppercase text-praxium-subtle">Provider</span>
              <input className="mt-1 w-full text-sm border border-praxium-line rounded-sm px-2 py-1.5" placeholder="Dr Smith / Hospital" value={providerLabel} onChange={(e) => setProviderLabel(e.target.value)} />
            </label>
          </>
        ) : null}

        <div className="flex gap-2 justify-end pt-2">
          <button type="button" className="btn-ghost text-sm" onClick={onClose} disabled={uploading}>Cancel</button>
          <button type="submit" className="btn-praxium text-sm" disabled={uploading}>{uploading ? "Uploading…" : "Upload"}</button>
        </div>
      </form>
    </div>
  );
}

export default function UploadTokenPage() {
  usePageMeta({
    title: "Secure Upload — Praxium",
    description: "Upload documents to your legal matter.",
  });
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);

  useEffect(() => {
    getUploadLinkInfo(token)
      .then(setInfo)
      .catch((err) => setError(err.response?.data?.detail || "Invalid or expired link"));
  }, [token]);

  const doUpload = useCallback(
    async (file, taxonomy) => {
      setUploading(true);
      try {
        const data = await uploadViaMagicLink(token, file, file.name, taxonomy);
        setDone(data.document);
        setPendingFile(null);
        toast.success("Upload complete");
      } catch (err) {
        toast.error(err.response?.data?.detail || "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [token]
  );

  const queueFile = useCallback((file) => {
    if (!file || uploading) return;
    setPendingFile(file);
  }, [uploading]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) queueFile(file);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-praxium-bg flex items-center justify-center p-6">
        <div className="data-card p-6 max-w-md text-center">
          <div className="overline mb-2">// upload unavailable</div>
          <p className="text-sm text-rose-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!info) return <PageLoader label="Loading upload link…" />;

  if (done) {
    return (
      <div className="min-h-screen bg-praxium-bg flex items-center justify-center p-6">
        <div className="data-card p-8 max-w-md text-center">
          <CheckCircle className="mx-auto text-emerald-600 mb-4" size={40} />
          <h1 className="font-display font-black text-xl">Upload received</h1>
          <p className="text-sm text-praxium-subtle mt-2">
            <strong>{done.name}</strong> was added to{" "}
            <strong>{info.matter?.case_number}</strong>. Your firm will review it shortly.
          </p>
          <button type="button" className="btn-ghost mt-6" onClick={() => setDone(null)}>
            Upload another file
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-praxium-bg flex items-center justify-center p-6">
      <UploadTaxonomyModal
        open={Boolean(pendingFile)}
        file={pendingFile}
        catalog={info.taxonomy_catalog}
        uploading={uploading}
        onClose={() => setPendingFile(null)}
        onConfirm={(taxonomy) => doUpload(pendingFile, taxonomy)}
      />

      <div className="w-full max-w-lg data-card p-6 sm:p-8">
        <div className="overline mb-2">// secure upload</div>
        <h1 className="font-display font-black text-2xl tracking-tight flex items-center gap-2">
          <Upload className="text-praxium-accent" /> Drop files here
        </h1>
        <p className="text-sm text-praxium-subtle mt-2">
          Matter: <span className="font-mono">{info.matter?.case_number}</span> — {info.matter?.title}
        </p>
        <p className="text-[10px] font-mono text-praxium-subtle mt-1">
          Link expires {new Date(info.expires_at).toLocaleString()}
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`mt-6 border-2 border-dashed rounded-sm p-10 text-center transition-colors ${
            dragOver ? "border-praxium-accent bg-praxium-accent/5" : "border-praxium-line"
          }`}
        >
          <FileUp className="mx-auto text-praxium-subtle mb-3" size={32} />
          <p className="text-sm text-praxium-subtle mb-4">Choose a file — you&apos;ll classify it before upload (max 25MB)</p>
          <label className="btn-praxium inline-flex cursor-pointer">
            Choose file
            <input
              type="file"
              className="hidden"
              disabled={uploading}
              onChange={(e) => queueFile(e.target.files?.[0])}
            />
          </label>
          {uploading && <p className="text-xs font-mono mt-3 text-praxium-subtle">Uploading…</p>}
        </div>
      </div>
    </div>
  );
}
