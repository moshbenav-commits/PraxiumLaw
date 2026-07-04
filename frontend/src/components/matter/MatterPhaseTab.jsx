import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { PI_PHASES, PI_PHASE_COLORS, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AlertTriangle, ChevronRight, ExternalLink, GitBranch, History } from "lucide-react";
import PageLoader from "@/components/common/PageLoader";

const SEVERITY = {
  high: "bg-red-50 border-red-200 text-red-900",
  medium: "bg-amber-50 border-amber-200 text-amber-900",
};

export default function MatterPhaseTab({ matterId, practiceArea, onChanged }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);
  const [notes, setNotes] = useState("");

  const load = useCallback(() => {
    api
      .get(`/matters/${matterId}/phase`)
      .then((r) => setData(r.data))
      .catch(() => toast.error("Could not load PI phase"))
      .finally(() => setLoading(false));
  }, [matterId]);

  useEffect(() => {
    load();
  }, [load]);

  if (practiceArea !== "personal_injury") {
    return (
      <div className="data-card p-6 text-sm text-praxium-subtle">
        PI phase pipeline applies to personal injury matters only.
      </div>
    );
  }

  if (loading || !data) return <PageLoader label="Loading pipeline…" />;

  const current = data.pi_phase?.current || "intake";
  const phases = data.phases || PI_PHASES;
  const currentMeta = phases.find((p) => p.id === current) || phases[0];
  const sorted = [...phases].sort((a, b) => a.order - b.order);

  const changePhase = async (phaseId) => {
    if (phaseId === current) return;
    setChanging(true);
    try {
      await api.patch(`/matters/${matterId}/phase`, { phase: phaseId, notes: notes.trim() || undefined });
      setNotes("");
      toast.success(`Phase → ${phases.find((p) => p.id === phaseId)?.label || phaseId}`);
      load();
      onChanged?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Phase change failed");
    } finally {
      setChanging(false);
    }
  };

  const toggleTask = async (taskId, done) => {
    try {
      await api.patch(`/matters/${matterId}/phase`, { task_completion: { [taskId]: done } });
      load();
    } catch {
      toast.error("Could not save checklist");
    }
  };

  return (
    <div className="space-y-5" data-testid="matter-phase-tab">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="overline mb-1 flex items-center gap-2">
            <GitBranch size={12} /> // pi pipeline
          </div>
          <p className="text-sm text-praxium-subtle max-w-xl">
            Training phases: Intake → Treating → Record gathering → Demand → Settlement / Lit.
          </p>
        </div>
        <Link to="/training" className="btn-ghost text-xs inline-flex items-center gap-1">
          <ExternalLink size={11} /> Training hub
        </Link>
      </div>

      <div className="data-card p-4">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className={cn("status-pip border text-sm font-mono uppercase", PI_PHASE_COLORS[current])}>
            {currentMeta?.label || current}
          </span>
          {data.pi_phase?.entered_at ? (
            <span className="text-xs font-mono text-praxium-subtle">since {formatDate(data.pi_phase.entered_at)}</span>
          ) : null}
          {data.tasks_incomplete > 0 ? (
            <span className="text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
              {data.tasks_incomplete} phase task(s) open
            </span>
          ) : null}
        </div>

        <div className="flex gap-1 overflow-x-auto pb-2">
          {sorted.filter((p) => !p.terminal || p.id === current).map((p) => {
            const isCurrent = p.id === current;
            const isPast = p.order < (currentMeta?.order || 0);
            return (
              <button
                key={p.id}
                type="button"
                disabled={changing}
                onClick={() => changePhase(p.id)}
                data-testid={`phase-step-${p.id}`}
                className={cn(
                  "shrink-0 px-2 py-1.5 text-[10px] font-mono uppercase tracking-wide rounded-sm border transition-colors",
                  isCurrent ? "bg-praxium-ink text-white border-praxium-ink" :
                  isPast ? "bg-praxium-bg text-praxium-subtle border-praxium-line hover:border-praxium-accent" :
                  "bg-white text-praxium-subtle border-praxium-line hover:border-praxium-accent hover:text-praxium-ink"
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <label className="block mt-3 text-xs">
          <span className="font-mono uppercase text-praxium-subtle text-[10px]">Transition notes (optional)</span>
          <input
            className="w-full mt-1 text-sm border border-praxium-line rounded-sm px-2 py-1.5 bg-white"
            placeholder="Why moving phase — e.g. demand sent 7/4"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            data-testid="phase-transition-notes"
          />
        </label>
      </div>

      {data.audit_hints?.length > 0 ? (
        <div className="data-card p-4 space-y-2" data-testid="phase-audit-hints">
          <div className="overline text-[10px] flex items-center gap-2">
            <AlertTriangle size={12} /> Case audit hints
          </div>
          <ul className="space-y-2">
            {data.audit_hints.map((h) => (
              <li key={h.code} className={cn("text-sm border rounded-lg px-3 py-2", SEVERITY[h.severity] || SEVERITY.medium)}>
                {h.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="data-card p-4">
        <div className="overline mb-3">Phase checklist — {currentMeta?.label}</div>
        {data.tasks?.length === 0 ? (
          <p className="text-sm text-praxium-subtle">No checklist items for this phase.</p>
        ) : (
          <ul className="space-y-2">
            {data.tasks.map((t) => (
              <li key={t.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(t.done)}
                  onChange={(e) => toggleTask(t.id, e.target.checked)}
                  data-testid={`phase-task-${t.id}`}
                />
                <span className={cn(t.done && "line-through text-praxium-subtle")}>{t.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {data.pi_phase?.history?.length > 0 ? (
        <div className="data-card p-4">
          <div className="overline mb-3 flex items-center gap-2">
            <History size={12} /> Phase history
          </div>
          <ul className="space-y-2 text-sm">
            {[...data.pi_phase.history].reverse().map((h, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 font-mono text-xs">
                <span className="text-praxium-subtle">{formatDate(h.at)}</span>
                <span>{phases.find((p) => p.id === h.from)?.label || h.from}</span>
                <ChevronRight size={12} className="text-praxium-subtle" />
                <span className="font-semibold">{phases.find((p) => p.id === h.to)?.label || h.to}</span>
                {h.by_name ? <span className="text-praxium-subtle">· {h.by_name}</span> : null}
                {h.notes ? <span className="w-full text-praxium-subtle normal-case font-sans">{h.notes}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="text-praxium-subtle">Terminal phases:</span>
        {["dropped", "closed", "litigate", "minors_compromise"].map((id) => {
          const p = phases.find((x) => x.id === id);
          if (!p) return null;
          return (
            <button
              key={id}
              type="button"
              disabled={changing || current === id}
              onClick={() => changePhase(id)}
              className="btn-ghost text-[10px] font-mono uppercase"
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
