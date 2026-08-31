import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { formatDate, timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AlertTriangle, MessageSquare, Phone, ExternalLink } from "lucide-react";
import PageLoader from "@/components/common/PageLoader";

const CHANNELS = [
  { value: "call", label: "Phone call" },
  { value: "text", label: "Text / SMS (logged)" },
  { value: "portal", label: "Portal message" },
  { value: "note", label: "Internal note" },
];

function severityClass(status) {
  if (status === "overdue") return "border-rose-300 bg-rose-50 text-rose-900";
  if (status === "due_today") return "border-amber-300 bg-amber-50 text-amber-900";
  return "border-praxium-line bg-praxium-bg text-praxium-subtle";
}

export default function MatterCommsTab({ matterId, practiceArea }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [logForm, setLogForm] = useState({ channel: "call", summary: "", cadence_code: "" });

  const load = useCallback(() => {
    api
      .get(`/matters/${matterId}/comms-cadence`)
      .then((r) => setData(r.data))
      .catch(() => toast.error("Could not load comms cadence"))
      .finally(() => setLoading(false));
  }, [matterId]);

  useEffect(() => {
    if (practiceArea === "personal_injury") load();
    else setLoading(false);
  }, [practiceArea, load]);

  const logContact = async (e, markCode) => {
    e?.preventDefault?.();
    const summary = logForm.summary.trim();
    if (!summary) {
      toast.error("Add a contact summary — training requires dated notes");
      return;
    }
    setBusy(true);
    try {
      await api.post(`/matters/${matterId}/comms-cadence/contact`, {
        channel: logForm.channel,
        direction: "outbound",
        summary,
        cadence_code: markCode || logForm.cadence_code || undefined,
        mark_milestone_complete: markCode || undefined,
      });
      toast.success("Contact logged");
      setLogForm({ channel: "call", summary: "", cadence_code: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not log contact");
    } finally {
      setBusy(false);
    }
  };

  if (practiceArea !== "personal_injury") {
    return (
      <div className="text-sm text-praxium-subtle p-4">
        Client call cadence applies to PI matters.{" "}
        <Link to="/training/article/11-client-call-cadence" className="text-praxium-accent-text hover:underline">
          Training guide →
        </Link>
      </div>
    );
  }

  if (loading) return <PageLoader label="Loading comms cadence…" />;

  const cadence = data?.cadence || {};
  const dueItems = cadence.due_items || [];

  return (
    <div className="space-y-6" data-testid="matter-comms-tab">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="overline mb-1">// client comms cadence</div>
          <p className="text-sm text-praxium-subtle max-w-2xl">
            3-day · 7-day · biweekly client/provider · 30-day review. PD active → daily adjuster rhythm.
            SMS ships with VoxLine Phase 2 — log calls and texts here now.
          </p>
        </div>
        <Link to="/training/article/11-client-call-cadence" className="text-xs font-mono text-praxium-accent-text hover:underline inline-flex items-center gap-1">
          Article 11 <ExternalLink size={12} />
        </Link>
      </div>

      {data?.voxline_status === "mocked" && (
        <div className="text-xs font-mono text-amber-800 bg-amber-50 border border-amber-200 rounded-sm px-3 py-2 flex items-center gap-2">
          <Phone size={12} /> VoxLine SMS is mocked — use contact log until Telnyx is wired.
        </div>
      )}

      {cadence.pd_daily_mode && (
        <div className="data-card p-4 border-l-4 border-l-rose-500">
          <div className="font-display font-bold text-sm flex items-center gap-2">
            <AlertTriangle size={14} className="text-rose-600" /> PD daily mode
          </div>
          <p className="text-xs text-praxium-subtle mt-1">
            Rental/repair pending — daily adjuster follow-up overrides biweekly treatment cadence.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 data-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="overline">// due now</div>
            <span className="text-xs font-mono tabular">
              anchor {cadence.anchor_date ? formatDate(cadence.anchor_date) : "—"}
            </span>
          </div>
          {dueItems.length === 0 ? (
            <p className="text-sm text-praxium-subtle py-4 text-center">No cadence items due — keep logging contacts.</p>
          ) : (
            <div className="space-y-2">
              {dueItems.map((item) => (
                <div
                  key={`${item.code}-${item.due_date}`}
                  className={cn("border rounded-sm p-3", severityClass(item.status))}
                  data-testid={`cadence-${item.code}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">{item.label}</div>
                      <p className="text-xs mt-1 opacity-90">{item.prompt}</p>
                      <p className="text-[10px] font-mono mt-2 uppercase">
                        {item.status.replace("_", " ")}
                        {item.overdue_days > 0 ? ` · ${item.overdue_days}d overdue` : ""}
                        {item.channel_hint ? ` · ${item.channel_hint}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-praxium text-xs shrink-0"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await api.post(`/matters/${matterId}/comms-cadence/contact`, {
                            channel: "call",
                            direction: "outbound",
                            summary: `Completed cadence: ${item.label}`,
                            cadence_code: item.code,
                            mark_milestone_complete: item.code,
                          });
                          toast.success("Contact logged");
                          load();
                        } catch (err) {
                          toast.error(err.response?.data?.detail || "Could not log contact");
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Log & complete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="data-card p-4">
          <div className="overline mb-3">// log contact</div>
          <form onSubmit={logContact} className="space-y-3">
            <label className="block text-xs">
              <span className="font-mono uppercase text-praxium-subtle">Channel</span>
              <select
                className="mt-1 w-full text-sm border border-praxium-line rounded-sm px-2 py-1.5"
                value={logForm.channel}
                onChange={(e) => setLogForm((f) => ({ ...f, channel: e.target.value }))}
              >
                {CHANNELS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs">
              <span className="font-mono uppercase text-praxium-subtle">Summary *</span>
              <textarea
                className="mt-1 w-full text-sm border border-praxium-line rounded-sm px-2 py-1.5 min-h-[80px]"
                placeholder="Short, specific, dated — what was discussed?"
                value={logForm.summary}
                onChange={(e) => setLogForm((f) => ({ ...f, summary: e.target.value }))}
                required
              />
            </label>
            <button type="submit" className="btn-praxium w-full text-sm" disabled={busy}>
              {busy ? "Saving…" : "Log contact"}
            </button>
          </form>
        </div>
      </div>

      <div className="data-card p-4">
        <div className="overline mb-3 flex items-center gap-2">
          <MessageSquare size={12} /> contact history
        </div>
        {(data?.contact_log || []).length === 0 ? (
          <p className="text-sm text-praxium-subtle">No contacts logged yet.</p>
        ) : (
          <div className="divide-y divide-praxium-line">
            {data.contact_log.map((row) => (
              <div key={row.id} className="py-2.5 flex gap-3 text-sm">
                <div className="text-[10px] font-mono uppercase text-praxium-subtle w-16 shrink-0">{row.channel}</div>
                <div className="flex-1 min-w-0">
                  <div>{row.summary}</div>
                  <div className="text-[10px] font-mono text-praxium-subtle mt-0.5">
                    {row.created_by_name} · {timeAgo(row.created_at)}
                    {row.cadence_code ? ` · ${row.cadence_code}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
