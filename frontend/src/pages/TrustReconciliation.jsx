import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Scale, Landmark, AlertTriangle, Send } from "lucide-react";
import PageLoader from "@/components/common/PageLoader";
import EmptyState from "@/components/common/EmptyState";
import { formatMoney, formatDate } from "@/lib/utils";

const EPS = 0.005;

export default function TrustReconciliation() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ bank_balance: "", statement_date: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    return api.get("/trust/reconciliation").then((r) => setData(r.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => toast.error("Could not load trust reconciliation"))
      .finally(() => setLoading(false));
  }, [load]);

  const submitBankStatement = async (e) => {
    e.preventDefault();
    const bank_balance = parseFloat(form.bank_balance);
    if (Number.isNaN(bank_balance) || !form.statement_date) {
      toast.error("Bank balance and statement date are required");
      return;
    }
    setSubmitting(true);
    try {
      const r = await api.post("/trust/reconciliation/bank", {
        bank_balance,
        statement_date: form.statement_date,
      });
      const delta = r.data?.delta ?? 0;
      if (Math.abs(delta) < EPS) {
        toast.success("Bank statement recorded — reconciled, no delta");
      } else {
        toast.error(`Bank statement recorded — off by ${formatMoney(delta)}`);
      }
      if (r.data?.exceptions_raised) {
        toast.error(`${r.data.exceptions_raised} exception(s) raised`);
      }
      setForm({ bank_balance: "", statement_date: "" });
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not record bank statement");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoader label="Loading trust reconciliation…" />;

  const bookBalance = data?.book_balance ?? 0;
  const sumClientLedgers = data?.sum_client_ledgers ?? 0;
  const bankBalance = data?.last_bank?.bank_balance;
  const delta = data?.delta;
  const negativeMatters = data?.negative_matters || [];
  const ledgerMismatch = Math.abs(bookBalance - sumClientLedgers) >= EPS;
  const bankMismatch = delta != null && Math.abs(delta) >= EPS;
  const perMatter = [...(data?.per_matter || [])].sort((a, b) => (b.trust_held ?? 0) - (a.trust_held ?? 0));

  let deltaStatusLabel = "No bank statement recorded yet";
  let deltaStatusColor = "border-praxium-line text-praxium-subtle";
  if (delta != null) {
    if (bankMismatch) {
      deltaStatusLabel = `Off by ${formatMoney(Math.abs(delta))}`;
      deltaStatusColor = "border-praxium-accent text-praxium-accent";
    } else {
      deltaStatusLabel = "Reconciled";
      deltaStatusColor = "border-emerald-500 text-emerald-600";
    }
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-5xl">
      <div className="overline mb-2">// trust accounting</div>
      <h1 className="font-display font-black text-2xl tracking-tight flex items-center gap-2">
        <Scale className="text-praxium-accent" /> Trust reconciliation
      </h1>
      <p className="text-sm text-praxium-subtle mt-2 max-w-2xl">
        Three-way reconciliation of the firm's trust ledger — book balance, the sum of individual client
        ledgers, and the bank's own statement — kept in sync as an ethics and audit control.
      </p>
      {data?.as_of && (
        <p className="text-xs font-mono text-praxium-subtle mt-1">As of {formatDate(data.as_of)}</p>
      )}

      {/* Stat tiles */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3" data-testid="trust-recon-stats">
        <div
          className={`data-card p-4 ${ledgerMismatch ? "border-praxium-accent" : ""}`}
          data-testid="trust-recon-book-balance"
        >
          <div className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle">
            Book balance (firm ledger)
          </div>
          <div className={`font-display font-black text-2xl mt-1 ${ledgerMismatch ? "text-praxium-accent" : ""}`}>
            {formatMoney(bookBalance)}
          </div>
        </div>
        <div
          className={`data-card p-4 ${ledgerMismatch ? "border-praxium-accent" : ""}`}
          data-testid="trust-recon-sum-client-ledgers"
        >
          <div className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle">
            Sum of client ledgers
          </div>
          <div className={`font-display font-black text-2xl mt-1 ${ledgerMismatch ? "text-praxium-accent" : ""}`}>
            {formatMoney(sumClientLedgers)}
          </div>
        </div>
        <div
          className={`data-card p-4 ${bankMismatch ? "border-praxium-accent" : ""}`}
          data-testid="trust-recon-bank-balance"
        >
          <div className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle">
            Bank balance
          </div>
          <div className={`font-display font-black text-2xl mt-1 ${bankMismatch ? "text-praxium-accent" : ""}`}>
            {bankBalance != null ? formatMoney(bankBalance) : "—"}
          </div>
          {data?.last_bank?.statement_date && (
            <div className="text-xs font-mono text-praxium-subtle mt-1">
              Statement {formatDate(data.last_bank.statement_date)}
            </div>
          )}
        </div>
      </div>

      {ledgerMismatch && (
        <p className="text-xs font-mono text-praxium-accent mt-2" data-testid="trust-recon-ledger-mismatch">
          Book balance does not match the sum of client ledgers.
        </p>
      )}

      {/* Delta indicator */}
      <div
        className={`mt-4 data-card p-4 flex items-center justify-between gap-4 border ${deltaStatusColor}`}
        data-testid="trust-recon-delta"
      >
        <div>
          <div className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle">
            Bank vs. book delta
          </div>
          <div className={`font-display font-black text-xl mt-1 ${deltaStatusColor.split(" ")[1]}`}>
            {deltaStatusLabel}
          </div>
        </div>
        {delta != null && (
          <div className="text-right">
            <div className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle">Delta</div>
            <div className={`font-mono text-lg font-semibold ${deltaStatusColor.split(" ")[1]}`}>
              {formatMoney(delta)}
            </div>
          </div>
        )}
      </div>

      {/* Negative matters — ethics red flag */}
      {negativeMatters.length > 0 && (
        <div
          className="mt-4 data-card p-4 border-praxium-accent bg-praxium-accent/5"
          data-testid="trust-recon-negative-matters"
        >
          <div className="flex items-center gap-2 text-praxium-accent">
            <AlertTriangle size={16} />
            <span className="text-[9px] font-mono uppercase tracking-wider font-bold">Ethics red flag</span>
          </div>
          <p className="text-sm mt-1.5">Client ledger(s) negative — investigate immediately:</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {negativeMatters.map((id) => (
              <li
                key={id}
                className="text-xs font-mono px-2 py-1 border border-praxium-accent text-praxium-accent rounded-sm"
                data-testid={`trust-recon-negative-matter-${id}`}
              >
                matter {String(id).slice(0, 8)}…
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Record bank statement */}
      <section className="mt-8">
        <h2 className="font-display font-bold text-lg flex items-center gap-2">
          <Landmark size={16} className="text-praxium-accent" /> Record bank statement
        </h2>
        <form
          onSubmit={submitBankStatement}
          className="mt-3 data-card p-4 flex flex-wrap gap-2 items-end"
          data-testid="trust-recon-bank-form"
        >
          <div>
            <label className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle block mb-1">
              Bank balance
            </label>
            <input
              type="number"
              step="0.01"
              value={form.bank_balance}
              onChange={(e) => setForm((f) => ({ ...f, bank_balance: e.target.value }))}
              data-testid="trust-recon-bank-balance-input"
              className="w-40 px-2.5 py-1.5 border border-praxium-line rounded-sm text-sm font-mono bg-praxium-surface"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle block mb-1">
              Statement date
            </label>
            <input
              type="date"
              value={form.statement_date}
              onChange={(e) => setForm((f) => ({ ...f, statement_date: e.target.value }))}
              data-testid="trust-recon-statement-date-input"
              className="px-2.5 py-1.5 border border-praxium-line rounded-sm text-sm font-mono bg-praxium-surface"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            data-testid="trust-recon-bank-submit"
            className="btn-praxium disabled:opacity-50"
          >
            <Send size={14} /> Record statement
          </button>
        </form>
      </section>

      {/* Per-matter table */}
      <section className="mt-8">
        <h2 className="font-display font-bold text-lg flex items-center gap-2">
          <Scale size={16} className="text-praxium-accent" /> Per-matter trust held
        </h2>
        {perMatter.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="No matters hold trust funds" testId="trust-recon-per-matter-empty" />
          </div>
        ) : (
          <div className="mt-3 data-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-praxium-bg border-b border-praxium-line">
                  <th className="text-left px-4 py-2 overline">Matter</th>
                  <th className="text-right px-4 py-2 overline">Trust held</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-praxium-line">
                {perMatter.map((row) => {
                  const isNegative = (row.trust_held ?? 0) < 0;
                  return (
                    <tr key={row.matter_id} data-testid={`trust-recon-matter-row-${row.matter_id}`}>
                      <td className="px-4 py-2 font-mono text-xs text-praxium-subtle">
                        {String(row.matter_id).slice(0, 8)}…
                      </td>
                      <td
                        className={`px-4 py-2 text-right font-mono ${
                          isNegative ? "text-praxium-accent font-semibold" : ""
                        }`}
                      >
                        {formatMoney(row.trust_held)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
