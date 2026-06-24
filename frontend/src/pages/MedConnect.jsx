import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Plus, Stethoscope, Copy, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

export default function MedConnect() {
  const [providers, setProviders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", specialty: "", phone: "", fax: "", email: "", preferred_submission: "email", npi: "" });

  const load = () => api.get("/providers").then((r) => setProviders(r.data));
  useEffect(load, []);

  const add = async (e) => {
    e.preventDefault();
    await api.post("/providers", form);
    setForm({ name: "", specialty: "", phone: "", fax: "", email: "", preferred_submission: "email", npi: "" });
    setShowForm(false);
    load();
    toast.success("Provider added");
  };

  return (
    <div className="px-6 py-6">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="overline mb-2">// medconnect // {providers.length} providers</div>
          <h1 className="font-display font-black text-3xl tracking-tight flex items-center gap-3"><Stethoscope className="text-praxium-accent" /> MedConnect</h1>
          <p className="text-sm text-praxium-subtle mt-2 max-w-xl">Medical provider directory + records collection workflow. Eight ways for doctors to send records — auto-filed to the right matter via patient IDs.</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="btn-praxium" data-testid="medconnect-add-provider">
          <Plus size={14} /> Add provider
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="data-card p-4">
          <div className="overline mb-2">// per-matter alias</div>
          <code className="text-xs font-mono bg-praxium-bg p-2 block rounded-sm">matter-A4F9K2@records.praxium.law</code>
          <p className="text-[11px] text-praxium-subtle mt-2">Doctors email records to this address → auto-files to matter A4F9K2.</p>
          <div className="mt-2 text-[10px] font-mono uppercase tracking-wider text-amber-600">MOCKED — needs SendGrid inbound</div>
        </div>
        <div className="data-card p-4">
          <div className="overline mb-2">// patient id codes</div>
          <code className="text-xs font-mono bg-praxium-bg p-2 block rounded-sm">PT-A4F9K2 in subject line</code>
          <p className="text-[11px] text-praxium-subtle mt-2">Universal address + Patient ID → AI parses → routes to matter.</p>
          <div className="mt-2 text-[10px] font-mono uppercase tracking-wider text-emerald-600">LIVE</div>
        </div>
        <div className="data-card p-4">
          <div className="overline mb-2">// magic link upload</div>
          <code className="text-xs font-mono bg-praxium-bg p-2 block rounded-sm">/upload/{`{token}`}</code>
          <p className="text-[11px] text-praxium-subtle mt-2">Tokenized URL per matter → drop files → auto-files. No login.</p>
          <div className="mt-2 text-[10px] font-mono uppercase tracking-wider text-emerald-600">LIVE</div>
        </div>
      </div>

      {showForm && (
        <form onSubmit={add} className="data-card p-4 mb-6 grid grid-cols-12 gap-3" data-testid="provider-form">
          <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required placeholder="Provider name"
            className="col-span-4 px-3 py-2 border border-praxium-line rounded-sm text-sm" data-testid="provider-name" />
          <input value={form.specialty} onChange={(e) => setForm({...form, specialty: e.target.value})} required placeholder="Specialty"
            className="col-span-3 px-3 py-2 border border-praxium-line rounded-sm text-sm" data-testid="provider-specialty" />
          <input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} placeholder="Phone"
            className="col-span-3 px-3 py-2 border border-praxium-line rounded-sm text-sm font-mono" />
          <select value={form.preferred_submission} onChange={(e) => setForm({...form, preferred_submission: e.target.value})}
            className="col-span-2 px-3 py-2 border border-praxium-line rounded-sm text-sm">
            <option value="email">Email</option><option value="fax">Fax</option><option value="portal">Portal</option><option value="mail">Mail</option>
          </select>
          <button type="submit" className="btn-praxium col-span-12" data-testid="provider-submit">Add provider</button>
        </form>
      )}

      <div className="data-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-praxium-bg border-b border-praxium-line">
            <th className="text-left px-4 py-2 overline">Name</th>
            <th className="text-left px-4 py-2 overline">Specialty</th>
            <th className="text-left px-4 py-2 overline">Phone</th>
            <th className="text-left px-4 py-2 overline">Submission</th>
            <th className="text-left px-4 py-2 overline">NPI</th>
          </tr></thead>
          <tbody className="divide-y divide-praxium-line">
            {providers.map((p) => (
              <tr key={p.id} data-testid={`provider-${p.id}`}>
                <td className="px-4 py-2 font-medium">{p.name}</td>
                <td className="px-4 py-2 text-xs">{p.specialty}</td>
                <td className="px-4 py-2 text-xs font-mono">{p.phone || "—"}</td>
                <td className="px-4 py-2 text-xs uppercase font-mono">{p.preferred_submission}</td>
                <td className="px-4 py-2 text-xs font-mono">{p.npi || "—"}</td>
              </tr>
            ))}
            {providers.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-praxium-subtle">No providers yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
