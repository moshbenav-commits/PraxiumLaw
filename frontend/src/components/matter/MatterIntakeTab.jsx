import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { ClipboardList, ExternalLink, FileText, Printer } from "lucide-react";
import PageLoader from "@/components/common/PageLoader";

const CONFLICT_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "clear", label: "Clear" },
  { value: "flagged", label: "Flagged — review" },
];

export default function MatterIntakeTab({ matterId }) {
  const [piIntake, setPiIntake] = useState(null);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    Promise.all([api.get(`/matters/${matterId}/intake`), api.get("/team")])
      .then(([intakeRes, teamRes]) => {
        setPiIntake(intakeRes.data.pi_intake);
        setTeam(teamRes.data || []);
      })
      .catch(() => toast.error("Could not load intake data"))
      .finally(() => setLoading(false));
  }, [matterId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (patch) => {
    setSaving(true);
    try {
      const r = await api.patch(`/matters/${matterId}/intake`, patch);
      setPiIntake(r.data.pi_intake);
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleItem = (id, received) => {
    const needs_list = piIntake.needs_list.map((row) =>
      row.id === id ? { id: row.id, received, notes: row.notes || "" } : { id: row.id, received: row.received, notes: row.notes || "" },
    );
    setPiIntake({ ...piIntake, needs_list });
    save({ needs_list });
  };

  const updateItemNotes = (id, notes) => {
    const needs_list = piIntake.needs_list.map((row) =>
      row.id === id ? { id: row.id, received: row.received, notes } : { id: row.id, received: row.received, notes: row.notes || "" },
    );
    setPiIntake({ ...piIntake, needs_list });
  };

  const blurItemNotes = (id) => {
    const row = piIntake.needs_list.find((r) => r.id === id);
    if (!row) return;
    save({ needs_list: [{ id, received: row.received, notes: row.notes || "" }] });
  };

  if (loading || !piIntake) return <PageLoader label="Loading intake…" />;

  const receivedCount = piIntake.needs_list.filter((r) => r.received).length;
  const totalCount = piIntake.needs_list.length;

  return (
    <div className="space-y-5" data-testid="matter-intake-tab">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="overline mb-1 flex items-center gap-2">
            <ClipboardList size={12} /> // day 0 intake
          </div>
          <p className="text-sm text-praxium-subtle max-w-xl">
            Needs List from training — check off documents received at signing, note appointments, assign team.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link to="/settings/templates" className="btn-ghost py-1.5 inline-flex items-center gap-1">
            <FileText size={12} /> Templates
          </Link>
          <Link to="/training/intake-checklist" className="btn-ghost py-1.5 inline-flex items-center gap-1">
            <Printer size={12} /> Signature checklist
          </Link>
          <Link to="/training/article/01-intake-needs-list" className="btn-ghost py-1.5 inline-flex items-center gap-1">
            <ExternalLink size={12} /> Training article
          </Link>
        </div>
      </div>

      <div className="data-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="overline">// needs list</div>
          <span className="text-xs font-mono text-praxium-subtle" data-testid="needs-list-progress">
            {receivedCount}/{totalCount} received
          </span>
        </div>
        <ul className="space-y-2">
          {piIntake.needs_list.map((row) => (
            <li key={row.id} className="flex flex-col sm:flex-row sm:items-start gap-2 py-2 border-b border-praxium-line last:border-0">
              <label className="flex items-start gap-2 text-sm min-w-[240px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(row.received)}
                  onChange={(e) => toggleItem(row.id, e.target.checked)}
                  className="mt-0.5"
                  data-testid={`needs-${row.id}`}
                />
                <span className={row.received ? "text-praxium-subtle line-through" : ""}>{row.label}</span>
              </label>
              <input
                type="text"
                placeholder="Notes (e.g. received copy, pending mail…)"
                value={row.notes || ""}
                onChange={(e) => updateItemNotes(row.id, e.target.value)}
                onBlur={() => blurItemNotes(row.id)}
                className="flex-1 text-xs px-2 py-1.5 border border-praxium-line rounded-sm bg-white"
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="data-card p-5">
          <div className="overline mb-3">// appointments & homework</div>
          <textarea
            rows={5}
            value={piIntake.appointments_notes || ""}
            onChange={(e) => setPiIntake({ ...piIntake, appointments_notes: e.target.value })}
            onBlur={() => save({ appointments_notes: piIntake.appointments_notes || "" })}
            placeholder="Write chiro/PT/pain mgmt appointments, body shop referral, follow-up call date…"
            className="w-full text-sm px-3 py-2 border border-praxium-line rounded-sm"
            data-testid="intake-appointments-notes"
          />
          <p className="text-xs text-praxium-subtle mt-2">Hand client a printed Needs List with these dates filled in.</p>
        </div>

        <div className="data-card p-5 space-y-4">
          <div className="overline">// intake flags</div>
          <label className="block text-sm">
            <span className="text-xs font-mono uppercase text-praxium-subtle">Medicare recipient?</span>
            <select
              value={piIntake.medicare_recipient === null ? "" : piIntake.medicare_recipient ? "yes" : "no"}
              onChange={(e) => {
                const v = e.target.value === "" ? null : e.target.value === "yes";
                setPiIntake({ ...piIntake, medicare_recipient: v });
                save({ medicare_recipient: v });
              }}
              className="mt-1 w-full text-sm border border-praxium-line rounded-sm px-2 py-1.5"
              data-testid="intake-medicare"
            >
              <option value="">Not set</option>
              <option value="yes">Yes — use Medicare intake pack</option>
              <option value="no">No — standard intake pack</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-xs font-mono uppercase text-praxium-subtle">Conflict check</span>
            <select
              value={piIntake.conflict_check_status || "pending"}
              onChange={(e) => {
                setPiIntake({ ...piIntake, conflict_check_status: e.target.value });
                save({ conflict_check_status: e.target.value });
              }}
              className="mt-1 w-full text-sm border border-praxium-line rounded-sm px-2 py-1.5"
              data-testid="intake-conflict-status"
            >
              {CONFLICT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <textarea
            rows={2}
            value={piIntake.conflict_notes || ""}
            onChange={(e) => setPiIntake({ ...piIntake, conflict_notes: e.target.value })}
            onBlur={() => save({ conflict_notes: piIntake.conflict_notes || "" })}
            placeholder="Related cases, same vehicle occupants, prior representation…"
            className="w-full text-xs px-2 py-1.5 border border-praxium-line rounded-sm"
          />
        </div>
      </div>

      <div className="data-card p-5">
        <div className="overline mb-3">// team on this matter</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { key: "case_manager_id", label: "Case manager" },
            { key: "supervising_attorney_id", label: "Supervising attorney" },
            { key: "intake_staff_id", label: "Intake / clerical" },
          ].map(({ key, label }) => (
            <label key={key} className="text-sm">
              <span className="text-xs font-mono uppercase text-praxium-subtle">{label}</span>
              <select
                value={piIntake[key] || ""}
                onChange={(e) => {
                  const v = e.target.value || null;
                  setPiIntake({ ...piIntake, [key]: v });
                  save({ [key]: v });
                }}
                className="mt-1 w-full text-sm border border-praxium-line rounded-sm px-2 py-1.5"
                data-testid={`intake-${key}`}
              >
                <option value="">Unassigned</option>
                {team.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>

      {saving && <p className="text-xs font-mono text-praxium-subtle">Saving…</p>}
    </div>
  );
}
