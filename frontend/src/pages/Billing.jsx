import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Receipt, Plus, ShieldCheck, Send, Landmark, ChevronRight } from "lucide-react";
import PageLoader from "@/components/common/PageLoader";
import EmptyState from "@/components/common/EmptyState";
import { formatMoney, formatDate } from "@/lib/utils";
import ReductionPanel from "@/components/billing/ReductionPanel";

const LEDGER_ENTRY_TYPES = [
  "provider_bill",
  "adjustment",
  "payment",
  "lien",
  "subrogation",
  "cost",
  "fee",
  "settlement_proceeds",
  "disbursement",
];

const LIEN_TYPES = ["medical", "statutory", "contractual", "subrogation", "non_medical"];

const LIEN_STATES = ["asserted", "verified", "negotiating", "resolved", "paid", "release_received"];
const LIEN_DISBURSABLE_STATES = ["paid", "release_received"];

function nextLienStates(current) {
  const idx = LIEN_STATES.indexOf(current);
  if (idx === -1) return [];
  return LIEN_STATES.slice(idx + 1);
}

function lienStateColor(state) {
  if (state === "release_received") return "border-emerald-500 text-emerald-600";
  if (state === "paid") return "border-praxium-accent text-praxium-accent";
  if (state === "asserted") return "border-praxium-line text-praxium-subtle";
  return "border-amber-500 text-amber-600";
}

export default function Billing() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [matters, setMatters] = useState([]);
  const [matterId, setMatterId] = useState("");

  const [matterLoading, setMatterLoading] = useState(false);
  const [ledger, setLedger] = useState({ entries: [], totals: { by_type: {}, client_net_estimate: 0 } });
  const [liens, setLiens] = useState([]);

  const [entryForm, setEntryForm] = useState({ entry_type: "provider_bill", description: "", amount: "", source_doc_id: "" });
  const [addingEntry, setAddingEntry] = useState(false);

  const [lienForm, setLienForm] = useState({ lienholder: "", lien_type: "medical", claimed_amount: "" });
  const [addingLien, setAddingLien] = useState(false);
  const [lienDrafts, setLienDrafts] = useState({});

  const [verifyTargets, setVerifyTargets] = useState("");
  const [requestingVerify, setRequestingVerify] = useState(false);

  const [disbursing, setDisbursing] = useState(false);
  const [disbursementBlocked, setDisbursementBlocked] = useState(null);
  const [disbursementDraft, setDisbursementDraft] = useState(null);

  const loadSummary = useCallback(() => {
    return api.get("/billing/summary").then((r) => setSummary(r.data));
  }, []);

  const loadMatters = useCallback(() => {
    return api.get("/matters").then((r) => setMatters(r.data || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadSummary(), loadMatters()])
      .catch(() => toast.error("Could not load billing OS"))
      .finally(() => setLoading(false));
  }, [loadSummary, loadMatters]);

  const loadMatterData = useCallback((id) => {
    if (!id) return Promise.resolve();
    setMatterLoading(true);
    return Promise.all([
      api.get(`/matters/${id}/ledger`).then((r) => setLedger(r.data || { entries: [], totals: { by_type: {}, client_net_estimate: 0 } })),
      api.get("/liens", { params: { matter_id: id } }).then((r) => setLiens(r.data.liens || [])),
    ])
      .catch(() => toast.error("Could not load matter billing data"))
      .finally(() => setMatterLoading(false));
  }, []);

  useEffect(() => {
    if (matterId) {
      setDisbursementBlocked(null);
      setDisbursementDraft(null);
      loadMatterData(matterId);
    } else {
      setLedger({ entries: [], totals: { by_type: {}, client_net_estimate: 0 } });
      setLiens([]);
    }
  }, [matterId, loadMatterData]);

  const refreshAll = () => {
    loadSummary();
    if (matterId) loadMatterData(matterId);
  };

  const submitEntry = async (e) => {
    e.preventDefault();
    if (!matterId) return;
    const amount = parseFloat(entryForm.amount);
    if (!entryForm.description.trim() || Number.isNaN(amount)) {
      toast.error("Description and a numeric amount are required");
      return;
    }
    setAddingEntry(true);
    try {
      await api.post(`/matters/${matterId}/ledger`, {
        entry_type: entryForm.entry_type,
        description: entryForm.description.trim(),
        amount,
        source_doc_id: entryForm.source_doc_id.trim() || undefined,
      });
      toast.success("Ledger entry added");
      setEntryForm({ entry_type: "provider_bill", description: "", amount: "", source_doc_id: "" });
      refreshAll();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not add ledger entry");
    } finally {
      setAddingEntry(false);
    }
  };

  const submitLien = async (e) => {
    e.preventDefault();
    if (!matterId) return;
    const claimed_amount = parseFloat(lienForm.claimed_amount);
    if (!lienForm.lienholder.trim() || Number.isNaN(claimed_amount)) {
      toast.error("Lienholder and a numeric claimed amount are required");
      return;
    }
    setAddingLien(true);
    try {
      await api.post("/liens", {
        lienholder: lienForm.lienholder.trim(),
        lien_type: lienForm.lien_type,
        claimed_amount,
        matter_id: matterId,
      });
      toast.success("Lien added");
      setLienForm({ lienholder: "", lien_type: "medical", claimed_amount: "" });
      refreshAll();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not add lien");
    } finally {
      setAddingLien(false);
    }
  };

  const setLienDraft = (lienId, patch) => {
    setLienDrafts((prev) => ({ ...prev, [lienId]: { ...prev[lienId], ...patch } }));
  };

  const advanceLien = async (lien) => {
    const draft = lienDrafts[lien.id] || {};
    const targetState = draft.targetState;
    if (!targetState) {
      toast.error("Choose a target state first");
      return;
    }
    if (targetState === "release_received" && !draft.releaseAck) {
      toast.error("Check the release-doc acknowledgement before moving to release_received");
      return;
    }
    try {
      await api.patch(`/liens/${lien.id}`, {
        state: targetState,
        release_doc_ack: !!draft.releaseAck,
      });
      toast.success(`Lien moved to ${targetState}`);
      setLienDrafts((prev) => ({ ...prev, [lien.id]: {} }));
      refreshAll();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Illegal lien transition");
    }
  };

  const submitVerifyAmount = async (lien) => {
    const draft = lienDrafts[lien.id] || {};
    const verified_amount = parseFloat(draft.verifiedAmount);
    if (Number.isNaN(verified_amount)) {
      toast.error("Enter a numeric verified amount");
      return;
    }
    try {
      await api.patch(`/liens/${lien.id}`, { verified_amount });
      toast.success("Verified amount recorded");
      refreshAll();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not update lien");
    }
  };

  const requestVerifications = async (e) => {
    e.preventDefault();
    if (!matterId) return;
    const targets = verifyTargets
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (targets.length === 0) {
      toast.error("Enter at least one verification target");
      return;
    }
    setRequestingVerify(true);
    try {
      await api.post(`/matters/${matterId}/verifications/request`, { targets });
      toast.success(`Verification requested from ${targets.length} target(s)`);
      setVerifyTargets("");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not request verifications");
    } finally {
      setRequestingVerify(false);
    }
  };

  const approveDisbursement = async () => {
    if (!matterId) return;
    setDisbursing(true);
    setDisbursementBlocked(null);
    setDisbursementDraft(null);
    try {
      const r = await api.post(`/matters/${matterId}/disbursement/approve`);
      setDisbursementDraft(r.data);
      toast.success("Disbursement approved");
      refreshAll();
    } catch (err) {
      const msg = err?.response?.data?.detail || "Disbursement could not be approved";
      setDisbursementBlocked(msg);
      toast.error(msg);
    } finally {
      setDisbursing(false);
    }
  };

  if (loading) return <PageLoader label="Loading billing OS…" />;

  const selectedMatter = matters.find((m) => m.id === matterId);
  const nonDisbursableLiens = liens.filter((l) => !LIEN_DISBURSABLE_STATES.includes(l.state));

  return (
    <div className="px-4 sm:px-6 py-6 max-w-5xl">
      <div className="overline mb-2">// billing os</div>
      <h1 className="font-display font-black text-2xl tracking-tight flex items-center gap-2">
        <Receipt className="text-praxium-accent" /> Billing &amp; disbursement
      </h1>
      <p className="text-sm text-praxium-subtle mt-2 max-w-2xl">
        One append-only ledger per case — provider bills, adjustments, payments, liens, costs, fees, and
        settlement proceeds — with a lien resolution chain and an attorney-gated disbursement release.
      </p>

      {/* Firm-wide summary */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="billing-summary">
        {LIEN_STATES.map((state) => (
          <div key={state} className="data-card p-3" data-testid={`billing-summary-lien-${state}`}>
            <div className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle">{state}</div>
            <div className="font-display font-black text-lg">{summary?.liens_by_state?.[state] ?? 0}</div>
          </div>
        ))}
        <div className="data-card p-3" data-testid="billing-summary-verifications">
          <div className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle">Outstanding verifications</div>
          <div className="font-display font-black text-lg">{summary?.outstanding_balance_verifications ?? 0}</div>
        </div>
        <div className="data-card p-3" data-testid="billing-summary-mismatches">
          <div className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle">Open verification mismatches</div>
          <div className="font-display font-black text-lg text-praxium-accent">{summary?.open_verification_mismatches ?? 0}</div>
        </div>
      </div>

      {/* Matter selector */}
      <div className="mt-8">
        <label className="text-[10px] font-mono uppercase tracking-wider text-praxium-subtle block mb-1.5">
          Matter
        </label>
        <select
          value={matterId}
          onChange={(e) => setMatterId(e.target.value)}
          data-testid="billing-matter-select"
          className="px-3 py-2 border border-praxium-line rounded-sm text-sm font-mono bg-praxium-surface w-full sm:w-96"
        >
          <option value="">Select a matter…</option>
          {matters.map((m) => (
            <option key={m.id} value={m.id}>
              {m.case_number} — {m.title}
            </option>
          ))}
        </select>
        {matters.length === 0 && (
          <p className="text-xs text-praxium-subtle mt-2">No matters found — create a matter first.</p>
        )}
      </div>

      {!matterId ? (
        <div className="mt-6">
          <EmptyState
            title="Select a matter to view its ledger and liens"
            body="Firm-wide lien and verification counts are shown above. Pick a matter to work its financial ledger and disbursement."
            testId="billing-no-matter"
          />
        </div>
      ) : matterLoading ? (
        <PageLoader label="Loading matter billing data…" />
      ) : (
        <div className="mt-8 space-y-10" data-testid="billing-matter-panel">
          {selectedMatter && (
            <div className="text-xs font-mono text-praxium-subtle">
              {selectedMatter.case_number} — {selectedMatter.title}
            </div>
          )}

          {/* Ledger */}
          <section>
            <h2 className="font-display font-bold text-lg flex items-center gap-2">
              <Receipt size={16} className="text-praxium-accent" /> Ledger
            </h2>

            <div className="mt-3 data-card p-4" data-testid="billing-client-net">
              <div className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle">
                Client-net estimate
              </div>
              <div className="font-display font-black text-3xl mt-1">
                {formatMoney(ledger.totals?.client_net_estimate ?? 0)}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(ledger.totals?.by_type || {}).map(([type, amount]) => (
                <div key={type} className="rounded-sm border border-praxium-line px-3 py-1.5" data-testid={`billing-total-${type}`}>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle mr-2">{type}</span>
                  <span className="font-mono text-xs font-semibold">{formatMoney(amount)}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 data-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-praxium-bg border-b border-praxium-line">
                    <th className="text-left px-4 py-2 overline">Type</th>
                    <th className="text-left px-4 py-2 overline">Description</th>
                    <th className="text-right px-4 py-2 overline">Amount</th>
                    <th className="text-right px-4 py-2 overline">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-praxium-line">
                  {ledger.entries.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-praxium-subtle text-sm">
                        No ledger entries yet.
                      </td>
                    </tr>
                  ) : (
                    ledger.entries.map((entry) => (
                      <tr key={entry.id} data-testid={`ledger-row-${entry.id}`}>
                        <td className="px-4 py-2 text-xs font-mono text-praxium-subtle">{entry.entry_type}</td>
                        <td className="px-4 py-2">{entry.description}</td>
                        <td className="px-4 py-2 text-right font-mono">{formatMoney(entry.amount)}</td>
                        <td className="px-4 py-2 text-right font-mono text-xs text-praxium-subtle">
                          {formatDate(entry.created_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <form onSubmit={submitEntry} className="mt-4 data-card p-4 flex flex-wrap gap-2 items-end" data-testid="ledger-entry-form">
              <div>
                <label className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle block mb-1">Type</label>
                <select
                  value={entryForm.entry_type}
                  onChange={(e) => setEntryForm((f) => ({ ...f, entry_type: e.target.value }))}
                  data-testid="ledger-entry-type"
                  className="px-2.5 py-1.5 border border-praxium-line rounded-sm text-xs font-mono bg-praxium-surface"
                >
                  {LEDGER_ENTRY_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle block mb-1">Description</label>
                <input
                  value={entryForm.description}
                  onChange={(e) => setEntryForm((f) => ({ ...f, description: e.target.value }))}
                  data-testid="ledger-entry-description"
                  className="w-full px-2.5 py-1.5 border border-praxium-line rounded-sm text-sm bg-praxium-surface"
                  placeholder="Description"
                />
              </div>
              <div>
                <label className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle block mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={entryForm.amount}
                  onChange={(e) => setEntryForm((f) => ({ ...f, amount: e.target.value }))}
                  data-testid="ledger-entry-amount"
                  className="w-32 px-2.5 py-1.5 border border-praxium-line rounded-sm text-sm font-mono bg-praxium-surface"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle block mb-1">Source doc (optional)</label>
                <input
                  value={entryForm.source_doc_id}
                  onChange={(e) => setEntryForm((f) => ({ ...f, source_doc_id: e.target.value }))}
                  data-testid="ledger-entry-source-doc"
                  className="w-40 px-2.5 py-1.5 border border-praxium-line rounded-sm text-sm font-mono bg-praxium-surface"
                  placeholder="doc id"
                />
              </div>
              <button
                type="submit"
                disabled={addingEntry}
                data-testid="ledger-entry-submit"
                className="btn-praxium disabled:opacity-50"
              >
                <Plus size={14} /> Add entry
              </button>
            </form>
          </section>

          {/* Liens */}
          <section>
            <h2 className="font-display font-bold text-lg flex items-center gap-2">
              <ShieldCheck size={16} className="text-praxium-accent" /> Liens
            </h2>

            <div className="mt-3 space-y-3">
              {liens.length === 0 ? (
                <EmptyState title="No liens on this matter" testId="liens-empty" />
              ) : (
                liens.map((lien) => {
                  const draft = lienDrafts[lien.id] || {};
                  const options = nextLienStates(lien.state);
                  return (
                    <div key={lien.id} className="data-card p-4" data-testid={`lien-row-${lien.id}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{lien.lienholder}</span>
                            <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 border border-praxium-line text-praxium-subtle">
                              {lien.lien_type}
                            </span>
                            <span className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 border rounded-sm ${lienStateColor(lien.state)}`} data-testid={`lien-state-${lien.id}`}>
                              {lien.state}
                            </span>
                          </div>
                          <div className="text-xs font-mono text-praxium-subtle mt-1.5 flex flex-wrap gap-x-4">
                            <span>Claimed: {formatMoney(lien.claimed_amount)}</span>
                            <span>Verified: {lien.verified_amount != null ? formatMoney(lien.verified_amount) : "—"}</span>
                            <span>Final: {lien.final_amount != null ? formatMoney(lien.final_amount) : "—"}</span>
                          </div>
                        </div>
                      </div>

                      <ReductionPanel lienId={lien.id} lien={lien} onChanged={refreshAll} />

                      {options.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-praxium-line flex flex-wrap items-end gap-2">
                          {lien.state === "asserted" || lien.state === "verified" ? (
                            <div className="flex items-end gap-2">
                              <div>
                                <label className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle block mb-1">
                                  Verified amount
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={draft.verifiedAmount ?? ""}
                                  onChange={(e) => setLienDraft(lien.id, { verifiedAmount: e.target.value })}
                                  data-testid={`lien-verify-amount-${lien.id}`}
                                  className="w-32 px-2.5 py-1.5 border border-praxium-line rounded-sm text-sm font-mono bg-praxium-surface"
                                  placeholder="0.00"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => submitVerifyAmount(lien)}
                                data-testid={`lien-verify-submit-${lien.id}`}
                                className="rounded-sm border border-praxium-line px-3 py-1.5 text-xs font-semibold text-praxium-subtle"
                              >
                                Record verified amount
                              </button>
                            </div>
                          ) : null}

                          <div>
                            <label className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle block mb-1">
                              Advance state
                            </label>
                            <select
                              value={draft.targetState || ""}
                              onChange={(e) => setLienDraft(lien.id, { targetState: e.target.value })}
                              data-testid={`lien-next-state-${lien.id}`}
                              className="px-2.5 py-1.5 border border-praxium-line rounded-sm text-xs font-mono bg-praxium-surface"
                            >
                              <option value="">Choose next state…</option>
                              {options.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>

                          {draft.targetState === "release_received" && (
                            <label className="flex items-center gap-1.5 text-xs text-praxium-subtle" data-testid={`lien-release-ack-label-${lien.id}`}>
                              <input
                                type="checkbox"
                                checked={!!draft.releaseAck}
                                onChange={(e) => setLienDraft(lien.id, { releaseAck: e.target.checked })}
                                data-testid={`lien-release-ack-${lien.id}`}
                              />
                              Written release document acknowledged
                            </label>
                          )}

                          <button
                            type="button"
                            onClick={() => advanceLien(lien)}
                            data-testid={`lien-advance-${lien.id}`}
                            className="btn-praxium"
                          >
                            <ChevronRight size={14} /> Move to {draft.targetState || "…"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={submitLien} className="mt-4 data-card p-4 flex flex-wrap gap-2 items-end" data-testid="lien-form">
              <div className="flex-1 min-w-[160px]">
                <label className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle block mb-1">Lienholder</label>
                <input
                  value={lienForm.lienholder}
                  onChange={(e) => setLienForm((f) => ({ ...f, lienholder: e.target.value }))}
                  data-testid="lien-form-lienholder"
                  className="w-full px-2.5 py-1.5 border border-praxium-line rounded-sm text-sm bg-praxium-surface"
                  placeholder="Lienholder name"
                />
              </div>
              <div>
                <label className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle block mb-1">Type</label>
                <select
                  value={lienForm.lien_type}
                  onChange={(e) => setLienForm((f) => ({ ...f, lien_type: e.target.value }))}
                  data-testid="lien-form-type"
                  className="px-2.5 py-1.5 border border-praxium-line rounded-sm text-xs font-mono bg-praxium-surface"
                >
                  {LIEN_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle block mb-1">Claimed amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={lienForm.claimed_amount}
                  onChange={(e) => setLienForm((f) => ({ ...f, claimed_amount: e.target.value }))}
                  data-testid="lien-form-claimed-amount"
                  className="w-32 px-2.5 py-1.5 border border-praxium-line rounded-sm text-sm font-mono bg-praxium-surface"
                  placeholder="0.00"
                />
              </div>
              <button
                type="submit"
                disabled={addingLien}
                data-testid="lien-form-submit"
                className="btn-praxium disabled:opacity-50"
              >
                <Plus size={14} /> Add lien
              </button>
            </form>
          </section>

          {/* Verification requests */}
          <section>
            <h2 className="font-display font-bold text-lg flex items-center gap-2">
              <Send size={16} className="text-praxium-accent" /> Balance verification
            </h2>
            <p className="text-xs text-praxium-subtle mt-1">
              Comma-separated list of lienholders/providers to send a balance verification request to.
            </p>
            <form onSubmit={requestVerifications} className="mt-3 flex flex-wrap gap-2 items-end" data-testid="verification-request-form">
              <div className="flex-1 min-w-[240px]">
                <input
                  value={verifyTargets}
                  onChange={(e) => setVerifyTargets(e.target.value)}
                  data-testid="verification-request-targets"
                  className="w-full px-2.5 py-1.5 border border-praxium-line rounded-sm text-sm bg-praxium-surface"
                  placeholder="e.g. City General Hospital, Acme Subrogation LLC"
                />
              </div>
              <button
                type="submit"
                disabled={requestingVerify}
                data-testid="verification-request-submit"
                className="btn-praxium disabled:opacity-50"
              >
                <Send size={14} /> Request
              </button>
            </form>
          </section>

          {/* Disbursement */}
          <section>
            <h2 className="font-display font-bold text-lg flex items-center gap-2">
              <Landmark size={16} className="text-praxium-accent" /> Disbursement
            </h2>
            <p className="text-xs text-praxium-subtle mt-1 max-w-xl">
              Attorney-gated. Blocked until every lien on this matter is <span className="font-semibold">paid</span> or{" "}
              <span className="font-semibold">release_received</span>.
            </p>

            {nonDisbursableLiens.length > 0 && (
              <div className="mt-3 text-xs font-mono text-praxium-subtle" data-testid="disbursement-pending-liens">
                Pending liens: {nonDisbursableLiens.map((l) => `${l.lienholder} (${l.state})`).join(", ")}
              </div>
            )}

            <button
              type="button"
              onClick={approveDisbursement}
              disabled={disbursing}
              data-testid="disbursement-approve"
              className="btn-praxium mt-3 disabled:opacity-50"
            >
              <ShieldCheck size={14} /> Approve disbursement
            </button>

            {disbursementBlocked && (
              <div className="mt-3 data-card p-4 border-praxium-accent" data-testid="disbursement-blocked">
                <div className="text-[9px] font-mono uppercase tracking-wider text-praxium-accent">Blocked</div>
                <p className="text-sm mt-1">{disbursementBlocked}</p>
              </div>
            )}

            {disbursementDraft && (
              <div className="mt-3 data-card p-4" data-testid="disbursement-draft">
                <div className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle">Disbursement draft</div>
                <div className="font-display font-black text-2xl mt-1">
                  {formatMoney(disbursementDraft.client_net_estimate)}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(disbursementDraft.by_type || {}).map(([type, amount]) => (
                    <div key={type} className="rounded-sm border border-praxium-line px-2.5 py-1">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle mr-1.5">{type}</span>
                      <span className="font-mono text-xs font-semibold">{formatMoney(amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs font-mono text-praxium-subtle">
                  Liens cleared: {(disbursementDraft.liens_cleared || []).map((l) => `${l.lienholder} (${l.state})`).join(", ") || "—"}
                </div>
                <div className="mt-1 text-xs font-mono text-praxium-subtle">
                  Prepared {formatDate(disbursementDraft.prepared_at)}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
