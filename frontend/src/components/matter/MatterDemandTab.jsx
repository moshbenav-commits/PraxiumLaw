import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { formatMoney, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileStack,
  Lock,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import PageLoader from "@/components/common/PageLoader";
import MatterLettersCard from "@/components/matter/MatterLettersCard";
import { aiDraftLetterNarrative } from "@/lib/lettersApi";

const DEMAND_TYPES = [
  { value: "third_party", label: "3P bodily injury demand" },
  { value: "medpay", label: "MedPay demand (chronological exhibits)" },
  { value: "um_uim", label: "UM / UIM request" },
];

const STATUS_LABELS = {
  draft: { label: "Draft", className: "bg-zinc-100 text-zinc-800 border-zinc-200" },
  pending_attorney_review: { label: "Pending attorney review", className: "bg-amber-100 text-amber-900 border-amber-200" },
  approved: { label: "Attorney approved", className: "bg-emerald-100 text-emerald-900 border-emerald-200" },
  rejected: { label: "Rejected — revise", className: "bg-red-100 text-red-900 border-red-200" },
  sent: { label: "Sent", className: "bg-sky-100 text-sky-900 border-sky-200" },
};

const APPROVER_ROLES = new Set(["admin", "partner", "attorney"]);

function inputClass() {
  return "w-full text-xs border border-praxium-line rounded-sm px-2 py-1 bg-white";
}

export default function MatterDemandTab({ matterId, practiceArea }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [aiDrafting, setAiDrafting] = useState(false);

  const aiDraftNarrative = async () => {
    setAiDrafting(true);
    try {
      const r = await aiDraftLetterNarrative(matterId, { letterType: "demand" });
      setData((prev) => ({
        ...prev,
        pi_demand: { ...prev.pi_demand, letter_draft_notes: r.draft },
      }));
      toast.success("AI narrative drafted — review, edit, then it saves on blur");
    } catch (err) {
      toast.error(err.response?.data?.detail || "AI draft failed — check Settings → Integrations");
    } finally {
      setAiDrafting(false);
    }
  };

  const load = useCallback(() => {
    api
      .get(`/matters/${matterId}/demand`)
      .then((r) => setData(r.data))
      .catch(() => toast.error("Could not load demand builder"))
      .finally(() => setLoading(false));
  }, [matterId]);

  useEffect(() => {
    load();
  }, [load]);

  if (practiceArea !== "personal_injury") {
    return (
      <div className="data-card p-6 text-sm text-praxium-subtle">
        Demand builder applies to personal injury matters only.
      </div>
    );
  }

  if (loading || !data) return <PageLoader label="Loading demand builder…" />;

  const demand = data.pi_demand;
  const statusMeta = STATUS_LABELS[demand.status] || STATUS_LABELS.draft;
  const canApprove = APPROVER_ROLES.has(user?.role);
  const locked = demand.status === "pending_attorney_review" || demand.status === "sent";
  const exhibits = demand.exhibits || [];

  const savePatch = async (patch) => {
    setBusy(true);
    try {
      const r = await api.patch(`/matters/${matterId}/demand`, patch);
      setData((prev) => ({ ...prev, pi_demand: r.data.pi_demand }));
      toast.success("Saved");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const rebuildExhibits = async () => {
    setBusy(true);
    try {
      const r = await api.post(`/matters/${matterId}/demand/rebuild-exhibits`);
      setData((prev) => ({ ...prev, pi_demand: r.data.pi_demand }));
      toast.success(`Rebuilt ${r.data.exhibit_count} exhibits (yellow-sheet order)`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Rebuild failed");
    } finally {
      setBusy(false);
    }
  };

  const submitForReview = async () => {
    setBusy(true);
    try {
      const r = await api.post(`/matters/${matterId}/demand/submit-for-review`);
      setData((prev) => ({ ...prev, pi_demand: r.data.pi_demand }));
      toast.success("Submitted for attorney review");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Submit failed");
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    setBusy(true);
    try {
      const r = await api.post(`/matters/${matterId}/demand/approve`, {});
      setData((prev) => ({ ...prev, pi_demand: r.data.pi_demand, can_send: true }));
      toast.success("Demand approved");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Approve failed");
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!rejectNotes.trim()) {
      toast.error("Add attorney notes explaining what to fix");
      return;
    }
    setBusy(true);
    try {
      const r = await api.post(`/matters/${matterId}/demand/reject`, { attorney_notes: rejectNotes.trim() });
      setData((prev) => ({ ...prev, pi_demand: r.data.pi_demand }));
      setRejectNotes("");
      toast.success("Returned to case manager for revision");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Reject failed");
    } finally {
      setBusy(false);
    }
  };

  const markSent = async () => {
    setBusy(true);
    try {
      const r = await api.post(`/matters/${matterId}/demand/mark-sent`, {
        response_due_date: demand.response_due_date || undefined,
      });
      setData((prev) => ({ ...prev, pi_demand: r.data.pi_demand }));
      toast.success("Demand marked sent");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Send blocked — attorney approval required");
    } finally {
      setBusy(false);
    }
  };

  const togglePrep = (id, complete) => {
    const prep_checklist = demand.prep_checklist.map((row) =>
      row.id === id ? { ...row, complete } : row
    );
    savePatch({ prep_checklist });
  };

  const toggleExhibit = (exId, included) => {
    const exhibitsPatch = exhibits.map((ex) => (ex.id === exId ? { ...ex, included } : ex));
    savePatch({ exhibits: exhibitsPatch });
  };

  return (
    <div className="space-y-5" data-testid="matter-demand-tab">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="overline mb-1 flex items-center gap-2">
            <FileStack size={12} /> // demand builder
          </div>
          <p className="text-sm text-praxium-subtle max-w-xl">
            Yellow-sheet exhibit order · prep checklist · attorney must approve before send.
          </p>
        </div>
        <Link to="/training/article/09-demand-prep-checklist" className="btn-ghost text-xs inline-flex items-center gap-1">
          <ExternalLink size={11} /> Demand prep checklist
        </Link>
      </div>

      <div className="data-card p-4 flex flex-wrap items-center gap-3">
        <span className={cn("status-pip border text-xs font-mono uppercase", statusMeta.className)}>
          {statusMeta.label}
        </span>
        <select
          className={inputClass() + " w-auto text-sm"}
          value={demand.demand_type}
          disabled={locked || busy}
          onChange={(e) => savePatch({ demand_type: e.target.value })}
          data-testid="demand-type-select"
        >
          {DEMAND_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <div className="text-sm">
          <span className="text-praxium-subtle font-mono text-[10px] uppercase">Specials</span>
          <div className="font-mono font-semibold">{formatMoney(demand.specials_total)}</div>
        </div>
        {data.validation ? (
          <div className="text-sm">
            <span className="text-praxium-subtle font-mono text-[10px] uppercase">Grand total (med + economic)</span>
            <div className="font-mono font-semibold">{formatMoney(data.validation.grand_demand_total)}</div>
          </div>
        ) : null}
        {data.limits_hint ? (
          <div className="text-xs bg-praxium-bg rounded px-3 py-2 max-w-md">
            BI limit {formatMoney(data.limits_hint.bi_per_person)} ·{" "}
            {data.limits_hint.pct_of_limits}% of limits · training band{" "}
            {formatMoney(data.limits_hint.training_heuristic_low)}–{formatMoney(data.limits_hint.training_heuristic_high)}
          </div>
        ) : null}
      </div>

      {data.validation?.warnings?.length ? (
        <div className="flex flex-col gap-1 text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">
          {data.validation.warnings.map((w) => (
            <div key={w} className="flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      ) : null}

      {data.validation && !data.validation.specials_match ? (
        <div className="text-xs font-mono text-praxium-subtle">
          Meds ledger {formatMoney(data.validation.meds_ledger_total)} vs exhibits {formatMoney(data.validation.exhibit_specials)}
        </div>
      ) : null}

      {demand.status === "pending_attorney_review" && !canApprove ? (
        <div className="flex items-start gap-2 text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">
          <Lock size={16} className="shrink-0 mt-0.5 text-amber-800" />
          <span>Package locked pending supervising attorney review. You cannot edit until approved or rejected.</span>
        </div>
      ) : null}

      {demand.status === "rejected" && demand.approval?.attorney_notes ? (
        <div className="flex items-start gap-2 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Attorney revision notes</div>
            <p>{demand.approval.attorney_notes}</p>
          </div>
        </div>
      ) : null}

      <div className="data-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="overline text-[10px]">Prep checklist ({data.prep_incomplete_count} open)</div>
        </div>
        <ul className="space-y-2">
          {demand.prep_checklist.map((row) => (
            <li key={row.id} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(row.complete)}
                disabled={locked || busy}
                onChange={(e) => togglePrep(row.id, e.target.checked)}
                data-testid={`demand-prep-${row.id}`}
              />
              <span className={cn(row.complete && "line-through text-praxium-subtle")}>{row.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="data-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="overline text-[10px]">Exhibits — yellow-sheet order</div>
          <button
            type="button"
            className="btn-ghost text-xs"
            disabled={locked || busy}
            onClick={rebuildExhibits}
            data-testid="demand-rebuild-exhibits"
          >
            <RefreshCw size={12} /> Rebuild from Meds ledger
          </button>
        </div>
        {exhibits.length === 0 ? (
          <p className="text-sm text-praxium-subtle">
            No exhibits yet. Add providers on the{" "}
            <Link to={`/matters/${matterId}`} className="text-praxium-accent-text hover:underline" onClick={() => {}}>
              Medical tab
            </Link>
            , then rebuild.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-praxium-line text-[10px] font-mono uppercase text-praxium-subtle">
                  <th className="text-left py-2 pr-2">#</th>
                  <th className="text-left py-2 pr-2">Include</th>
                  <th className="text-left py-2 pr-2">Provider</th>
                  <th className="text-left py-2 pr-2">Specialty</th>
                  <th className="text-right py-2">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-praxium-line">
                {[...exhibits].sort((a, b) => a.sort_order - b.sort_order).map((ex) => (
                  <tr key={ex.id} data-testid={`demand-exhibit-${ex.id}`}>
                    <td className="py-2 pr-2 font-mono text-xs">{ex.sort_order}</td>
                    <td className="py-2 pr-2">
                      <input
                        type="checkbox"
                        checked={Boolean(ex.included)}
                        disabled={locked || busy}
                        onChange={(e) => toggleExhibit(ex.id, e.target.checked)}
                      />
                    </td>
                    <td className="py-2 pr-2">{ex.provider_name || ex.label}</td>
                    <td className="py-2 pr-2 text-xs text-praxium-subtle">{ex.specialty}</td>
                    <td className="py-2 text-right font-mono">{formatMoney(ex.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="data-card p-4 space-y-4" data-testid="demand-economic-damages">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="overline text-[10px]">Economic damages — wage / mileage / expenses</div>
          <button
            type="button"
            className="btn-ghost text-xs"
            disabled={locked || busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await api.post(`/matters/${matterId}/demand/sync-economic-from-expenses`);
                setData((prev) => ({ ...prev, pi_demand: r.data.pi_demand, expense_summary: r.data.expense_summary }));
                toast.success("Pulled totals from Expenses tab");
                load();
              } catch (err) {
                toast.error(err.response?.data?.detail || "Sync failed");
              } finally {
                setBusy(false);
              }
            }}
            data-testid="demand-sync-economic"
          >
            <RefreshCw size={12} /> Pull from Expenses tab
          </button>
        </div>
        {(() => {
          const econ = demand.economic_damages || {};
          const saveEcon = (patch) => savePatch({ economic_damages: { ...econ, ...patch } });
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <label className="text-xs">
                <span className="font-mono uppercase text-praxium-subtle text-[10px]">Wage loss hours</span>
                <input type="number" className={inputClass()} disabled={locked || busy} value={econ.wage_loss_hours ?? ""} onChange={(e) => setData((prev) => ({ ...prev, pi_demand: { ...prev.pi_demand, economic_damages: { ...econ, wage_loss_hours: e.target.value ? Number(e.target.value) : null } } }))} onBlur={() => saveEcon({ wage_loss_hours: econ.wage_loss_hours, wage_loss_hourly_rate: econ.wage_loss_hourly_rate })} />
              </label>
              <label className="text-xs">
                <span className="font-mono uppercase text-praxium-subtle text-[10px]">Hourly rate ($)</span>
                <input type="number" className={inputClass()} disabled={locked || busy} value={econ.wage_loss_hourly_rate ?? ""} onChange={(e) => setData((prev) => ({ ...prev, pi_demand: { ...prev.pi_demand, economic_damages: { ...econ, wage_loss_hourly_rate: e.target.value ? Number(e.target.value) : null } } }))} onBlur={() => saveEcon({ wage_loss_hours: econ.wage_loss_hours, wage_loss_hourly_rate: econ.wage_loss_hourly_rate })} />
              </label>
              <label className="text-xs">
                <span className="font-mono uppercase text-praxium-subtle text-[10px]">Wage loss total</span>
                <div className="font-mono text-sm pt-1">{formatMoney(econ.wage_loss_total)}</div>
              </label>
              <label className="text-xs">
                <span className="font-mono uppercase text-praxium-subtle text-[10px]">Mileage miles</span>
                <input type="number" className={inputClass()} disabled={locked || busy} value={econ.mileage_miles ?? ""} onChange={(e) => setData((prev) => ({ ...prev, pi_demand: { ...prev.pi_demand, economic_damages: { ...econ, mileage_miles: e.target.value ? Number(e.target.value) : null } } }))} onBlur={() => saveEcon({ mileage_miles: econ.mileage_miles, mileage_rate: econ.mileage_rate })} />
              </label>
              <label className="text-xs">
                <span className="font-mono uppercase text-praxium-subtle text-[10px]">Mileage rate ($/mi)</span>
                <input type="number" step="0.01" className={inputClass()} disabled={locked || busy} value={econ.mileage_rate ?? 0.67} onChange={(e) => setData((prev) => ({ ...prev, pi_demand: { ...prev.pi_demand, economic_damages: { ...econ, mileage_rate: e.target.value ? Number(e.target.value) : 0.67 } } }))} onBlur={() => saveEcon({ mileage_miles: econ.mileage_miles, mileage_rate: econ.mileage_rate })} />
              </label>
              <label className="text-xs">
                <span className="font-mono uppercase text-praxium-subtle text-[10px]">Mileage total</span>
                <div className="font-mono text-sm pt-1">{formatMoney(econ.mileage_total)}</div>
              </label>
              <label className="text-xs">
                <span className="font-mono uppercase text-praxium-subtle text-[10px]">Rental car ($)</span>
                <input type="number" className={inputClass()} disabled={locked || busy} value={econ.rental_car_total ?? 0} onChange={(e) => setData((prev) => ({ ...prev, pi_demand: { ...prev.pi_demand, economic_damages: { ...econ, rental_car_total: e.target.value ? Number(e.target.value) : 0 } } }))} onBlur={() => saveEcon({ rental_car_total: econ.rental_car_total })} />
              </label>
              <label className="text-xs">
                <span className="font-mono uppercase text-praxium-subtle text-[10px]">Other OOP ($)</span>
                <input type="number" className={inputClass()} disabled={locked || busy} value={econ.other_expenses_total ?? 0} onChange={(e) => setData((prev) => ({ ...prev, pi_demand: { ...prev.pi_demand, economic_damages: { ...econ, other_expenses_total: e.target.value ? Number(e.target.value) : 0 } } }))} onBlur={() => saveEcon({ other_expenses_total: econ.other_expenses_total })} />
              </label>
            </div>
          );
        })()}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <label className="data-card p-4 block text-xs">
          <span className="font-mono uppercase text-praxium-subtle text-[10px]">General damages notes</span>
          <textarea
            className={inputClass() + " mt-1 min-h-[80px] text-sm"}
            value={demand.general_damages_notes || ""}
            disabled={locked || busy}
            onChange={(e) => setData((prev) => ({
              ...prev,
              pi_demand: { ...prev.pi_demand, general_damages_notes: e.target.value },
            }))}
            onBlur={() => savePatch({ general_damages_notes: demand.general_damages_notes })}
          />
        </label>
        <label className="data-card p-4 block text-xs">
          <span className="font-mono uppercase text-praxium-subtle text-[10px] flex items-center justify-between">
            Letter draft notes — injuries &amp; treatment narrative
            <button
              type="button"
              className="btn-ghost text-[10px] normal-case"
              disabled={locked || busy || aiDrafting}
              onClick={aiDraftNarrative}
              data-testid="demand-ai-draft-narrative"
            >
              <Sparkles size={10} /> {aiDrafting ? "Drafting…" : "AI draft"}
            </button>
          </span>
          <textarea
            className={inputClass() + " mt-1 min-h-[80px] text-sm"}
            value={demand.letter_draft_notes || ""}
            disabled={locked || busy}
            onChange={(e) => setData((prev) => ({
              ...prev,
              pi_demand: { ...prev.pi_demand, letter_draft_notes: e.target.value },
            }))}
            onBlur={() => savePatch({ letter_draft_notes: demand.letter_draft_notes })}
          />
        </label>
      </div>

      <MatterLettersCard matterId={matterId} tab="demand" refreshKey={demand.status} />

      <label className="data-card p-4 block text-xs max-w-xs">
        <span className="font-mono uppercase text-praxium-subtle text-[10px]">Response due (calendar)</span>
        <input
          type="date"
          className={inputClass() + " mt-1 text-sm"}
          value={demand.response_due_date || ""}
          disabled={busy}
          onChange={(e) => savePatch({ response_due_date: e.target.value || null })}
        />
      </label>

      <div className="flex flex-wrap gap-2 pt-2 border-t border-praxium-line">
        {(demand.status === "draft" || demand.status === "rejected") && (
          <button
            type="button"
            className="btn-praxium text-sm"
            disabled={busy || exhibits.length === 0}
            onClick={submitForReview}
            data-testid="demand-submit-review"
          >
            <ShieldCheck size={14} /> Submit for attorney review
          </button>
        )}

        {demand.status === "pending_attorney_review" && canApprove && (
          <>
            <button type="button" className="btn-praxium text-sm" disabled={busy} onClick={approve} data-testid="demand-approve">
              <CheckCircle2 size={14} /> Approve demand
            </button>
            <input
              className={inputClass() + " flex-1 min-w-[200px] text-sm"}
              placeholder="Revision notes (required to reject)"
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
            />
            <button type="button" className="btn-ghost text-sm text-red-700" disabled={busy} onClick={reject}>
              Reject
            </button>
          </>
        )}

        {demand.status === "approved" && canApprove && (
          <button type="button" className="btn-praxium text-sm" disabled={busy} onClick={markSent} data-testid="demand-mark-sent">
            <Send size={14} /> Mark demand sent
          </button>
        )}

        {demand.sent_at ? (
          <span className="text-xs font-mono text-praxium-subtle self-center">
            Sent {formatDate(demand.sent_at)}
          </span>
        ) : null}
      </div>

      {!canApprove && demand.status !== "sent" ? (
        <p className="text-xs text-praxium-subtle flex items-center gap-1">
          <Lock size={12} /> Only supervising attorney / partner can approve and mark sent (UX-012).
        </p>
      ) : null}
    </div>
  );
}
