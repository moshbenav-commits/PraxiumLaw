import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ScrollText, Upload, Users, Plus, Copy } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { createSignRequest, listSignRequests } from "@/lib/esignApi";

const STATUS_LABEL = {
  pending: "Awaiting signature",
  signed: "Signed",
};

export default function NativeSign() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [matters, setMatters] = useState([]);
  const [form, setForm] = useState({
    matter_id: "",
    title: "Retainer agreement",
    document_title: "Retainer Agreement",
    signer_name: "",
    signer_email: "",
  });
  const [busy, setBusy] = useState(false);

  const reload = () => {
    setLoading(true);
    listSignRequests()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(reload, []);
  useEffect(() => {
    api.get("/matters").then((r) => setMatters(r.data?.items || r.data || [])).catch(() => setMatters([]));
  }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    if (!form.matter_id) {
      toast.error("Select a matter");
      return;
    }
    setBusy(true);
    try {
      const data = await createSignRequest(form.matter_id, {
        title: form.title,
        document_title: form.document_title,
        signer_name: form.signer_name,
        signer_email: form.signer_email,
      });
      const url = data.dev_sign_url || data.sign_request?.sign_url;
      if (url) {
        await navigator.clipboard.writeText(url);
        toast.success("Sign request created — link copied");
      } else {
        toast.success("Sign request emailed to signer");
      }
      setShowForm(false);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not create sign request");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="overline mb-2">// nativesign</div>
          <h1 className="font-display font-black text-3xl tracking-tight flex items-center gap-3">
            <ScrollText className="text-praxium-accent" /> NativeSign
          </h1>
          <p className="text-sm text-praxium-subtle mt-2 max-w-2xl">
            In-app e-signature v1 — canvas capture + signed PDF stub. DocuSign optional later.
          </p>
        </div>
        <button type="button" className="btn-praxium" onClick={() => setShowForm(true)} data-testid="esign-new">
          <Plus size={16} className="inline mr-1" /> New sign request
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="data-card p-5">
          <Upload className="text-praxium-accent mb-3" size={20} />
          <div className="font-display font-bold mb-1">Create request</div>
          <p className="text-xs text-praxium-subtle">Staff sends a magic link from any matter.</p>
        </div>
        <div className="data-card p-5">
          <Users className="text-praxium-accent mb-3" size={20} />
          <div className="font-display font-bold mb-1">Client signs</div>
          <p className="text-xs text-praxium-subtle">No account — draw signature on phone or desktop.</p>
        </div>
        <div className="data-card p-5">
          <ScrollText className="text-praxium-accent mb-3" size={20} />
          <div className="font-display font-bold mb-1">Audit trail</div>
          <p className="text-xs text-praxium-subtle">Timestamp + IP stored; PDF stub attached to request.</p>
        </div>
      </div>

      {showForm ? (
        <form onSubmit={onCreate} className="data-card p-6 mb-6 max-w-xl space-y-4">
          <h2 className="font-display font-bold">New sign request</h2>
          <label className="block text-sm">
            Matter
            <select
              className="input-praxium w-full mt-1"
              value={form.matter_id}
              onChange={(e) => setForm({ ...form, matter_id: e.target.value })}
              required
            >
              <option value="">Select matter…</option>
              {matters.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.case_number} — {m.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Request title
            <input className="input-praxium w-full mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </label>
          <label className="block text-sm">
            Document title
            <input className="input-praxium w-full mt-1" value={form.document_title} onChange={(e) => setForm({ ...form, document_title: e.target.value })} required />
          </label>
          <label className="block text-sm">
            Signer name
            <input className="input-praxium w-full mt-1" value={form.signer_name} onChange={(e) => setForm({ ...form, signer_name: e.target.value })} required />
          </label>
          <label className="block text-sm">
            Signer email
            <input type="email" className="input-praxium w-full mt-1" value={form.signer_email} onChange={(e) => setForm({ ...form, signer_email: e.target.value })} required />
          </label>
          <div className="flex gap-2">
            <button type="submit" className="btn-praxium" disabled={busy}>{busy ? "Sending…" : "Send sign link"}</button>
            <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      ) : null}

      <div className="data-card overflow-hidden">
        <div className="px-5 py-3 border-b border-praxium-line overline">Envelopes</div>
        {loading ? (
          <p className="p-5 text-sm text-praxium-subtle">Loading…</p>
        ) : items.length === 0 ? (
          <p className="p-5 text-sm text-praxium-subtle">No sign requests yet.</p>
        ) : (
          <ul className="divide-y divide-praxium-line">
            {items.map((item) => (
              <li key={item.id} className="px-5 py-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-xs text-praxium-subtle">
                    {item.signer_name} · {item.signer_email} · {STATUS_LABEL[item.status] || item.status}
                  </p>
                </div>
                {item.status === "pending" && item.sign_url ? (
                  <button
                    type="button"
                    className="btn-ghost text-xs flex items-center gap-1"
                    onClick={() => {
                      navigator.clipboard.writeText(item.sign_url);
                      toast.success("Sign link copied");
                    }}
                  >
                    <Copy size={12} /> Copy link
                  </button>
                ) : item.signed_at ? (
                  <span className="text-xs font-mono text-emerald-700">Signed {new Date(item.signed_at).toLocaleString()}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-praxium-subtle mt-4">
        Public sign page: <code className="font-mono">/sign/:token</code> · Configure{" "}
        <Link to="/settings" className="text-praxium-accent hover:underline">Resend</Link> in backend env for prod email delivery.
      </p>
    </div>
  );
}
