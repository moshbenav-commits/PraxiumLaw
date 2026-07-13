import { useEffect, useState } from "react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { Layers, Lock } from "lucide-react";

/**
 * Compact vertical stepper showing a matter's practice-area phase set.
 * Embedded panel — no full-page loader, never throws on missing/failed data.
 */
export default function PhaseSetPanel({ matterId, currentPhaseKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!matterId) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    api
      .get(`/matters/${matterId}/phase-set`)
      .then((r) => {
        if (!cancelled) setData(r.data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [matterId]);

  if (loading) {
    return (
      <div className="data-card p-4 flex items-center gap-2" role="status" aria-live="polite">
        <div className="w-1.5 h-1.5 rounded-full bg-praxium-accent animate-pulse" />
        <span className="font-mono text-xs uppercase tracking-widest text-praxium-subtle">
          Loading phases…
        </span>
      </div>
    );
  }

  const phases = data?.phases || [];

  if (error || phases.length === 0) {
    return (
      <div className="data-card p-4 text-xs text-praxium-subtle" data-testid="phase-set-panel-empty">
        No phase set.
      </div>
    );
  }

  return (
    <div className="data-card p-4 space-y-3" data-testid="phase-set-panel">
      <div className="overline text-[10px] flex items-center gap-2">
        <Layers size={12} /> Workflow · {data.module_key}
      </div>
      <ol className="space-y-2.5">
        {phases.map((p, i) => {
          const isCurrent = p.key === currentPhaseKey;
          return (
            <li
              key={p.key}
              data-testid={`phase-set-step-${p.key}`}
              className={cn(
                "flex gap-3 rounded-sm border px-2.5 py-2",
                isCurrent ? "border-praxium-accent bg-praxium-accent/5" : "border-praxium-line"
              )}
            >
              <span
                className={cn(
                  "shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold",
                  isCurrent ? "bg-praxium-accent text-white" : "bg-praxium-bg text-praxium-subtle border border-praxium-line"
                )}
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={cn("text-sm", isCurrent ? "font-semibold text-praxium-ink" : "font-medium")}>
                    {p.label}
                  </span>
                  {p.gate ? (
                    <span
                      className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 border border-praxium-line text-praxium-subtle"
                      data-testid={`phase-set-gate-${p.key}`}
                    >
                      <Lock size={9} /> {p.gate}
                    </span>
                  ) : null}
                </div>
                {p.description ? (
                  <p className="text-xs text-praxium-subtle mt-0.5 leading-snug">{p.description}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
