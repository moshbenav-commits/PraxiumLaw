import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Network, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import { timeAgo, formatDate } from "@/lib/utils";

export default function Marketplace() {
  const [leads, setLeads] = useState([]);

  const load = () => api.get("/leads").then((r) => setLeads(r.data));
  useEffect(load, []);

  const claim = async (id) => {
    await api.post(`/leads/${id}/claim`);
    toast.success("Lead claimed");
    load();
  };

  const convert = async (id) => {
    const r = await api.post(`/leads/${id}/convert`);
    toast.success(`Matter created: ${r.data.matter_id?.slice(0, 8)}`);
    load();
  };

  return (
    <div className="px-6 py-6">
      <div className="overline mb-2">// lawmatch marketplace</div>
      <h1 className="font-display font-black text-3xl tracking-tight flex items-center gap-3"><Network className="text-praxium-accent" /> LawMatch</h1>
      <p className="text-sm text-praxium-subtle mt-2 max-w-2xl">AI-triaged consumer leads, routed to the right firm by geography + practice area + capacity. Marketplace tier subscribers receive leads in real time.</p>

      <div className="mt-6 grid grid-cols-4 gap-px bg-praxium-line border border-praxium-line mb-6">
        {[
          { label: "Total leads", value: leads.length },
          { label: "Unclaimed", value: leads.filter((l) => l.status === "new").length },
          { label: "Claimed", value: leads.filter((l) => l.status === "claimed").length },
          { label: "Converted", value: leads.filter((l) => l.status === "converted").length },
        ].map((m) => (
          <div key={m.label} className="bg-praxium-surface p-4">
            <div className="overline">{m.label}</div>
            <div className="font-display font-black text-3xl tabular mt-1">{m.value}</div>
          </div>
        ))}
      </div>

      <div className="data-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-praxium-bg border-b border-praxium-line">
            <th className="text-left px-4 py-2 overline">Name</th>
            <th className="text-left px-4 py-2 overline">Case type</th>
            <th className="text-left px-4 py-2 overline">AI Score</th>
            <th className="text-left px-4 py-2 overline">Description</th>
            <th className="text-left px-4 py-2 overline">Status</th>
            <th className="text-left px-4 py-2 overline">Received</th>
            <th className="text-right px-4 py-2 overline">Action</th>
          </tr></thead>
          <tbody className="divide-y divide-praxium-line">
            {leads.map((l) => (
              <tr key={l.id} data-testid={`lead-${l.id}`}>
                <td className="px-4 py-2 font-medium">{l.name}</td>
                <td className="px-4 py-2 text-xs">{l.case_type}</td>
                <td className="px-4 py-2 font-mono text-xs">
                  <span className={`inline-flex items-center gap-1 ${l.ai_score >= 70 ? "text-emerald-600" : l.ai_score >= 40 ? "text-amber-600" : "text-zinc-500"}`}>
                    <Sparkles size={10} /> {l.ai_score}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs text-praxium-subtle max-w-xs truncate">{l.description}</td>
                <td className="px-4 py-2"><span className="status-pip bg-zinc-100">{l.status}</span></td>
                <td className="px-4 py-2 text-[10px] font-mono text-praxium-subtle">{timeAgo(l.created_at)}</td>
                <td className="px-4 py-2 text-right">
                  {l.status === "new" && <button onClick={() => claim(l.id)} className="text-xs btn-praxium py-1" data-testid={`claim-${l.id}`}>Claim</button>}
                  {l.status === "claimed" && <button onClick={() => convert(l.id)} className="text-xs btn-praxium py-1" data-testid={`convert-${l.id}`}>Convert</button>}
                  {l.status === "converted" && <span className="text-xs text-emerald-600 flex items-center gap-1 justify-end font-mono"><Check size={11} /> done</span>}
                </td>
              </tr>
            ))}
            {leads.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-praxium-subtle">No leads yet. Share your public intake form — leads will appear here.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
