import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Percent, Plus, Send, CheckCircle2, Loader2 } from "lucide-react";
import EmptyState from "@/components/common/EmptyState";
import { formatMoney, formatDate } from "@/lib/utils";

const TERMINAL_STATES = ["accepted", "rejected", "withdrawn"];

function stateColor(state) {
  if (state === "accepted") return "border-emerald-500 text-emerald-600";
  if (state === "rejected" || state === "withdrawn") return "border-zinc-400 text-zinc-500";
  if (state === "countered") return "border-amber-500 text-amber-600";
  if (state === "sent") return "border-praxium-accent text-praxium-accent-text";
  return "border-praxium-line text-praxium-subtle"; // drafted
}

export default function ReductionPanel({ lienId, lien, onChanged }) {
  const [loading, setLoading] = useState(true);
  const [reductions, setReductions] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [busyId, setBusyId] = useState(null);

  const [form, setForm] = useState({ requested_pct: "", requested_amount: "", rationale: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    if (!lienId) return Promise.resolve();
    return api.get(`/liens/${lienId}/reductions`).then((r) => setReductions(r.data.reductions || []));
  }, [lienId]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => toast.error("Could not load reduction requests"))
      .finally(() => setLoading(false));
  }, [load]);

  const setDraft = (id, patch) => setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const refresh = () => {
    load();
    onChanged?.();
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    const pctRaw = form.requested_pct.trim();
    const amountRaw = form.requested_amount.trim();
    const pct = pctRaw ? parseFloat(pctRaw) : undefined;
    const amount = amountRaw ? parseFloat(amountRaw) : undefined;
    if (pct === undefined && amount === undefined) {
      toast.error("Enter a requested percent or amount");
      return;
    }
    if ((pct !== undefined && Number.isNaN(pct)) || (amount !== undefined && Number.isNaN(amount))) {
      toast.error("Requested percent/amount must be numeric");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/liens/${lienId}/reductions`, {
        requested_pct: pct,
        requested_amount: amount,
        rationale: form.rationale.trim() || undefined,
      });
      toast.success("Reduction request drafted");
      setForm({ requested_pct: "", requested_amount: "", rationale: "" });
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not create reduction request");
    } finally {
      setSubmitting(false);
    }
  };

  const markSent = async (r) => {
    setBusyId(r.id);
    try {
      await api.patch(`/reductions/${r.id}`, { state: "sent" });
      toast.success("Marked sent");
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not update reduction request");
    } finally {
      setBusyId(null);
    }
  };

  const recordCounter = async (r) => {
    const draft = drafts[r.id] || {};
    const counter_amount = parseFloat(draft.counterAmount);
    if (Number.isNaN(counter_amount)) {
      toast.error("Enter a numeric counter amount");
      return;
    }
    setBusyId(r.id);
    try {
      await api.patch(`/reductions/${r.id}`, {
        state: "countered",
        counter_amount,
        note: draft.counterNote?.trim() || undefined,
      });
      toast.success("Counter recorded");
      setDraft(r.id, { counterAmount: "", counterNote: "" });
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not record counter");
    } finally {
      setBusyId(null);
    }
  };

  const acceptReduction = async (r) => {
    const draft = drafts[r.id] || {};
    const final_amount = parseFloat(draft.finalAmount);
    if (Number.isNaN(final_amount)) {
      toast.error("Enter a numeric final amount");
      return;
    }
    setBusyId(r.id);
    try {
      await api.post(`/reductions/${r.id}/accept`, {
        final_amount,
        note: draft.acceptNote?.trim() || undefined,
      });
      toast.success("Reduction accepted");
      setDraft(r.id, { finalAmount: "", acceptNote: "" });
      refresh();
    } catch (err) {
      if (err?.response?.status === 403) {
        toast.error("Requires attorney sign-off");
      } else {
        toast.error(err?.response?.data?.detail || "Could not accept reduction");
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div data-testid={`reduction-panel-${lienId}`}>
      <h3 className="font-display font-bold text-sm flex items-center gap-2">
        <Percent size={14} className="text-praxium-accent" /> Reductions
      </h3>
      {lien && (
        <div className="text-xs font-mono text-praxium-subtle mt-0.5">
          {lien.lienholder} &middot; claimed {formatMoney(lien.claimed_amount)}
          {lien.verified_amount != null ? ` · verified ${formatMoney(lien.verified_amount)}` : ""}
          {lien.final_amount != null ? ` · final ${formatMoney(lien.final_amount)}` : ""}
        </div>
      )}

      {loading ? (
        <div
          className="mt-3 flex items-center gap-2 text-xs text-praxium-subtle"
          data-testid={`reduction-loading-${lienId}`}
        >
          <Loader2 size={12} className="animate-spin" /> Loading reductions…
        </div>
      ) : (
        <>
          <div className="mt-3 space-y-3">
            {reductions.length === 0 ? (
              <EmptyState title="No reduction requests yet" testId={`reductions-empty-${lienId}`} />
            ) : (
              reductions.map((r) => {
                const draft = drafts[r.id] || {};
                const terminal = TERMINAL_STATES.includes(r.state);
                const busy = busyId === r.id;
                return (
                  <div key={r.id} className="data-card p-3" data-testid={`reduction-row-${r.id}`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">
                            {r.requested_pct != null ? `${r.requested_pct}%` : formatMoney(r.requested_amount)}
                          </span>
                          <span
                            className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 border rounded-sm ${stateColor(r.state)}`}
                            data-testid={`reduction-state-${r.id}`}
                          >
                            {r.state}
                          </span>
                        </div>
                        {r.rationale && (
                          <p className="text-xs text-praxium-subtle mt-1 max-w-md leading-relaxed">{r.rationale}</p>
                        )}
                        <div className="text-xs font-mono text-praxium-subtle mt-1">{formatDate(r.created_at)}</div>
                      </div>
                    </div>

                    {r.offers?.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-praxium-line">
                        <div className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle mb-1">
                          Offers
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {r.offers.map((o, i) => (
                            <div
                              key={i}
                              className="rounded-sm border border-praxium-line px-2 py-1 text-xs font-mono"
                              data-testid={`reduction-offer-${r.id}-${i}`}
                            >
                              {formatMoney(o.counter_amount ?? o.amount)}
                              {o.note ? ` — ${o.note}` : ""}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {r.final_amount != null && (
                      <div className="mt-2 text-xs font-mono text-emerald-600" data-testid={`reduction-final-${r.id}`}>
                        Final: {formatMoney(r.final_amount)}
                      </div>
                    )}

                    {!terminal && (
                      <div className="mt-3 pt-3 border-t border-praxium-line flex flex-wrap items-end gap-2">
                        {r.state === "drafted" && (
                          <button
                            type="button"
                            onClick={() => markSent(r)}
                            disabled={busy}
                            data-testid={`reduction-mark-sent-${r.id}`}
                            className="rounded-sm border border-praxium-line px-3 py-1.5 text-xs font-semibold text-praxium-subtle disabled:opacity-50"
                          >
                            <Send size={12} className="inline mr-1" /> Mark sent
                          </button>
                        )}

                        {(r.state === "sent" || r.state === "countered") && (
                          <div className="flex items-end gap-2">
                            <div>
                              <label className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle block mb-1">
                                Counter amount
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={draft.counterAmount ?? ""}
                                onChange={(e) => setDraft(r.id, { counterAmount: e.target.value })}
                                data-testid={`reduction-counter-amount-${r.id}`}
                                className="w-28 px-2.5 py-1.5 border border-praxium-line rounded-sm text-sm font-mono bg-praxium-surface"
                                placeholder="0.00"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => recordCounter(r)}
                              disabled={busy}
                              data-testid={`reduction-record-counter-${r.id}`}
                              className="rounded-sm border border-praxium-line px-3 py-1.5 text-xs font-semibold text-praxium-subtle disabled:opacity-50"
                            >
                              Record counter
                            </button>
                          </div>
                        )}

                        <div className="flex items-end gap-2">
                          <div>
                            <label className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle block mb-1">
                              Final amount
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={draft.finalAmount ?? ""}
                              onChange={(e) => setDraft(r.id, { finalAmount: e.target.value })}
                              data-testid={`reduction-final-amount-${r.id}`}
                              className="w-28 px-2.5 py-1.5 border border-praxium-line rounded-sm text-sm font-mono bg-praxium-surface"
                              placeholder="0.00"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => acceptReduction(r)}
                            disabled={busy}
                            data-testid={`reduction-accept-${r.id}`}
                            className="btn-praxium disabled:opacity-50"
                          >
                            <CheckCircle2 size={14} /> Accept
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <form
            onSubmit={submitRequest}
            className="mt-4 data-card p-3 flex flex-wrap gap-2 items-end"
            data-testid={`reduction-form-${lienId}`}
          >
            <div>
              <label className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle block mb-1">
                Requested %
              </label>
              <input
                type="number"
                step="0.1"
                value={form.requested_pct}
                onChange={(e) => setForm((f) => ({ ...f, requested_pct: e.target.value }))}
                data-testid={`reduction-form-pct-${lienId}`}
                className="w-24 px-2.5 py-1.5 border border-praxium-line rounded-sm text-sm font-mono bg-praxium-surface"
                placeholder="e.g. 30"
              />
            </div>
            <div>
              <label className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle block mb-1">
                Requested amount
              </label>
              <input
                type="number"
                step="0.01"
                value={form.requested_amount}
                onChange={(e) => setForm((f) => ({ ...f, requested_amount: e.target.value }))}
                data-testid={`reduction-form-amount-${lienId}`}
                className="w-28 px-2.5 py-1.5 border border-praxium-line rounded-sm text-sm font-mono bg-praxium-surface"
                placeholder="0.00"
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle block mb-1">
                Rationale
              </label>
              <input
                value={form.rationale}
                onChange={(e) => setForm((f) => ({ ...f, rationale: e.target.value }))}
                data-testid={`reduction-form-rationale-${lienId}`}
                className="w-full px-2.5 py-1.5 border border-praxium-line rounded-sm text-sm bg-praxium-surface"
                placeholder="Why this reduction is warranted"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              data-testid={`reduction-form-submit-${lienId}`}
              className="btn-praxium disabled:opacity-50"
            >
              <Plus size={14} /> Request reduction
            </button>
          </form>
        </>
      )}
    </div>
  );
}
