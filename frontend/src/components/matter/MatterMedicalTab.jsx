import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { formatMoney } from "@/lib/utils";
import { toast } from "sonner";
import { ExternalLink, Plus, Stethoscope, Trash2, AlertTriangle } from "lucide-react";
import PageLoader from "@/components/common/PageLoader";

const SPECIALTIES = [
  { value: "chiro", label: "Chiropractor" },
  { value: "pt", label: "Physical therapy" },
  { value: "pain_management", label: "Pain management" },
  { value: "hospital", label: "Hospital facility" },
  { value: "er_physician", label: "ER physician group" },
  { value: "radiology", label: "Radiology" },
  { value: "ambulance", label: "Ambulance" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "imaging", label: "Imaging / MRI" },
  { value: "primary_care", label: "Primary care" },
  { value: "orthopedics", label: "Orthopedics" },
  { value: "other", label: "Other" },
];

const COR_OPTIONS = [
  { value: "na_still_treating", label: "N/A — still treating" },
  { value: "missing", label: "Missing" },
  { value: "received", label: "Received" },
];

const RECORDS_OPTIONS = [
  { value: "not_requested", label: "Not requested" },
  { value: "lien_verify", label: "Lien verify only" },
  { value: "requested", label: "Requested" },
  { value: "partial", label: "Partial" },
  { value: "complete", label: "Complete" },
];

const LOR_OPTIONS = [
  { value: "not_sent", label: "LOR not sent" },
  { value: "sent", label: "LOR sent" },
  { value: "complete", label: "Records complete" },
];

const COMPLIANCE_STYLES = {
  completed: { border: "border-l-zinc-300", badge: "bg-red-100 text-red-800", label: "Completed" },
  active: { border: "border-l-zinc-200", badge: "bg-white text-zinc-700 border border-zinc-200", label: "Active" },
  no_show: { border: "border-l-purple-500", badge: "bg-purple-100 text-purple-900", label: "No-show" },
  treatment_gap: { border: "border-l-orange-500", badge: "bg-orange-100 text-orange-900", label: "Gap" },
  not_confirmed: { border: "border-l-sky-500", badge: "bg-sky-100 text-sky-900", label: "NTD unconfirmed" },
  mri_overdue: { border: "border-l-amber-500", badge: "bg-amber-100 text-amber-900", label: "MRI overdue" },
};

const ALERT_SEVERITY = {
  high: "bg-red-50 border-red-200 text-red-900",
  medium: "bg-sky-50 border-sky-200 text-sky-900",
};

function inputClass() {
  return "w-full text-xs border border-praxium-line rounded-sm px-2 py-1 bg-white";
}

function corBadge(status) {
  if (status === "received") return "bg-emerald-100 text-emerald-900";
  if (status === "missing") return "bg-red-100 text-red-800";
  return "bg-zinc-100 text-zinc-600";
}

export default function MatterMedicalTab({ matterId }) {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newProvider, setNewProvider] = useState("");
  const [newSpecialty, setNewSpecialty] = useState("other");
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    api
      .get(`/matters/${matterId}/meds-ledger`)
      .then((r) => {
        setItems(r.data.items || []);
        setSummary(r.data.summary || null);
        setAlerts(r.data.alerts || []);
      })
      .catch(() => toast.error("Could not load Meds ledger"))
      .finally(() => setLoading(false));
  }, [matterId]);

  useEffect(() => {
    load();
  }, [load]);

  const patchRow = async (rowId, patch) => {
    try {
      const r = await api.patch(`/meds-ledger/${rowId}`, patch);
      setItems((prev) => prev.map((row) => (row.id === rowId ? r.data : row)));
      load();
    } catch {
      toast.error("Save failed");
    }
  };

  const addProvider = async (e) => {
    e.preventDefault();
    if (!newProvider.trim()) return;
    setAdding(true);
    try {
      await api.post(`/matters/${matterId}/meds-ledger`, {
        provider_name: newProvider.trim(),
        specialty: newSpecialty,
      });
      setNewProvider("");
      toast.success("Provider added");
      load();
    } catch {
      toast.error("Could not add provider");
    } finally {
      setAdding(false);
    }
  };

  const removeRow = async (rowId) => {
    if (!window.confirm("Remove this provider from the Meds ledger?")) return;
    try {
      await api.delete(`/meds-ledger/${rowId}`);
      toast.success("Removed");
      load();
    } catch {
      toast.error("Delete failed");
    }
  };

  if (loading) return <PageLoader label="Loading Meds ledger…" />;

  const patientId = `PT-${matterId.slice(0, 6).toUpperCase()}`;

  return (
    <div className="space-y-5" data-testid="matter-medical-tab">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="overline mb-1 flex items-center gap-2"><Stethoscope size={12} /> // meds ledger</div>
          <p className="text-sm text-praxium-subtle max-w-xl">
            Every treating provider on one ledger — balances, LTD/NTD, FE, COR. Must match documents in the file.
          </p>
        </div>
        <Link to="/training/article/08-meds-tab-and-record-hygiene" className="btn-ghost text-xs inline-flex items-center gap-1">
          <ExternalLink size={11} /> Training: Meds tab
        </Link>
        <Link to="/training/article/12-chiro-follow-up-color-codes" className="btn-ghost text-xs inline-flex items-center gap-1">
          <ExternalLink size={11} /> Color codes
        </Link>
      </div>

      <div className="data-card p-4 flex flex-wrap gap-4 text-sm">
        <div className="bg-praxium-bg px-3 py-2 rounded-sm">
          <div className="overline text-[10px]">Patient ID</div>
          <div className="font-display font-black tracking-wider">{patientId}</div>
        </div>
        {summary ? (
          <>
            <div><div className="overline text-[10px]">Providers</div><div className="font-mono">{summary.provider_count}</div></div>
            <div><div className="overline text-[10px]">Total balance</div><div className="font-mono">{formatMoney(summary.total_balance)}</div></div>
            <div><div className="overline text-[10px]">Total lien</div><div className="font-mono">{formatMoney(summary.total_lien)}</div></div>
            <div><div className="overline text-[10px]">Futures est.</div><div className="font-mono">{formatMoney(summary.total_futures_estimate)}</div></div>
            {summary.lien_sold_count > 0 ? (
              <div><div className="overline text-[10px]">Lien sold rows</div><div className="font-mono">{summary.lien_sold_count}</div></div>
            ) : null}
            <div><div className="overline text-[10px]">Still treating</div><div className="font-mono">{summary.still_treating_count}</div></div>
            {summary.alert_count > 0 ? (
              <div><div className="overline text-[10px]">Compliance alerts</div><div className="font-mono text-red-700">{summary.alert_count}</div></div>
            ) : null}
          </>
        ) : null}
      </div>

      {summary?.missing_cor_count > 0 ? (
        <div className="flex items-start gap-2 text-sm text-red-900 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>{summary.missing_cor_count} provider(s) done treating but missing COR — required before demand or lit transfer.</span>
        </div>
      ) : null}

      {alerts.length > 0 ? (
        <div className="data-card p-4 space-y-2" data-testid="meds-compliance-alerts">
          <div className="overline text-[10px] flex items-center gap-2">
            <AlertTriangle size={12} /> Treatment compliance ({alerts.length})
          </div>
          <ul className="space-y-2">
            {alerts.map((a, idx) => (
              <li
                key={`${a.code}-${a.row_id || "matter"}-${idx}`}
                className={`text-sm border rounded-lg px-3 py-2 ${ALERT_SEVERITY[a.severity] || ALERT_SEVERITY.medium}`}
              >
                {a.provider_name ? (
                  <span className="font-semibold">{a.provider_name}: </span>
                ) : null}
                {a.message}
              </li>
            ))}
          </ul>
          <p className="text-xs text-praxium-subtle">
            Based on LTD/NTD dates and imaging pathway — see{" "}
            <Link to="/training/article/05-treatment-gaps-and-mri-timing" className="text-praxium-accent hover:underline">
              treatment gaps & MRI timing
            </Link>
            .
          </p>
        </div>
      ) : null}

      <form onSubmit={addProvider} className="data-card p-4 flex flex-col sm:flex-row gap-2" data-testid="meds-add-form">
        <input
          className={`flex-1 ${inputClass()} text-sm`}
          placeholder="Provider / clinic name (entity, not staff name)"
          value={newProvider}
          onChange={(e) => setNewProvider(e.target.value)}
          data-testid="meds-new-provider"
        />
        <select className={`sm:w-44 ${inputClass()} text-sm`} value={newSpecialty} onChange={(e) => setNewSpecialty(e.target.value)}>
          {SPECIALTIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button type="submit" disabled={adding} className="btn-praxium text-sm shrink-0">
          <Plus size={14} /> Add provider
        </button>
      </form>

      {items.length === 0 ? (
        <div className="data-card p-6 text-sm text-praxium-subtle text-center">
          No providers yet. Add each clinic/hospital/ambulance as its own row — ER visits often need four rows.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((row) => {
            const comp = COMPLIANCE_STYLES[row.compliance_status] || COMPLIANCE_STYLES.active;
            return (
            <div key={row.id} className={`data-card p-4 border-l-4 ${comp.border}`} data-testid={`meds-row-${row.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    className="font-semibold text-sm border border-transparent hover:border-praxium-line focus:border-praxium-line rounded px-1 py-0.5"
                    value={row.provider_name}
                    onChange={(e) => setItems((prev) => prev.map((r) => (r.id === row.id ? { ...r, provider_name: e.target.value } : r)))}
                    onBlur={(e) => patchRow(row.id, { provider_name: e.target.value.trim() })}
                  />
                  <select
                    className={inputClass() + " w-auto"}
                    value={row.specialty}
                    onChange={(e) => patchRow(row.id, { specialty: e.target.value })}
                  >
                    {SPECIALTIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${comp.badge}`}>
                    {comp.label}
                  </span>
                  <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${corBadge(row.cor_status)}`}>
                    COR: {COR_OPTIONS.find((o) => o.value === row.cor_status)?.label || row.cor_status}
                  </span>
                </div>
                <button type="button" onClick={() => removeRow(row.id)} className="text-praxium-subtle hover:text-red-600 p-1" title="Remove">
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                <label className="text-xs">
                  <span className="font-mono uppercase text-praxium-subtle text-[10px]">First treat</span>
                  <input type="date" className={inputClass()} value={row.first_treatment_date || ""} onChange={(e) => patchRow(row.id, { first_treatment_date: e.target.value || null })} />
                </label>
                <label className="text-xs">
                  <span className="font-mono uppercase text-praxium-subtle text-[10px]">LTD</span>
                  <input type="date" className={inputClass()} value={row.last_treatment_date || ""} onChange={(e) => patchRow(row.id, { last_treatment_date: e.target.value || null })} />
                </label>
                <label className="text-xs">
                  <span className="font-mono uppercase text-praxium-subtle text-[10px]">NTD</span>
                  <input type="date" className={inputClass()} value={row.next_treatment_date || ""} onChange={(e) => patchRow(row.id, { next_treatment_date: e.target.value || null })} />
                </label>
                <label className="text-xs">
                  <span className="font-mono uppercase text-praxium-subtle text-[10px]">Balance ($)</span>
                  <input type="number" className={inputClass()} value={row.balance ?? 0} onChange={(e) => setItems((prev) => prev.map((r) => (r.id === row.id ? { ...r, balance: Number(e.target.value) } : r)))} onBlur={(e) => patchRow(row.id, { balance: Number(e.target.value) || 0 })} />
                </label>
                <label className="text-xs">
                  <span className="font-mono uppercase text-praxium-subtle text-[10px]">Lien ($)</span>
                  <input type="number" className={inputClass()} value={row.lien_amount ?? 0} onChange={(e) => setItems((prev) => prev.map((r) => (r.id === row.id ? { ...r, lien_amount: Number(e.target.value) } : r)))} onBlur={(e) => patchRow(row.id, { lien_amount: Number(e.target.value) || 0 })} />
                </label>
                <label className="text-xs">
                  <span className="font-mono uppercase text-praxium-subtle text-[10px]">Initials</span>
                  <input className={inputClass()} maxLength={8} value={row.staff_initials || ""} onChange={(e) => setItems((prev) => prev.map((r) => (r.id === row.id ? { ...r, staff_initials: e.target.value } : r)))} onBlur={(e) => patchRow(row.id, { staff_initials: e.target.value.toUpperCase() })} />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 pt-3 border-t border-praxium-line">
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={Boolean(row.still_treating)} onChange={(e) => patchRow(row.id, { still_treating: e.target.checked })} />
                  Still treating
                </label>
                <label className="text-xs">
                  <span className="font-mono uppercase text-praxium-subtle text-[10px]">COR</span>
                  <select className={inputClass()} value={row.cor_status} onChange={(e) => patchRow(row.id, { cor_status: e.target.value })}>
                    {COR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
                <label className="text-xs">
                  <span className="font-mono uppercase text-praxium-subtle text-[10px]">Records</span>
                  <select className={inputClass()} value={row.records_status} onChange={(e) => patchRow(row.id, { records_status: e.target.value })}>
                    {RECORDS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
                <label className="text-xs">
                  <span className="font-mono uppercase text-praxium-subtle text-[10px]">Medical LOR</span>
                  <select className={inputClass()} value={row.lor_status} onChange={(e) => patchRow(row.id, { lor_status: e.target.value })}>
                    {LOR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <label className="text-xs">
                  <span className="font-mono uppercase text-praxium-subtle text-[10px]">Lien holder</span>
                  <input className={inputClass()} value={row.lien_holder || ""} onChange={(e) => setItems((prev) => prev.map((r) => (r.id === row.id ? { ...r, lien_holder: e.target.value } : r)))} onBlur={(e) => patchRow(row.id, { lien_holder: e.target.value })} />
                </label>
                <label className="text-xs">
                  <span className="font-mono uppercase text-praxium-subtle text-[10px]">Lien sold to</span>
                  <input className={inputClass()} placeholder="e.g. JML" value={row.lien_sold_to || ""} onChange={(e) => setItems((prev) => prev.map((r) => (r.id === row.id ? { ...r, lien_sold_to: e.target.value } : r)))} onBlur={(e) => patchRow(row.id, { lien_sold_to: e.target.value })} data-testid={`meds-lien-sold-${row.id}`} />
                </label>
                <label className="text-xs">
                  <span className="font-mono uppercase text-praxium-subtle text-[10px]">CPT code</span>
                  <input className={inputClass()} placeholder="72141" maxLength={20} value={row.cpt_code || ""} onChange={(e) => setItems((prev) => prev.map((r) => (r.id === row.id ? { ...r, cpt_code: e.target.value } : r)))} onBlur={(e) => patchRow(row.id, { cpt_code: e.target.value.toUpperCase() })} />
                </label>
                <label className="text-xs">
                  <span className="font-mono uppercase text-praxium-subtle text-[10px]">Date of service</span>
                  <input type="date" className={inputClass()} value={row.date_of_service || ""} onChange={(e) => patchRow(row.id, { date_of_service: e.target.value || null })} />
                </label>
                <label className="text-xs">
                  <span className="font-mono uppercase text-praxium-subtle text-[10px]">FE amount ($)</span>
                  <input type="number" className={inputClass()} value={row.futures_estimate ?? ""} onChange={(e) => setItems((prev) => prev.map((r) => (r.id === row.id ? { ...r, futures_estimate: e.target.value ? Number(e.target.value) : null } : r)))} onBlur={(e) => patchRow(row.id, { futures_estimate: e.target.value ? Number(e.target.value) : null })} />
                </label>
                <label className="text-xs">
                  <span className="font-mono uppercase text-praxium-subtle text-[10px]">FE date</span>
                  <input type="date" className={inputClass()} value={row.futures_estimate_date || ""} onChange={(e) => patchRow(row.id, { futures_estimate_date: e.target.value || null })} />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-praxium-line">
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={Boolean(row.chartswap_required)} onChange={(e) => patchRow(row.id, { chartswap_required: e.target.checked })} />
                  ChartSwap / portal required
                </label>
              </div>

              <label className="block text-xs mt-3">
                <span className="font-mono uppercase text-praxium-subtle text-[10px]">Portal / ChartSwap notes</span>
                <input className={inputClass()} placeholder="ChartSwap, portal-only release…" value={row.portal_notes || ""} onChange={(e) => setItems((prev) => prev.map((r) => (r.id === row.id ? { ...r, portal_notes: e.target.value } : r)))} onBlur={(e) => patchRow(row.id, { portal_notes: e.target.value })} />
              </label>
            </div>
          );
          })}
        </div>
      )}

      <p className="text-xs text-praxium-subtle">
        File naming: <code className="font-mono">MR</code> records · <code className="font-mono">B</code> bills · <code className="font-mono">FE</code> futures estimate.
        {" "}
        <Link to="/training/article/24-medical-documents-reference" className="text-praxium-accent hover:underline">Medical docs reference</Link>
        {" · "}
        <Link to="/settings/templates" className="text-praxium-accent hover:underline">Medical LOR templates</Link>
      </p>
    </div>
  );
}
