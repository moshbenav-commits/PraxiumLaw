import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { formatMoney, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AlertTriangle, Car, ExternalLink, Plus, CheckCircle2 } from "lucide-react";
import PageLoader from "@/components/common/PageLoader";

const STATUS_OPTIONS = [
  { value: "active", label: "Active PD track" },
  { value: "resolved", label: "Resolved" },
  { value: "total_loss", label: "Total loss" },
  { value: "not_applicable", label: "N/A" },
];

const TRACK_OPTIONS = [
  { value: "undecided", label: "Undecided" },
  { value: "third_party", label: "3P PD" },
  { value: "first_party", label: "1P collision/rental" },
  { value: "both", label: "3P + 1P" },
];

const LIAB_OPTIONS = [
  { value: "pending", label: "Liability pending" },
  { value: "accepted", label: "Liability accepted" },
  { value: "partial", label: "Partial" },
  { value: "denied", label: "Denied" },
];

const RENTAL_AUTH = [
  { value: "none", label: "No auth" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "denied", label: "Denied" },
];

const EST_SOURCES = [
  { value: "insurer", label: "Insurer" },
  { value: "body_shop", label: "Body shop" },
  { value: "independent", label: "Independent" },
  { value: "other", label: "Other" },
];

function inputClass() {
  return "w-full text-xs border border-praxium-line rounded-sm px-2 py-1 bg-white";
}

export default function MatterPropertyDamageTab({ matterId, practiceArea }) {
  const [pd, setPd] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newEst, setNewEst] = useState({ source: "body_shop", amount: "", shop_name: "", estimate_date: "" });

  const load = useCallback(() => {
    api
      .get(`/matters/${matterId}/property-damage`)
      .then((r) => {
        setPd(r.data.pi_property_damage);
        setSummary(r.data.summary);
      })
      .catch(() => toast.error("Could not load property damage"))
      .finally(() => setLoading(false));
  }, [matterId]);

  useEffect(() => {
    load();
  }, [load]);

  if (practiceArea !== "personal_injury") {
    return <div className="data-card p-6 text-sm text-praxium-subtle">PD module applies to PI matters only.</div>;
  }
  if (loading || !pd) return <PageLoader label="Loading property damage…" />;

  const patch = async (body) => {
    setBusy(true);
    try {
      const r = await api.patch(`/matters/${matterId}/property-damage`, body);
      setPd(r.data.pi_property_damage);
      setSummary(r.data.summary);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const logFollowUp = async () => {
    setBusy(true);
    try {
      const r = await api.post(`/matters/${matterId}/property-damage/log-follow-up`);
      setPd(r.data.pi_property_damage);
      setSummary(r.data.summary);
      toast.success("Follow-up logged for today");
    } catch {
      toast.error("Could not log follow-up");
    } finally {
      setBusy(false);
    }
  };

  const addEstimate = async (e) => {
    e.preventDefault();
    if (!newEst.amount) return;
    const estimates = [
      ...(pd.estimates || []),
      {
        source: newEst.source,
        amount: Number(newEst.amount),
        shop_name: newEst.shop_name,
        estimate_date: newEst.estimate_date || null,
        is_primary: (pd.estimates || []).length === 0,
      },
    ];
    await patch({ estimates });
    setNewEst({ source: "body_shop", amount: "", shop_name: "", estimate_date: "" });
    toast.success("Estimate added");
  };

  return (
    <div className="space-y-5" data-testid="matter-pd-tab">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="overline mb-1 flex items-center gap-2"><Car size={12} /> // property damage</div>
          <p className="text-sm text-praxium-subtle max-w-xl">
            Rental, estimates, total loss, daily follow-up — client retention + liability timing.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/training/article/03-property-damage-liability-timing" className="btn-ghost text-xs inline-flex items-center gap-1">
            <ExternalLink size={11} /> PD timing
          </Link>
          <Link to="/training/article/14-client-insurance-script" className="btn-ghost text-xs inline-flex items-center gap-1">
            <ExternalLink size={11} /> PD-only script
          </Link>
        </div>
      </div>

      {summary?.alerts?.length > 0 ? (
        <div className="data-card p-4 space-y-2" data-testid="pd-alerts">
          <div className="overline text-[10px] flex items-center gap-2"><AlertTriangle size={12} /> PD alerts ({summary.alert_count})</div>
          {summary.alerts.map((a) => (
            <div key={a.code} className={cn("text-sm border rounded-lg px-3 py-2", a.severity === "high" ? "bg-red-50 border-red-200 text-red-900" : "bg-amber-50 border-amber-200 text-amber-900")}>
              {a.message}
            </div>
          ))}
        </div>
      ) : null}

      <div className="data-card p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <label className="text-xs">
          <span className="font-mono uppercase text-[10px] text-praxium-subtle">Status</span>
          <select className={inputClass()} value={pd.status} disabled={busy} onChange={(e) => patch({ status: e.target.value })}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="text-xs">
          <span className="font-mono uppercase text-[10px] text-praxium-subtle">Claim track</span>
          <select className={inputClass()} value={pd.claim_track} disabled={busy} onChange={(e) => patch({ claim_track: e.target.value })}>
            {TRACK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="text-xs">
          <span className="font-mono uppercase text-[10px] text-praxium-subtle">PD liability</span>
          <select className={inputClass()} value={pd.liability_pd_status} disabled={busy} onChange={(e) => patch({ liability_pd_status: e.target.value })}>
            {LIAB_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <div className="flex flex-col gap-2 text-xs justify-end">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={pd.police_report_ordered} disabled={busy} onChange={(e) => patch({ police_report_ordered: e.target.checked })} />
            Police report ordered
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={pd.police_report_received} disabled={busy} onChange={(e) => patch({ police_report_received: e.target.checked })} />
            Police report received
          </label>
        </div>
      </div>

      <div className="data-card p-4">
        <div className="overline mb-3 text-[10px]">Vehicle</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <input className={inputClass()} placeholder="Year" value={pd.vehicle?.year || ""} onBlur={(e) => patch({ vehicle: { year: e.target.value } })} onChange={(e) => setPd({ ...pd, vehicle: { ...pd.vehicle, year: e.target.value } })} />
          <input className={inputClass()} placeholder="Make" value={pd.vehicle?.make || ""} onBlur={(e) => patch({ vehicle: { make: e.target.value } })} onChange={(e) => setPd({ ...pd, vehicle: { ...pd.vehicle, make: e.target.value } })} />
          <input className={inputClass()} placeholder="Model" value={pd.vehicle?.model || ""} onBlur={(e) => patch({ vehicle: { model: e.target.value } })} onChange={(e) => setPd({ ...pd, vehicle: { ...pd.vehicle, model: e.target.value } })} />
          <input className={inputClass()} placeholder="VIN" value={pd.vehicle?.vin || ""} onBlur={(e) => patch({ vehicle: { vin: e.target.value } })} onChange={(e) => setPd({ ...pd, vehicle: { ...pd.vehicle, vin: e.target.value } })} />
          <input type="number" className={inputClass()} placeholder="ACV ($)" value={pd.vehicle?.market_value ?? ""} onBlur={(e) => patch({ vehicle: { market_value: e.target.value ? Number(e.target.value) : null }, total_loss: { acv: e.target.value ? Number(e.target.value) : null } })} />
          <input className={inputClass()} placeholder="Tow / location" value={pd.vehicle?.location_notes || ""} onBlur={(e) => patch({ vehicle: { location_notes: e.target.value } })} />
        </div>
      </div>

      <div className="data-card p-4">
        <div className="overline mb-3 text-[10px]">Repair estimates</div>
        {(pd.estimates || []).length > 0 ? (
          <ul className="space-y-2 mb-3 text-sm">
            {pd.estimates.map((est) => (
              <li key={est.id} className="flex flex-wrap gap-3 items-center border-b border-praxium-line pb-2">
                <span className="font-mono font-semibold">{formatMoney(est.amount)}</span>
                <span className="text-xs text-praxium-subtle">{EST_SOURCES.find((s) => s.value === est.source)?.label}</span>
                {est.shop_name ? <span>{est.shop_name}</span> : null}
                {est.is_primary ? <span className="text-[10px] font-mono uppercase bg-praxium-bg px-1 rounded">Primary</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
        <form onSubmit={addEstimate} className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <select className={inputClass()} value={newEst.source} onChange={(e) => setNewEst({ ...newEst, source: e.target.value })}>
            {EST_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <input type="number" className={inputClass()} placeholder="Amount" value={newEst.amount} onChange={(e) => setNewEst({ ...newEst, amount: e.target.value })} data-testid="pd-estimate-amount" />
          <input className={inputClass()} placeholder="Shop name" value={newEst.shop_name} onChange={(e) => setNewEst({ ...newEst, shop_name: e.target.value })} />
          <input type="date" className={inputClass()} value={newEst.estimate_date} onChange={(e) => setNewEst({ ...newEst, estimate_date: e.target.value })} />
          <button type="submit" className="btn-praxium text-xs" disabled={busy}><Plus size={12} /> Add</button>
        </form>
        {summary?.total_loss_likely ? (
          <p className="text-xs text-amber-800 mt-3">Repair ≥ 60% of ACV — flag total-loss analysis.</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="data-card p-4">
          <div className="overline mb-3 text-[10px]">Rental</div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-xs col-span-2">
              <input type="checkbox" checked={pd.rental?.in_rental} disabled={busy} onChange={(e) => patch({ rental: { in_rental: e.target.checked } })} />
              Client in rental vehicle
            </label>
            <input type="number" className={inputClass()} placeholder="Daily rate" defaultValue={pd.rental?.daily_rate ?? ""} onBlur={(e) => patch({ rental: { daily_rate: e.target.value ? Number(e.target.value) : null } })} />
            <select className={inputClass()} value={pd.rental?.authorization_status || "none"} disabled={busy} onChange={(e) => patch({ rental: { authorization_status: e.target.value } })}>
              {RENTAL_AUTH.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input type="date" className={inputClass()} defaultValue={pd.rental?.start_date || ""} onBlur={(e) => patch({ rental: { start_date: e.target.value || null } })} />
            <input className={inputClass()} placeholder="Rental provider" defaultValue={pd.rental?.provider || ""} onBlur={(e) => patch({ rental: { provider: e.target.value } })} />
          </div>
        </div>
        <div className="data-card p-4">
          <div className="overline mb-3 text-[10px]">Loss of use</div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" className={inputClass()} placeholder="Days without vehicle" defaultValue={pd.loss_of_use?.days_without_vehicle ?? 0} onBlur={(e) => patch({ loss_of_use: { days_without_vehicle: Number(e.target.value) || 0 } })} />
            <input type="number" className={inputClass()} placeholder="Daily rate (similar class)" defaultValue={pd.loss_of_use?.daily_rate ?? ""} onBlur={(e) => patch({ loss_of_use: { daily_rate: e.target.value ? Number(e.target.value) : null } })} />
            {summary?.loss_of_use_amount != null ? (
              <div className="col-span-2 text-sm font-mono">Loss of use: {formatMoney(summary.loss_of_use_amount)}</div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="data-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="overline text-[10px]">Daily follow-up</div>
          <button type="button" className="btn-praxium text-xs" disabled={busy} onClick={logFollowUp} data-testid="pd-log-follow-up">
            <CheckCircle2 size={12} /> Log follow-up today
          </button>
        </div>
        <p className="text-xs text-praxium-subtle mb-2">
          Last: {pd.last_follow_up_date ? formatDate(pd.last_follow_up_date) : "never"} · Training: daily until rental/repairs move.
        </p>
        <label className="flex items-center gap-2 text-xs mb-2">
          <input type="checkbox" checked={pd.client_coaching_done} disabled={busy} onChange={(e) => patch({ client_coaching_done: e.target.checked })} />
          Client coached — PD-only insurer conversations
        </label>
        <textarea className={inputClass() + " min-h-[60px] text-sm"} placeholder="Blockers / notes" defaultValue={pd.blockers || ""} onBlur={(e) => patch({ blockers: e.target.value })} />
      </div>
    </div>
  );
}
