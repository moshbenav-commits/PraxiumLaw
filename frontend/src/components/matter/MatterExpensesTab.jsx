import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { formatMoney, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { DollarSign, ExternalLink, Plus, RefreshCw, Trash2 } from "lucide-react";
import PageLoader from "@/components/common/PageLoader";

const CATEGORIES = [
  { value: "copay_oob", label: "Out-of-pocket / copay" },
  { value: "mileage", label: "Mileage to doctors" },
  { value: "rental_car", label: "Rental car" },
  { value: "wage_loss", label: "Wage loss" },
  { value: "court_fee", label: "Court / filing fee" },
  { value: "attorney_lien", label: "Attorney lien notice" },
  { value: "records_fee", label: "Records / ChartSwap fee" },
  { value: "other", label: "Other" },
];

function inputClass() {
  return "w-full text-xs border border-praxium-line rounded-sm px-2 py-1 bg-white";
}

export default function MatterExpensesTab({ matterId, practiceArea }) {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newRow, setNewRow] = useState({
    title: "",
    category: "copay_oob",
    amount: "",
    expense_date: "",
    payee: "",
  });

  const load = useCallback(() => {
    api
      .get(`/matters/${matterId}/expenses`)
      .then((r) => {
        setItems(r.data.items || []);
        setSummary(r.data.summary);
      })
      .catch(() => toast.error("Could not load expenses"))
      .finally(() => setLoading(false));
  }, [matterId]);

  useEffect(() => {
    load();
  }, [load]);

  if (practiceArea !== "personal_injury") {
    return (
      <div className="data-card p-6 text-sm text-praxium-subtle">
        Expense ledger applies to personal injury matters only.
      </div>
    );
  }

  if (loading) return <PageLoader label="Loading expenses…" />;

  const patchRow = async (rowId, patch) => {
    try {
      const r = await api.patch(`/expenses/${rowId}`, patch);
      setItems((prev) => prev.map((row) => (row.id === rowId ? r.data : row)));
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Save failed");
    }
  };

  const addRow = async (e) => {
    e.preventDefault();
    if (!newRow.title.trim()) {
      toast.error("Expense title is required (training: disbursement won't populate without title)");
      return;
    }
    setBusy(true);
    try {
      await api.post(`/matters/${matterId}/expenses`, {
        title: newRow.title.trim(),
        category: newRow.category,
        amount: newRow.amount ? Number(newRow.amount) : 0,
        expense_date: newRow.expense_date || null,
        payee: newRow.payee,
      });
      setNewRow({ title: "", category: "copay_oob", amount: "", expense_date: "", payee: "" });
      toast.success("Expense added");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Add failed");
    } finally {
      setBusy(false);
    }
  };

  const deleteRow = async (rowId) => {
    setBusy(true);
    try {
      await api.delete(`/expenses/${rowId}`);
      toast.success("Removed");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const syncToSettlement = async () => {
    setBusy(true);
    try {
      const r = await api.post(`/matters/${matterId}/expenses/sync-to-settlement`);
      toast.success(`Synced ${formatMoney(r.data.expenses_synced)} to settlement calculator`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Sync failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5" data-testid="matter-expenses-tab">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="overline mb-1 flex items-center gap-2">
            <DollarSign size={12} /> // expenses
          </div>
          <p className="text-sm text-praxium-subtle max-w-xl">
            Out-of-pocket costs, mileage, wage loss — sync recoverable totals to the Settlement tab disbursement sheet.
          </p>
        </div>
        <Link to="/training/article/09-demand-prep-checklist" className="btn-ghost text-xs inline-flex items-center gap-1">
          <ExternalLink size={11} /> Demand prep
        </Link>
      </div>

      {summary ? (
        <div className="data-card p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <div className="overline text-[10px]">Settlement recoverable</div>
            <div className="font-mono font-semibold">{formatMoney(summary.settlement_total)}</div>
          </div>
          <div>
            <div className="overline text-[10px]">OOP / copay</div>
            <div className="font-mono">{formatMoney(summary.recoverable_oob_total)}</div>
          </div>
          <div>
            <div className="overline text-[10px]">Mileage</div>
            <div className="font-mono">{formatMoney(summary.mileage_total)}</div>
          </div>
          <div>
            <div className="overline text-[10px]">Missing title</div>
            <div className="font-mono">{summary.missing_title_count}</div>
          </div>
        </div>
      ) : null}

      {summary?.missing_title_count > 0 ? (
        <div className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">
          {summary.missing_title_count} expense row(s) missing title — Filevine disbursement requires a title on every line.
        </div>
      ) : null}

      <form onSubmit={addRow} className="data-card p-4 grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
        <label className="sm:col-span-2 text-xs">
          <span className="font-mono uppercase text-praxium-subtle text-[10px]">Title *</span>
          <input
            className={inputClass()}
            value={newRow.title}
            onChange={(e) => setNewRow({ ...newRow, title: e.target.value })}
            placeholder="e.g. Urgent care copay"
            data-testid="expense-new-title"
          />
        </label>
        <label className="text-xs">
          <span className="font-mono uppercase text-praxium-subtle text-[10px]">Category</span>
          <select className={inputClass()} value={newRow.category} onChange={(e) => setNewRow({ ...newRow, category: e.target.value })}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="font-mono uppercase text-praxium-subtle text-[10px]">Amount ($)</span>
          <input type="number" step="0.01" className={inputClass()} value={newRow.amount} onChange={(e) => setNewRow({ ...newRow, amount: e.target.value })} />
        </label>
        <label className="text-xs">
          <span className="font-mono uppercase text-praxium-subtle text-[10px]">Date</span>
          <input type="date" className={inputClass()} value={newRow.expense_date} onChange={(e) => setNewRow({ ...newRow, expense_date: e.target.value })} />
        </label>
        <button type="submit" className="btn-praxium text-xs" disabled={busy} data-testid="expense-add">
          <Plus size={12} /> Add
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost text-xs" disabled={busy} onClick={syncToSettlement} data-testid="expenses-sync-settlement">
          <RefreshCw size={12} /> Sync to settlement calculator
        </button>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-praxium-subtle">No expenses yet — add small OOP bills (e.g. $4.80 copay) for settlement recovery.</p>
        ) : (
          items.map((row) => (
            <div key={row.id} className="data-card p-4" data-testid={`expense-row-${row.id}`}>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <label className="sm:col-span-2 text-xs">
                  <span className="font-mono uppercase text-praxium-subtle text-[10px]">Title</span>
                  <input
                    className={inputClass()}
                    value={row.title || ""}
                    onChange={(e) => setItems((prev) => prev.map((r) => (r.id === row.id ? { ...r, title: e.target.value } : r)))}
                    onBlur={(e) => patchRow(row.id, { title: e.target.value })}
                  />
                </label>
                <label className="text-xs">
                  <span className="font-mono uppercase text-praxium-subtle text-[10px]">Category</span>
                  <select
                    className={inputClass()}
                    value={row.category}
                    onChange={(e) => patchRow(row.id, { category: e.target.value })}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs">
                  <span className="font-mono uppercase text-praxium-subtle text-[10px]">Amount</span>
                  <input
                    type="number"
                    step="0.01"
                    className={inputClass()}
                    value={row.amount ?? ""}
                    onChange={(e) => setItems((prev) => prev.map((r) => (r.id === row.id ? { ...r, amount: e.target.value ? Number(e.target.value) : 0 } : r)))}
                    onBlur={(e) => patchRow(row.id, { amount: e.target.value ? Number(e.target.value) : 0 })}
                  />
                </label>
                <label className="text-xs">
                  <span className="font-mono uppercase text-praxium-subtle text-[10px]">Date</span>
                  <input
                    type="date"
                    className={inputClass()}
                    value={row.expense_date || ""}
                    onChange={(e) => patchRow(row.id, { expense_date: e.target.value || null })}
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-praxium-line">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={Boolean(row.include_in_settlement)}
                    onChange={(e) => patchRow(row.id, { include_in_settlement: e.target.checked })}
                  />
                  Include in settlement / disbursement
                </label>
                <div className="flex items-center gap-2 text-xs text-praxium-subtle">
                  {row.expense_date ? <span>{formatDate(row.expense_date)}</span> : null}
                  <button type="button" className="text-red-700 hover:underline inline-flex items-center gap-1" disabled={busy} onClick={() => deleteRow(row.id)}>
                    <Trash2 size={12} /> Remove
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
