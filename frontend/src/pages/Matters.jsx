import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Link } from "react-router-dom";
import { Plus, LayoutGrid, List } from "lucide-react";
import { STATUSES, STATUS_DOT, STATUS_COLORS, PRACTICE_AREAS, formatDate, formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";
import PageLoader from "@/components/common/PageLoader";
import EmptyState from "@/components/common/EmptyState";

export default function Matters() {
  const [matters, setMatters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("kanban");
  const [filter, setFilter] = useState("all");

  const load = () => api.get("/matters").then((r) => { setMatters(r.data); setLoading(false); });
  useEffect(() => { load(); }, []);

  const filtered = filter === "all" ? matters : matters.filter((m) => m.practice_area === filter);

  if (loading) return <PageLoader label="Loading matters…" />;

  return (
    <div className="px-4 sm:px-6 py-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <div className="overline mb-2">// case management</div>
          <h1 className="font-display font-black text-3xl tracking-tight">Matters</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex border border-praxium-line rounded-sm">
            <button onClick={() => setView("kanban")} data-testid="matters-view-kanban"
              className={cn("px-2.5 py-1.5", view === "kanban" ? "bg-praxium-ink text-white" : "")}><LayoutGrid size={13} /></button>
            <button onClick={() => setView("list")} data-testid="matters-view-list"
              className={cn("px-2.5 py-1.5", view === "list" ? "bg-praxium-ink text-white" : "")}><List size={13} /></button>
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} data-testid="matters-filter-practice"
            className="px-3 py-1.5 border border-praxium-line rounded-sm text-xs font-mono bg-praxium-surface">
            <option value="all">All practice areas</option>
            {PRACTICE_AREAS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <Link to="/matters/new" className="btn-praxium" data-testid="matters-new">
            <Plus size={14} /> New
          </Link>
        </div>
      </div>

      {filtered.length === 0 && matters.length === 0 ? (
        <EmptyState
          title="No matters yet"
          body="Create your first matter to start tracking cases, tasks, and documents in one canvas."
          actionLabel="New matter"
          actionTo="/matters/new"
          testId="matters-empty"
        />
      ) : view === "kanban" ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STATUSES.map((status) => {
            const items = filtered.filter((m) => m.status === status);
            return (
              <div key={status} className="min-w-[260px] flex-shrink-0" data-testid={`kanban-col-${status}`}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status]}`} />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-praxium-subtle">{status}</span>
                  <span className="text-[10px] font-mono text-praxium-subtle ml-auto">{items.length}</span>
                </div>
                <div className="space-y-1.5">
                  {items.map((m) => (
                    <Link key={m.id} to={`/matters/${m.id}`} data-testid={`kanban-card-${m.id}`}
                      className="block bg-praxium-surface border border-praxium-line rounded-sm p-3 hover:border-praxium-accent transition-all hover:-translate-y-0.5">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-mono text-praxium-subtle">{m.case_number}</span>
                        <span className="text-[10px] font-mono text-praxium-subtle uppercase">{PRACTICE_AREAS.find((p) => p.id === m.practice_area)?.label.split(" ")[0] || m.practice_area}</span>
                      </div>
                      <div className="font-display font-bold text-sm leading-tight">{m.title}</div>
                      {m.value_estimate && (
                        <div className="mt-2 text-xs font-mono text-praxium-subtle">{formatMoney(m.value_estimate)}</div>
                      )}
                    </Link>
                  ))}
                  {items.length === 0 && (
                    <div className="text-[10px] font-mono text-praxium-subtle py-2 px-1">—</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="data-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-praxium-bg border-b border-praxium-line">
                <th className="text-left px-4 py-2 overline">Case #</th>
                <th className="text-left px-4 py-2 overline">Title</th>
                <th className="text-left px-4 py-2 overline">Practice</th>
                <th className="text-left px-4 py-2 overline">Status</th>
                <th className="text-right px-4 py-2 overline">Value</th>
                <th className="text-right px-4 py-2 overline">Opened</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-praxium-line">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-praxium-bg">
                  <td className="px-4 py-2 font-mono text-xs">
                    <Link to={`/matters/${m.id}`} data-testid={`matter-row-${m.id}`} className="text-praxium-accent hover:underline">{m.case_number}</Link>
                  </td>
                  <td className="px-4 py-2 font-medium">{m.title}</td>
                  <td className="px-4 py-2 text-xs text-praxium-subtle">{PRACTICE_AREAS.find((p) => p.id === m.practice_area)?.label}</td>
                  <td className="px-4 py-2">
                    <span className={cn("status-pip", STATUS_COLORS[m.status])}>
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[m.status]}`} />
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-mono">{formatMoney(m.value_estimate)}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs text-praxium-subtle">{formatDate(m.created_at)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-praxium-subtle text-sm">No matters yet. <Link to="/matters/new" className="text-praxium-accent">Create your first.</Link></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
