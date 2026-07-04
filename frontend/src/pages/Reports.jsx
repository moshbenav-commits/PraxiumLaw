import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { BarChart3, Sparkles, AlertTriangle, ExternalLink } from "lucide-react";
import { STATUSES, STATUS_DOT, piPhaseLabel } from "@/lib/utils";
import PageLoader from "@/components/common/PageLoader";

const SEV_COLORS = {
  high: "text-rose-600 bg-rose-50 border-rose-200",
  medium: "text-amber-800 bg-amber-50 border-amber-200",
  low: "text-zinc-700 bg-zinc-50 border-zinc-200",
};

export default function Reports() {
  const [data, setData] = useState(null);
  const [audit, setAudit] = useState(null);

  useEffect(() => {
    api.get("/dashboard").then((r) => setData(r.data));
    api.get("/pi/audit/dashboard").then((r) => setAudit(r.data)).catch(() => setAudit(null));
  }, []);

  if (!data) return <PageLoader label="Loading reports…" />;
  const maxPipeline = Math.max(...Object.values(data.pipeline || {}), 1);

  return (
    <div className="px-4 sm:px-6 py-6">
      <div className="overline mb-2">// report studio</div>
      <h1 className="font-display font-black text-3xl tracking-tight flex items-center gap-3"><BarChart3 className="text-praxium-accent" /> Reports</h1>
      <p className="text-sm text-praxium-subtle mt-2">PI case audit rollups + pipeline KPIs.</p>

      {audit && (
        <div className="mt-6 data-card p-5" data-testid="pi-audit-dashboard">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <div className="overline mb-1 flex items-center gap-2">
                <AlertTriangle size={12} className="text-praxium-accent" /> PI case audit
              </div>
              <h3 className="font-display font-black text-lg">Cleaner-fish view</h3>
              <p className="text-xs text-praxium-subtle mt-1">
                {audit.matters_with_issues} of {audit.matters_audited} PI matters need attention
                {audit.demand_review_queue_count > 0 ? ` · ${audit.demand_review_queue_count} demand(s) awaiting attorney` : ""}
              </p>
            </div>
            <Link to="/training/guides/case-manager" className="text-xs font-mono text-praxium-accent hover:underline">
              Audit checklist →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-praxium-bg p-3 rounded-sm">
              <div className="overline">High</div>
              <div className="font-display font-black text-2xl tabular text-rose-600">{audit.severity_totals?.high || 0}</div>
            </div>
            <div className="bg-praxium-bg p-3 rounded-sm">
              <div className="overline">Medium</div>
              <div className="font-display font-black text-2xl tabular text-amber-700">{audit.severity_totals?.medium || 0}</div>
            </div>
            <div className="bg-praxium-bg p-3 rounded-sm">
              <div className="overline">Clean files</div>
              <div className="font-display font-black text-2xl tabular text-emerald-700">{audit.matters_clean || 0}</div>
            </div>
            <div className="bg-praxium-bg p-3 rounded-sm">
              <div className="overline">Demand queue</div>
              <div className="font-display font-black text-2xl tabular">{audit.demand_review_queue_count || 0}</div>
            </div>
          </div>

          {audit.items?.length === 0 ? (
            <p className="text-sm text-praxium-subtle text-center py-6">All PI matters pass current audit gates.</p>
          ) : (
            <div className="divide-y divide-praxium-line max-h-[420px] overflow-y-auto">
              {audit.items.map((row) => (
                <div key={row.matter_id} className="py-3 flex flex-col sm:flex-row sm:items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <Link to={`/matters/${row.matter_id}`} className="text-sm font-semibold hover:text-praxium-accent">
                      {row.case_number || row.matter_id.slice(0, 8)} — {row.title}
                    </Link>
                    <div className="text-[10px] font-mono text-praxium-subtle mt-0.5">
                      Phase: {piPhaseLabel(row.phase)} · {row.issue_count} issue(s)
                    </div>
                    <ul className="mt-2 space-y-1">
                      {row.issues.slice(0, 4).map((issue, idx) => (
                        <li key={idx} className={`text-xs border rounded px-2 py-1 inline-block mr-1 mb-1 ${SEV_COLORS[issue.severity] || SEV_COLORS.low}`}>
                          {issue.message}
                        </li>
                      ))}
                      {row.issues.length > 4 && (
                        <li className="text-[10px] font-mono text-praxium-subtle">+{row.issues.length - 4} more</li>
                      )}
                    </ul>
                  </div>
                  <Link
                    to={`/matters/${row.matter_id}`}
                    className="text-xs font-mono text-praxium-accent hover:underline shrink-0 inline-flex items-center gap-1"
                  >
                    Open <ExternalLink size={10} />
                  </Link>
                </div>
              ))}
            </div>
          )}
          {audit.truncated && (
            <p className="text-[10px] font-mono text-praxium-subtle mt-2">Showing first 100 matters with issues.</p>
          )}
        </div>
      )}

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
