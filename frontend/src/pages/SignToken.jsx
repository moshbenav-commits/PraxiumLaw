import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle, Download, ScrollText } from "lucide-react";
import { toast } from "sonner";
import SignaturePad from "@/components/esign/SignaturePad";
import PdfViewer from "@/components/pdf/PdfViewer";
import usePageMeta from "@/components/landing/usePageMeta";
import PageLoader from "@/components/common/PageLoader";
import { b64ToBlobUrl, downloadB64File } from "@/lib/documentsApi";
import {
  getSignDocument,
  getSignLinkInfo,
  getSignedPdfPublic,
  submitSignature,
} from "@/lib/esignApi";

function useViewerWidth(max = 640) {
  const [width, setWidth] = useState(() =>
    typeof window !== "undefined" ? Math.min(window.innerWidth - 32, max) : max
  );
  useEffect(() => {
    const update = () => setWidth(Math.min(window.innerWidth - 32, max));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [max]);
  return width;
}

export default function SignTokenPage() {
  usePageMeta({
    title: "Sign Document — Praxium",
    description: "Review and sign your document securely.",
  });
  const { token } = useParams();
  const viewerWidth = useViewerWidth(640);
  const [info, setInfo] = useState(null);
  const [pdfB64, setPdfB64] = useState("");
  const [error, setError] = useState("");
  const [signature, setSignature] = useState("");
  const [signerName, setSignerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    getSignLinkInfo(token)
      .then((data) => {
        setInfo(data);
        setSignerName(data.signer_name || "");
        if (data.status === "signed") setDone(true);
      })
      .catch((err) => setError(err.response?.data?.detail || "Invalid or expired link"));
  }, [token]);

  useEffect(() => {
    if (!info || info.status === "signed") return;
    getSignDocument(token)
      .then((doc) => setPdfB64(doc.data_b64))
      .catch(() => toast.error("Could not load document preview"));
  }, [info, token]);

  const pdfUrl = useMemo(() => (pdfB64 ? b64ToBlobUrl(pdfB64) : null), [pdfB64]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!signature) {
      toast.error("Draw your signature first");
      return;
    }
    setSubmitting(true);
    try {
      const b64 = signature.replace(/^data:image\/png;base64,/, "");
      await submitSignature(token, { signature_png_b64: b64, signer_name: signerName.trim() });
      setDone(true);
      toast.success("Document signed");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not submit signature");
    } finally {
      setSubmitting(false);
    }
  };

  const downloadSigned = async () => {
    try {
      const data = await getSignedPdfPublic(token);
      downloadB64File(data.name, data.content_type, data.data_b64);
    } catch {
      toast.error("Download not available yet");
    }
  };

  if (error) {
    return (
      <div className="min-h-[100dvh] bg-praxium-bg flex items-center justify-center p-6">
        <div className="data-card p-6 max-w-md text-center">
          <div className="overline mb-2">// sign unavailable</div>
          <p className="text-sm text-rose-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!info) return <PageLoader label="Loading document…" />;

  if (done || info.status === "signed") {
    return (
      <div className="min-h-[100dvh] bg-praxium-bg flex items-center justify-center p-6">
        <div className="data-card p-8 max-w-md text-center">
          <CheckCircle className="mx-auto text-emerald-600 mb-4" size={40} />
          <h1 className="font-display font-black text-xl">Signature recorded</h1>
          <p className="text-sm text-praxium-subtle mt-2">
            Thank you. <strong>{info.document_title}</strong> was signed successfully. Your firm will receive a copy.
          </p>
          <button
            type="button"
            className="btn-praxium mt-6 inline-flex items-center gap-2 min-h-[44px]"
            onClick={downloadSigned}
          >
            <Download size={14} /> Download signed PDF
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-praxium-bg flex flex-col">
      <header className="shrink-0 px-4 pt-4 pb-2 sm:px-6">
        <div className="overline mb-1">// nativesign</div>
        <h1 className="font-display font-black text-xl sm:text-2xl tracking-tight flex items-center gap-2">
          <ScrollText className="text-praxium-accent shrink-0" size={22} /> {info.document_title}
        </h1>
        <p className="text-sm text-praxium-subtle mt-1">{info.title}</p>
        {info.matter ? (
          <p className="text-[10px] font-mono text-praxium-subtle mt-1">
            Matter {info.matter.case_number} — expires {new Date(info.expires_at).toLocaleDateString()}
          </p>
        ) : null}
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-4 sm:px-6">
        {pdfUrl ? (
          <div className="w-full max-w-2xl mx-auto">
            <p className="overline mb-2">Review document</p>
            <PdfViewer file={pdfUrl} fields={info.fields || []} maxWidth={viewerWidth} />
          </div>
        ) : (
          <p className="text-sm text-praxium-subtle text-center py-8">Loading PDF preview…</p>
        )}
      </div>

      <form
        onSubmit={onSubmit}
        className="sticky bottom-0 z-10 border-t border-praxium-line bg-praxium-bg/95 backdrop-blur-sm px-4 py-4 sm:px-6 safe-area-pb"
      >
        <div className="w-full max-w-2xl mx-auto space-y-3">
          <label className="block">
            <span className="overline">Your name</span>
            <input
              className="input-praxium w-full mt-1 min-h-[44px] text-base"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              autoComplete="name"
              required
            />
          </label>

          <div>
            <span className="overline">Signature</span>
            <SignaturePad className="mt-1" onChange={setSignature} mobile />
          </div>

          <button
            type="submit"
            className="btn-praxium w-full min-h-[48px] text-base"
            disabled={submitting}
          >
            {submitting ? "Submitting…" : "Sign document"}
          </button>
        </div>
      </form>
    </div>
  );
}
