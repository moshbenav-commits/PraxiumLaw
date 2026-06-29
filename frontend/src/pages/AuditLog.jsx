import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Shield, ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import PageLoader from "@/components/common/PageLoader";

function formatWhen(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function actorLabel(row) {
  return row.actor?.email || row.actor?.name || row.actor_name || row.actor_id || "—";
}

function targetLabel(row) {
  const kind = row.subject?.kind || row.resource_type;
  const id = row.subject?.id || row.resource_id;
  if (!kind) return "—";
  return id ? `${kind}:${id}` : kind;
}

export default function AuditLog() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/audit", { params: { limit: 50 } })
      .then((r) => setItems(r.data.items || []))
      .catch((e) => setError(e.response?.data?.detail || "Could not load audit log."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-4 sm:px-6 py-6 max-w-5xl">
      <Link to="/settings" className="inline-flex items-center gap-1 text-sm text-praxium-subtle hover:text-praxium-accent mb-4">
        <ArrowLeft size={14} /> Back to settings
      </Link>
      <div className="overline mb-2">// compliance</div>
      <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tight flex items-center gap-3">
        <Shield className="text-praxium-accent shrink-0" /> Audit log
      </h1>
      <p className="text-sm text-praxium-subtle mt-2 max-w-2xl">
        Read-only record of security-relevant actions for your firm. Last 50 events.
      </p>

      <div className="mt-6 data-card overflow-hidden" data-testid="audit-log-table">
        {loading ? (
          <div className="p-6">
            <PageLoader label="Loading audit events…" />
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-rose-600">{error}</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-sm text-praxium-subtle">No audit events yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-praxium-line text-left text-xs font-mono uppercase tracking-wider text-praxium-subtle">
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Who</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Target</th>
                  <th className="px-4 py-3 font-medium">IP</th>
                  <th className="px-4 py-3 font-medium">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-praxium-line">
                {items.map((row) => (
                  <tr key={row.id} data-testid={`audit-row-${row.id}`}>
                    <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">{formatWhen(row.ts || row.created_at)}</td>
                    <td className="px-4 py-2.5">{actorLabel(row)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{row.action}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{targetLabel(row)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-praxium-subtle">{row.ip || "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className={row.outcome === "failure" ? "text-rose-600" : "text-emerald-700"}>
                        {row.outcome || "success"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
