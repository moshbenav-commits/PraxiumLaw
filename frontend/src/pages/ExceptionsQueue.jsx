import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import PageLoader from "@/components/common/PageLoader";
import EmptyState from "@/components/common/EmptyState";

const KIND_ORDER = [
  "extraction_low_confidence",
  "verification_mismatch",
  "reconciliation_delta",
  "automation_failure",
  "deadline_risk",
  "other",
];

const KIND_LABEL = {
  extraction_low_confidence: "Low-confidence extraction",
  verification_mismatch: "Verification mismatch",
  reconciliation_delta: "Reconciliation delta",
  automation_failure: "Automation failure",
  deadline_risk: "Deadline risk",
  other: "Other",
};

const STATUS_FILTERS = [
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
  { value: "all", label: "All" },
];

function formatWhen(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export default function ExceptionsQueue() {
  const [exceptions, setExceptions] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("open");
  const [kindFilter, setKindFilter] = useState(null);

  const load = useCallback(() => {
    const params = { status };
    if (kindFilter) params.kind = kindFilter;
    return Promise.all([
      api.get("/exceptions", { params }).then((r) => setExceptions(r.data.exceptions || [])),
      api.get("/exceptions/summary").then((r) => setSummary(r.data.by_kind || {})),
    ]);
  }, [status, kindFilter]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => toast.error("Could not load exception queue"))
      .finally(() => setLoading(false));
  }, [load]);

  const act = async (id, dismiss) => {
    const note = window.prompt(dismiss ? "Dismiss note (optional):" : "Resolution note (optional):");
    if (note === null) return;
    try {
      await api.post(`/exceptions/${id}/resolve`, { note: note || undefined, dismiss });
      toast.success(dismiss ? "Exception dismissed" : "Exception resolved");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Update failed");
    }
  };

  const toggleKind = (kind) => setKindFilter((prev) => (prev === kind ? null : kind));

  if (loading) return <PageLoader label="Loading exceptions…" />;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl">
      <div className="overline mb-2">// automation health</div>
      <h1 className="font-display font-black text-2xl tracking-tight flex items-center gap-2">
        <AlertTriangle className="text-praxium-accent" /> Exception queue
      </h1>
      <p className="text-sm text-praxium-subtle mt-2">
        This is where automated flows surface work that needs a human. Watch the volume per kind — it's
        the signal for when a VA can be phased out of a step.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {KIND_ORDER.map((kind) => {
          const counts = summary[kind] || {};
          const open = counts.open || 0;
          const active = kindFilter === kind;
          return (
            <button
              key={kind}
              type="button"
              onClick={() => toggleKind(kind)}
              className={`rounded-sm border px-3 py-2 text-left ${
                active ? "border-praxium-accent" : "border-praxium-line"
              }`}
              data-testid={`exceptions-summary-${kind}`}
            >
              <div className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle">
                {KIND_LABEL[kind] || kind}
              </div>
              <div className={`font-display font-black text-lg ${open > 0 ? "text-praxium-accent" : ""}`}>
                {open}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatus(f.value)}
            className={`text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 border rounded-sm ${
              status === f.value
                ? "border-praxium-accent text-praxium-accent"
                : "border-praxium-line text-praxium-subtle"
            }`}
            data-testid={`exceptions-status-${f.value}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {exceptions.length === 0 ? (
          <EmptyState title="No exceptions — automation is clean." testId="exceptions-empty" />
        ) : (
          exceptions.map((ex) => (
            <div key={ex.id} className="data-card p-4" data-testid={`exception-row-${ex.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 border border-praxium-line text-praxium-subtle">
                      {KIND_LABEL[ex.kind] || ex.kind}
                    </span>
                    {ex.status !== "open" && (
                      <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 border border-praxium-line text-praxium-subtle">
                        {ex.status}
                      </span>
                    )}
                  </div>
                  <div className="font-semibold text-sm mt-1.5">{ex.title}</div>
                  <div className="text-xs font-mono text-praxium-subtle mt-1">
                    {ex.source ? `${ex.source} · ` : ""}
                    {formatWhen(ex.raised_at)}
                    {ex.matter_id ? ` · matter ${String(ex.matter_id).slice(0, 8)}…` : ""}
                  </div>
                  {ex.detail && typeof ex.detail === "object" ? (
                    <div className="mt-2 text-xs font-mono text-praxium-subtle space-y-0.5">
                      {Object.entries(ex.detail).map(([k, v]) => (
                        <div key={k}>
                          <span className="text-praxium-subtle">{k}:</span> {String(v)}
                        </div>
                      ))}
                    </div>
                  ) : ex.detail ? (
                    <div className="mt-2 text-xs text-praxium-subtle leading-relaxed">{ex.detail}</div>
                  ) : null}
                </div>

                {ex.status === "open" && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => act(ex.id, false)}
                      className="rounded-sm bg-praxium-accent px-3 py-1.5 text-xs font-bold text-white"
                    >
                      Resolve
                    </button>
                    <button
                      type="button"
                      onClick={() => act(ex.id, true)}
                      className="rounded-sm border border-praxium-line px-3 py-1.5 text-xs font-semibold text-praxium-subtle"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
