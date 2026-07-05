import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Shield, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import PageLoader from "@/components/common/PageLoader";
import MarkdownContent from "@/components/training/MarkdownContent";

export default function DisclosureGate({ onAcknowledged }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get("/disclosure")
      .then((r) => setData(r.data))
      .catch(() => toast.error("Could not load disclosure"))
      .finally(() => setLoading(false));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!confirm) {
      toast.error("Check the box to confirm attorney review");
      return;
    }
    setBusy(true);
    try {
      await api.post("/disclosure/acknowledge", { confirm: true });
      toast.success("Disclosure acknowledged");
      onAcknowledged?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not save acknowledgment");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <PageLoader label="Loading disclosure…" />;

  return (
    <div className="fixed inset-0 z-[100] bg-praxium-bg flex items-center justify-center p-4" data-testid="disclosure-gate">
      <form onSubmit={submit} className="data-card max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl">
        <div className="p-5 border-b border-praxium-line shrink-0">
          <div className="overline mb-2 flex items-center gap-2">
            <Shield className="text-praxium-accent" size={14} /> required before use
          </div>
          <h1 className="font-display font-black text-xl tracking-tight">PI Case OS — Legal disclosure</h1>
          <p className="text-sm text-praxium-subtle mt-2">
            Every user must acknowledge before templates, exports, or case workflows.
          </p>
        </div>

        <div className="p-5 overflow-y-auto flex-1 prose prose-sm max-w-none">
          {data?.markdown ? <MarkdownContent markdown={data.markdown} /> : null}
        </div>

        <div className="p-5 border-t border-praxium-line shrink-0 space-y-4">
          <label className="flex items-start gap-3 text-sm cursor-pointer">
            <input type="checkbox" className="mt-1" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} data-testid="disclosure-confirm" />
            <span>
              I will <strong>edit all documents</strong> for our firm and have a <strong>licensed attorney</strong> review language before use with clients, carriers, providers, or courts.
            </span>
          </label>
          <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-sm px-3 py-2">
            <AlertTriangle size={14} className="shrink-0" />
            Not legal advice — your firm is solely responsible for professional services.
          </div>
          <button type="submit" className="btn-praxium w-full sm:w-auto" disabled={busy || !confirm}>
            {busy ? "Saving…" : "I acknowledge — continue to PraxiumLaw"}
          </button>
        </div>
      </form>
    </div>
  );
}
