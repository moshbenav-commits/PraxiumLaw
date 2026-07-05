import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { formatMoney, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Calculator,
  ExternalLink,
  Lock,
  Plus,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import PageLoader from "@/components/common/PageLoader";

const APPROVER_ROLES = new Set(["admin", "partner", "attorney"]);

const DIRECTIONS = [
  { value: "insurance_to_plaintiff", label: "Insurance → plaintiff" },
  { value: "plaintiff_counter", label: "Plaintiff counter" },
  { value: "insurance_to_plaintiff_final", label: "Insurance final" },
];

function inputClass() {
  return "w-full text-xs border border-praxium-line rounded-sm px-2 py-1 bg-white";
}

export default function MatterSettlementTab({ matterId, practiceArea }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [newOffer, setNewOffer] = useState({
    amount: "",
    offer_date: new Date().toISOString().slice(0, 10),
    direction: "insurance_to_plaintiff",
    carrier: "",
    adjuster_notes: "",
  });
  const [newScenarioName, setNewScenarioName] = useState("");

  const canReduce = APPROVER_ROLES.has(user?.role);

  const load = useCallback(() => {
    api
      .get(`/matters/${matterId}/settlement`)
      .then((r) => {
        setData(r.data);
        const active = r.data.pi_settlement?.active_scenario_id;
        const first = r.data.pi_settlement?.scenarios?.[0]?.id;
        setActiveId((prev) => prev || active || first || null);
      })
      .catch(() => toast.error("Could not load settlement"))
      .finally(() => setLoading(false));
  }, [matterId]);

  useEffect(() => {
    load();
  }, [load]);

  if (practiceArea !== "personal_injury") {
    return (
      <div className="data-card p-6 text-sm text-praxium-subtle">
        Settlement calculator applies to personal injury matters only.
      </div>
    );
  }

  if (loading || !data) return <PageLoader label="Loading settlement…" />;

  const settlement = data.pi_settlement;
  const offers = settlement.offers || [];
  const scenarios = settlement.scenarios || [];
  const scenario = scenarios.find((s) => s.id === activeId) || scenarios[0];
  const computed = scenario?.computed;

  const addOffer = async (e) => {
    e.preventDefault();
    if (!newOffer.amount) return;
    setBusy(true);
    try {
      await api.post(`/matters/${matterId}/settlement/offers`, {
        ...newOffer,
        amount: Number(newOffer.amount),
      });
      setNewOffer((o) => ({ ...o, amount: "", adjuster_notes: "" }));
      toast.success("Offer logged");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not log offer");
    } finally {
      setBusy(false);
    }
  };

  const createScenario = async (e) => {
    e.preventDefault();
    if (!newScenarioName.trim()) return;
    setBusy(true);
    try {
      const r = await api.post(`/matters/${matterId}/settlement/scenarios`, {
        name: newScenarioName.trim(),
      });
      setNewScenarioName("");
      setActiveId(r.data.scenario.id);
      toast.success("Scenario created from Meds ledger");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not create scenario");
    } finally {
      setBusy(false);
    }
  };

  const createScenarioFromOffer = async (offer) => {
    setBusy(true);
    try {
      const r = await api.post(`/matters/${matterId}/settlement/scenarios`, {
        name: `Offer ${formatMoney(offer.amount)} — ${formatDate(offer.offer_date)}`,
        offer_id: offer.id,
        gross_settlement: offer.amount,
      });
      setActiveId(r.data.scenario.id);
      toast.success("Scenario created from offer");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const patchScenario = async (patch) => {
    if (!scenario) return;
    setBusy(true);
    try {
      await api.patch(`/matters/${matterId}/settlement/scenarios/${scenario.id}`, patch);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const syncMeds = async () => {
    if (!scenario) return;
    setBusy(true);
    try {
      await api.post(`/matters/${matterId}/settlement/scenarios/${scenario.id}/sync-from-meds`);
      toast.success("Synced balances from Meds ledger");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Sync failed");
    } finally {
      setBusy(false);
    }
  };

  const approveScenario = async () => {
    if (!scenario) return;
    setBusy(true);
    try {
      await api.post(`/matters/${matterId}/settlement/scenarios/${scenario.id}/approve`);
      toast.success("Scenario approved for client-facing numbers");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Approve failed");
    } finally {
      setBusy(false);
    }
  };

  const updateLineReduction = (lineId, field, value) => {
    if (!canReduce) {
      toast.error("Attorney must set reduction amounts");
      return;
    }
    const line = scenario.line_items.find((l) => l.id === lineId);
    if (!line) return;
    const patch = {
      line_items: [
        {
          id: lineId,
          reduction_type: field === "reduction_type" ? value : line.reduction_type,
          reduction_percent: field === "reduction_percent" ? Number(value) : line.reduction_percent,
          reduction_flat: field === "reduction_flat" ? Number(value) : line.reduction_flat,
        },
      ],
    };
    if (field === "reduction_type") {
      patch.line_items[0].reduction_type = value;
    }
    patchScenario(patch);
  };

  const syncFromExpenses = async () => {
    setBusy(true);
    try {
      const r = await api.post(`/matters/${matterId}/expenses/sync-to-settlement`);
      toast.success(`Expenses synced: ${formatMoney(r.data.expenses_synced)}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Expense sync failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5" data-testid="matter-settlement-tab">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="overline mb-1 flex items-center gap-2">
            <Calculator size={12} /> // settlement / negotiations
          </div>
          <p className="text-sm text-praxium-subtle max-w-xl">
            Log offers · build scenarios from Meds · attorney sets reductions · net to client.
          </p>
        </div>
        <Link to="/training/article/10-settlement-calculator-scenarios" className="btn-ghost text-xs inline-flex items-center gap-1">
          <ExternalLink size={11} /> Settlement scenarios
        </Link>
      </div>

      <div className="data-card p-4">
        <div className="overline mb-3 text-[10px]">Offers log</div>
        {offers.length > 0 ? (
          <ul className="space-y-2 mb-4">
            {offers.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-3 text-sm border-b border-praxium-line pb-2">
                <span className="font-mono font-semibold">{formatMoney(o.amount)}</span>
                <span className="text-xs text-praxium-subtle">{formatDate(o.offer_date)}</span>
                <span className="text-xs">{DIRECTIONS.find((d) => d.value === o.direction)?.label}</span>
                {o.carrier ? <span className="text-xs">{o.carrier}</span> : null}
                <button type="button" className="btn-ghost text-[10px] ml-auto" disabled={busy} onClick={() => createScenarioFromOffer(o)}>
                  + Scenario
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-praxium-subtle mb-4">No offers logged yet.</p>
        )}
        <form onSubmit={addOffer} className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          <input type="number" className={inputClass()} placeholder="Amount" value={newOffer.amount} onChange={(e) => setNewOffer({ ...newOffer, amount: e.target.value })} data-testid="settlement-offer-amount" />
          <input type="date" className={inputClass()} value={newOffer.offer_date} onChange={(e) => setNewOffer({ ...newOffer, offer_date: e.target.value })} />
          <select className={inputClass()} value={newOffer.direction} onChange={(e) => setNewOffer({ ...newOffer, direction: e.target.value })}>
            {DIRECTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <input className={inputClass()} placeholder="Carrier" value={newOffer.carrier} onChange={(e) => setNewOffer({ ...newOffer, carrier: e.target.value })} />
          <input className={inputClass() + " col-span-2"} placeholder="Adjuster notes" value={newOffer.adjuster_notes} onChange={(e) => setNewOffer({ ...newOffer, adjuster_notes: e.target.value })} />
          <button type="submit" className="btn-praxium text-xs" disabled={busy}><Plus size={12} /> Log offer</button>
        </form>
      </div>

      <div className="data-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="overline text-[10px]">Calculator scenarios</div>
          <form onSubmit={createScenario} className="flex gap-2">
            <input className={inputClass() + " text-sm w-48"} placeholder="Scenario name" value={newScenarioName} onChange={(e) => setNewScenarioName(e.target.value)} data-testid="settlement-new-scenario" />
            <button type="submit" className="btn-ghost text-xs" disabled={busy}><Plus size={12} /> New</button>
          </form>
        </div>

        {scenarios.length === 0 ? (
          <p className="text-sm text-praxium-subtle">Create a scenario to pull provider balances from the Meds tab.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1 mb-4">
              {scenarios.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveId(s.id)}
                  className={cn(
                    "px-2 py-1 text-[10px] font-mono uppercase rounded border",
                    s.id === scenario?.id ? "bg-praxium-ink text-white border-praxium-ink" : "border-praxium-line text-praxium-subtle"
                  )}
                >
                  {s.name}
                  {s.attorney_approved ? " ✓" : ""}
                </button>
              ))}
            </div>

            {scenario ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <label className="text-xs">
                    <span className="font-mono uppercase text-[10px] text-praxium-subtle">Gross settlement</span>
                    <input type="number" className={inputClass()} value={scenario.gross_settlement ?? 0} onChange={(e) => patchScenario({ gross_settlement: Number(e.target.value) })} />
                  </label>
                  <label className="text-xs">
                    <span className="font-mono uppercase text-[10px] text-praxium-subtle">Expenses</span>
                    <div className="flex gap-2 items-center mt-0.5">
                      <input type="number" className={inputClass()} value={scenario.expenses ?? 0} onChange={(e) => patchScenario({ expenses: Number(e.target.value) })} />
                      <button type="button" className="btn-ghost text-[10px] whitespace-nowrap" disabled={busy} onClick={syncFromExpenses} data-testid="settlement-sync-expenses">
                        <RefreshCw size={10} /> From Expenses
                      </button>
                    </div>
                  </label>
                  <label className="text-xs">
                    <span className="font-mono uppercase text-[10px] text-praxium-subtle">MedPay to client</span>
                    <input type="number" className={inputClass()} value={scenario.medpay_to_client ?? 0} onChange={(e) => patchScenario({ medpay_to_client: Number(e.target.value) })} />
                  </label>
                  <label className="text-xs">
                    <span className="font-mono uppercase text-[10px] text-praxium-subtle">Attorney fee %</span>
                    <input
                      type="number"
                      className={inputClass()}
                      value={scenario.attorney_fee_pct ?? 33.333}
                      disabled={!canReduce || busy}
                      onChange={(e) => patchScenario({ attorney_fee_pct: Number(e.target.value) })}
                    />
                  </label>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  <button type="button" className="btn-ghost text-xs" disabled={busy} onClick={syncMeds}>
                    <RefreshCw size={12} /> Sync from Meds
                  </button>
                  {canReduce ? (
                    <button type="button" className="btn-praxium text-xs" disabled={busy} onClick={approveScenario} data-testid="settlement-approve-scenario">
                      <CheckCircle2 size={12} /> Approve client-facing scenario
                    </button>
                  ) : null}
                </div>

                {!canReduce ? (
                  <p className="text-xs text-praxium-subtle flex items-center gap-1 mb-3">
                    <Lock size={12} /> Staff can log offers and balances — attorney sets reductions and approves net figures.
                  </p>
                ) : null}

                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-praxium-line text-[10px] font-mono uppercase text-praxium-subtle">
                        <th className="text-left py-2 pr-2">Provider</th>
                        <th className="text-right py-2 pr-2">Balance</th>
                        <th className="text-right py-2 pr-2">Reduction %</th>
                        <th className="text-right py-2">Payable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-praxium-line">
                      {(scenario.line_items || []).map((line) => {
                        const payable = line.reduction_type === "percent"
                          ? (line.balance || 0) * (1 - (line.reduction_percent || 0) / 100)
                          : line.reduction_type === "flat"
                            ? Math.max(0, (line.balance || 0) - (line.reduction_flat || 0))
                            : line.balance || 0;
                        return (
                          <tr key={line.id}>
                            <td className="py-2 pr-2">{line.provider_name}</td>
                            <td className="py-2 pr-2 text-right font-mono">{formatMoney(line.balance)}</td>
                            <td className="py-2 pr-2 text-right">
                              <input
                                type="number"
                                className={inputClass() + " w-20 text-right ml-auto"}
                                disabled={!canReduce || busy}
                                value={line.reduction_percent ?? ""}
                                placeholder="—"
                                onBlur={(e) => {
                                  if (e.target.value !== "") updateLineReduction(line.id, "reduction_percent", e.target.value);
                                }}
                              />
                            </td>
                            <td className="py-2 text-right font-mono">{formatMoney(payable)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {computed ? (
                  <div
                    className={cn(
                      "rounded-lg border p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm",
                      computed.client_facing_ready ? "bg-emerald-50 border-emerald-200" : "bg-praxium-bg border-praxium-line"
                    )}
                    data-testid="settlement-summary"
                  >
                    <div><div className="text-[10px] font-mono uppercase text-praxium-subtle">Specials</div><div className="font-mono">{formatMoney(computed.total_specials)}</div></div>
                    <div><div className="text-[10px] font-mono uppercase text-praxium-subtle">Med payout</div><div className="font-mono">{formatMoney(computed.total_med_payout)}</div></div>
                    <div><div className="text-[10px] font-mono uppercase text-praxium-subtle">Attorney fee</div><div className="font-mono">{formatMoney(computed.attorney_fee)}</div></div>
                    <div><div className="text-[10px] font-mono uppercase text-praxium-subtle">Expenses</div><div className="font-mono">{formatMoney(computed.expenses)}</div></div>
                    <div className="col-span-2 sm:col-span-1">
                      <div className="text-[10px] font-mono uppercase text-praxium-subtle">Net to client</div>
                      <div className={cn("font-mono font-bold text-lg", computed.client_facing_ready ? "text-emerald-900" : "text-praxium-ink")}>
                        {computed.client_facing_ready ? formatMoney(computed.net_to_client) : "—"}
                      </div>
                      {!computed.client_facing_ready ? (
                        <div className="text-[10px] text-praxium-subtle mt-1">
                          {computed.pending_attorney_reductions ? "Attorney reductions pending" : "Attorney approval required"}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
