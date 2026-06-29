import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle, ScrollText } from "lucide-react";
import { toast } from "sonner";
import SignaturePad from "@/components/esign/SignaturePad";
import usePageMeta from "@/components/landing/usePageMeta";
import PageLoader from "@/components/common/PageLoader";
import { getSignLinkInfo, submitSignature } from "@/lib/esignApi";

export default function SignTokenPage() {
  usePageMeta({
    title: "Sign Document — Praxium",
    description: "Review and sign your document securely.",
  });
  const { token } = useParams();
  const [info, setInfo] = useState(null);
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

  if (error) {
    return (
      <div className="min-h-screen bg-praxium-bg flex items-center justify-center p-6">
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
      <div className="min-h-screen bg-praxium-bg flex items-center justify-center p-6">
        <div className="data-card p-8 max-w-md text-center">
          <CheckCircle className="mx-auto text-emerald-600 mb-4" size={40} />
          <h1 className="font-display font-black text-xl">Signature recorded</h1>
          <p className="text-sm text-praxium-subtle mt-2">
            Thank you. <strong>{info.document_title}</strong> was signed successfully. Your firm will receive a copy.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-praxium-bg flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-lg data-card p-6 sm:p-8">
        <div className="overline mb-2">// nativesign</div>
        <h1 className="font-display font-black text-2xl tracking-tight flex items-center gap-2">
          <ScrollText className="text-praxium-accent" /> {info.document_title}
        </h1>
        <p className="text-sm text-praxium-subtle mt-2">{info.title}</p>
        {info.matter ? (
          <p className="text-[10px] font-mono text-praxium-subtle mt-1">
            Matter {info.matter.case_number} — expires {new Date(info.expires_at).toLocaleDateString()}
          </p>
        ) : null}

        <label className="block mt-6">
          <span className="overline">Your name</span>
          <input
            className="input-praxium w-full mt-1"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            required
          />
        </label>

        <div className="mt-4">
          <span className="overline">Signature</span>
          <SignaturePad className="mt-1" onChange={setSignature} />
        </div>

        <button type="submit" className="btn-praxium w-full mt-6" disabled={submitting}>
          {submitting ? "Submitting…" : "Sign document"}
        </button>
      </form>
    </div>
  );
}
