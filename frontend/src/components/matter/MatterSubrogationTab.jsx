import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AlertTriangle, Scale } from "lucide-react";
import PageLoader from "@/components/common/PageLoader";
import MatterTabHelp from "@/components/matter/MatterTabHelp";

const STATUS_OPTIONS = [
  { value: "not_open", label: "Not open" },
  { value: "open", label: "Open / tracking" },
  { value: "resolved", label: "Resolved" },
  { value: "not_applicable", label: "N/A — no benefits used" },
];

const PATH_OPTIONS = [
  { value: "none", label: "Not determined" },
  { value: "medicare", label: "Medicare" },
  { value: "medicaid", label: "Medicaid / poor-aid (attorney caution)" },
  { value: "health_plan", label: "Private health plan" },
  { value: "mixed", label: "Mixed / multiple" },
];

function inputClass() {
  return "w-full text-sm border border-praxium-line rounded-sm px-2 py-1.5 bg-white";
}

export default function MatterSubrogationTab({ matterId, practiceArea }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api
      .get(`/matters/${matterId}/subrogation`)
      .then((r) => setData(r.data))
      .catch(() => toast.error("Could not load subrogation"))
      .finally(() => setLoading(false));
  }, [matterId]);

  useEffect(() => {
    if (practiceArea === "personal_injury") load();
    else setLoading(false);
  }, [practiceArea, load]);

  const patch = async (body) => {
    setBusy(true);
    try {
      const r = await api.patch(`/matters/${matterId}/subrogation`, body);
      setData((prev) => ({ ...prev, pi_subrogation: r.data.pi_subrogation, alerts: r.data.alerts }));
    } catch (err) {
      toast.error(err.response?.data?.detail || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const toggleChecklist = (id, complete) => {
    patch({ checklist: [{ id, complete }] });
  };

  if (practiceArea !== "personal_injury") {
    return (
      <div className="text-sm text-praxium-subtle p-4">
        Subrogation tracking applies to PI matters.
      </div>
    );
  }

  if (loading) return <PageLoader label="Loading subrogation…" />;

  const sub = data?.pi_subrogation || {};
  const alerts = data?.alerts || [];

  return (
    <div className="space-y-6" data-testid="matter-subrogation-tab">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="overline mb-1">// health subrogation</div>
          <p className="text-sm text-praxium-subtle max-w-2xl">
            Open only when health benefits were used — Medicare path is critical. Do not open subrogation without documented usage.
          </p>
          {data?.medicare_recipient === true && (
            <p className="text-xs text-amber-800 mt-2 font-medium">Intake: Medicare recipient — verify Medicare checklist below.</p>
          )}
          {data?.medicare_recipient === false && (
            <p className="text-xs text-praxium-subtle mt-2">Intake: non-Medicare branch selected.</p>
          )}
        </div>
        <MatterTabHelp to="23-intake-forms-and-signature-packet" label="Medicare intake branch" />
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a) => (
            <div
              key={a.code}
              className={cn(
                "text-sm border rounded-sm px-3 py-2 flex items-start gap-2",
                a.severity === "high" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-amber-200 bg-amber-50 text-amber-900"
              )}
            >
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              {a.message}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="data-card p-4 space-y-4">
          <div className="overline flex items-center gap-2">
            <Scale size={12} /> track
          </div>
          <label className="block text-sm">
            <span className="text-xs font-mono uppercase text-praxium-subtle">Status</span>
            <select
              className={cn(inputClass(), "mt-1")}
              value={sub.status || "not_open"}
              disabled={busy}
              onChange={(e) => patch({ status: e.target.value })}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-xs font-mono uppercase text-praxium-subtle">Path</span>
            <select
              className={cn(inputClass(), "mt-1")}
              value={sub.path || "none"}
              disabled={busy}
              onChange={(e) => patch({ path: e.target.value })}
            >
              {PATH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={sub.health_plan_used === true}
              onChange={(e) => patch({ health_plan_used: e.target.checked ? true : false })}
              disabled={busy}
            />
            Health insurance benefits used (ER / hospital / ambulance)
          </label>
          <label className="block text-sm">
            <span className="text-xs font-mono uppercase text-praxium-subtle">Health plan name</span>
            <input
              className={cn(inputClass(), "mt-1")}
              value={sub.health_plan_name || ""}
              onBlur={(e) => patch({ health_plan_name: e.target.value })}
              onChange={(e) => setData((d) => ({ ...d, pi_subrogation: { ...sub, health_plan_name: e.target.value } }))}
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-mono uppercase text-praxium-subtle">Recovery vendor</span>
            <input
              className={cn(inputClass(), "mt-1")}
              value={sub.recovery_vendor || ""}
              onBlur={(e) => patch({ recovery_vendor: e.target.value })}
              onChange={(e) => setData((d) => ({ ...d, pi_subrogation: { ...sub, recovery_vendor: e.target.value } }))}
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-mono uppercase text-praxium-subtle">LOR / notice sent</span>
            <input
              type="date"
              className={cn(inputClass(), "mt-1")}
              value={(sub.letter_sent_at || "").slice(0, 10)}
              onChange={(e) => patch({ letter_sent_at: e.target.value || null })}
              disabled={busy}
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-mono uppercase text-praxium-subtle">Benefits used notes</span>
            <textarea
              className={cn(inputClass(), "mt-1 min-h-[72px]")}
              value={sub.benefits_used_notes || ""}
              onBlur={(e) => patch({ benefits_used_notes: e.target.value })}
              onChange={(e) => setData((d) => ({ ...d, pi_subrogation: { ...sub, benefits_used_notes: e.target.value } }))}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(sub.attorney_review_required)}
              onChange={(e) => patch({ attorney_review_required: e.target.checked })}
              disabled={busy}
            />
            Attorney review required (Medicaid / caution path)
          </label>
          {sub.attorney_review_required && !sub.attorney_reviewed_at && (
            <button type="button" className="btn-praxium text-sm" disabled={busy} onClick={() => patch({ mark_attorney_reviewed: true })}>
              Mark attorney reviewed
            </button>
          )}
          {sub.attorney_reviewed_at && (
            <p className="text-[10px] font-mono text-emerald-700">Attorney reviewed {new Date(sub.attorney_reviewed_at).toLocaleString()}</p>
          )}
        </div>

        <div className="data-card p-4">
          <div className="overline mb-3">Medicare-critical checklist</div>
          <ul className="space-y-2">
            {(sub.checklist || []).map((item) => (
              <li key={item.id} className="flex items-start gap-2 text-sm border-b border-praxium-line pb-2 last:border-0">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={Boolean(item.complete)}
                  disabled={busy}
                  onChange={(e) => toggleChecklist(item.id, e.target.checked)}
                  data-testid={`subro-check-${item.id}`}
                />
                <div>
                  <span className={item.critical ? "font-medium" : ""}>{item.label}</span>
                  {item.critical && <span className="text-[10px] font-mono text-rose-600 ml-1">critical</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
