import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { PRACTICE_AREAS, STATUSES } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function NewMatter() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    title: "", practice_area: "personal_injury", status: "intake",
    description: "", incident_date: "", sol_date: "", value_estimate: "",
    client_id: "",
  });
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    api.get("/contacts?kind=client").then((r) => setClients(r.data));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, value_estimate: form.value_estimate ? parseFloat(form.value_estimate) : null };
      Object.keys(payload).forEach((k) => { if (payload[k] === "") payload[k] = null; });
      const r = await api.post("/matters", payload);
      toast.success("Matter created");
      nav(`/matters/${r.data.id}`);
    } catch (err) {
      toast.error("Failed to create matter");
    } finally { setLoading(false); }
  };

  return (
    <div className="px-6 py-6 max-w-3xl">
      <div className="overline mb-2">// new matter</div>
      <h1 className="font-display font-black text-3xl tracking-tight">Create matter</h1>
      <form onSubmit={submit} className="mt-8 space-y-5" data-testid="new-matter-form">
        <div>
          <label className="overline block mb-1.5">Title</label>
          <input value={form.title} onChange={upd("title")} required data-testid="matter-title"
            placeholder="Smith v. Acme Corp"
            className="w-full px-3 py-2 border border-praxium-line rounded-sm outline-none focus:border-praxium-accent" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="overline block mb-1.5">Practice area</label>
            <select value={form.practice_area} onChange={upd("practice_area")} data-testid="matter-practice"
              className="w-full px-3 py-2 border border-praxium-line rounded-sm bg-white">
              {PRACTICE_AREAS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="overline block mb-1.5">Status</label>
            <select value={form.status} onChange={upd("status")} data-testid="matter-status"
              className="w-full px-3 py-2 border border-praxium-line rounded-sm bg-white">
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="overline block mb-1.5">Client</label>
          <select value={form.client_id} onChange={upd("client_id")} data-testid="matter-client"
            className="w-full px-3 py-2 border border-praxium-line rounded-sm bg-white">
            <option value="">— Select a client —</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name} {c.patient_id ? `(${c.patient_id})` : ""}</option>)}
          </select>
          <p className="text-[10px] font-mono text-praxium-subtle mt-1">Need a new client? Add one in Contacts first.</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="overline block mb-1.5">Incident date</label>
            <input type="date" value={form.incident_date} onChange={upd("incident_date")} data-testid="matter-incident-date"
              className="w-full px-3 py-2 border border-praxium-line rounded-sm" />
          </div>
          <div>
            <label className="overline block mb-1.5">Statute of limitations</label>
            <input type="date" value={form.sol_date} onChange={upd("sol_date")} data-testid="matter-sol"
              className="w-full px-3 py-2 border border-praxium-line rounded-sm" />
          </div>
          <div>
            <label className="overline block mb-1.5">Value estimate</label>
            <input type="number" value={form.value_estimate} onChange={upd("value_estimate")} placeholder="50000" data-testid="matter-value"
              className="w-full px-3 py-2 border border-praxium-line rounded-sm font-mono" />
          </div>
        </div>
        <div>
          <label className="overline block mb-1.5">Description</label>
          <textarea value={form.description} onChange={upd("description")} rows={4} data-testid="matter-description"
            placeholder="Brief case summary..."
            className="w-full px-3 py-2 border border-praxium-line rounded-sm outline-none focus:border-praxium-accent" />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={loading} data-testid="matter-submit" className="btn-praxium">
            {loading ? <Loader2 className="animate-spin" size={14} /> : "Create matter"}
          </button>
          <button type="button" onClick={() => nav("/matters")} className="btn-ghost">Cancel</button>
        </div>
      </form>
    </div>
  );
}
