import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Upload, CheckCircle, FileUp } from "lucide-react";
import { toast } from "sonner";
import { getUploadLinkInfo, uploadViaMagicLink } from "@/lib/portalApi";
import usePageMeta from "@/components/landing/usePageMeta";
import PageLoader from "@/components/common/PageLoader";

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

  useEffect(() => {
    getUploadLinkInfo(token)
      .then(setInfo)
      .catch((err) => setError(err.response?.data?.detail || "Invalid or expired link"));
  }, [token]);

  const uploadFile = useCallback(
    async (file) => {
      if (!file || uploading) return;
      setUploading(true);
      try {
        const data = await uploadViaMagicLink(token, file, file.name);
        setDone(data.document);
        toast.success("Upload complete");
      } catch (err) {
        toast.error(err.response?.data?.detail || "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [token, uploading]
  );

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
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
          <p className="text-sm text-praxium-subtle mb-4">Drag a file here or choose from your device (max 25MB)</p>
          <label className="btn-praxium inline-flex cursor-pointer">
            Choose file
            <input
              type="file"
              className="hidden"
              disabled={uploading}
              onChange={(e) => uploadFile(e.target.files?.[0])}
            />
          </label>
          {uploading && <p className="text-xs font-mono mt-3 text-praxium-subtle">Uploading…</p>}
        </div>
      </div>
    </div>
  );
}
