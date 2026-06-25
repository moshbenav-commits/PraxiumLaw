import { useEffect, useState } from "react";
import api from "@/lib/api";
import { BarChart3, Sparkles } from "lucide-react";
import { STATUSES, STATUS_DOT } from "@/lib/utils";
import PageLoader from "@/components/common/PageLoader";

export default function Reports() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/dashboard").then((r) => setData(r.data)); }, []);

  if (!data) return <PageLoader label="Loading reports…" />;
  const maxPipeline = Math.max(...Object.values(data.pipeline || {}), 1);

  return (
    <div className="px-4 sm:px-6 py-6">
      <div className="overline mb-2">// report studio</div>
      <h1 className="font-display font-black text-3xl tracking-tight flex items-center gap-3"><BarChart3 className="text-praxium-accent" /> Reports</h1>
      <p className="text-sm text-praxium-subtle mt-2">Drag-drop reports + natural-language queries. Save as dashboard widgets.</p>

      <div className="mt-6 data-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-praxium-accent" />
          <span className="overline">// natural language report</span>
        </div>
        <input placeholder="e.g. 'Show me PI matters > $50k in settlement phase'"
          className="w-full px-3 py-2 border border-praxium-line rounded-sm text-sm" data-testid="reports-nl-input" />
        <p className="text-[10px] font-mono text-praxium-subtle mt-1">// claude 4.5 parses → SQL → chart. Coming Phase 2.</p>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="data-card p-5">
          <div className="overline mb-3">// pipeline distribution</div>
          <div className="space-y-2">
            {STATUSES.map((s) => (
              <div key={s} className="flex items-center gap-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-praxium-subtle w-20">{s}</span>
                <div className="flex-1 bg-praxium-bg h-5 rounded-sm overflow-hidden">
                  <div className={`h-full ${STATUS_DOT[s]}`} style={{ width: `${(data.pipeline?.[s] || 0) / maxPipeline * 100}%` }} />
                </div>
                <span className="text-xs font-mono tabular w-8 text-right">{data.pipeline?.[s] || 0}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="data-card p-5">
          <div className="overline mb-3">// summary kpis</div>
          <div className="grid grid-cols-2 gap-3">
            <div><div className="overline">Open matters</div><div className="font-display font-black text-2xl tabular">{data.open_matters}</div></div>
            <div><div className="overline">Open tasks</div><div className="font-display font-black text-2xl tabular">{data.open_tasks}</div></div>
            <div><div className="overline">Overdue</div><div className="font-display font-black text-2xl tabular text-rose-600">{data.overdue_tasks}</div></div>
            <div><div className="overline">New leads</div><div className="font-display font-black text-2xl tabular">{data.new_leads}</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
