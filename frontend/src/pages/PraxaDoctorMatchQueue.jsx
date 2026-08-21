import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Stethoscope } from "lucide-react";
import PageLoader from "@/components/common/PageLoader";
import EmptyState from "@/components/common/EmptyState";

const STATUS_FILTERS = [
  { value: "queued", label: "Queued" },
  { value: "contacted", label: "Contacted" },
  { value: "matched", label: "Matched" },
  { value: "closed", label: "Closed" },
  { value: "declined", label: "Declined" },
  { value: "all", label: "All" },
];

function formatWhen(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export default function PraxaDoctorMatchQueue() {
  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("queued");

  const load = useCallback(() => {
    return Promise.all([
      api
        .get("/praxa-ops/doctor-match", { params: { status } })
        .then((r) => setRequests(r.data.requests || [])),
      api
        .get("/praxa-ops/doctor-match/summary")
        .then((r) => setSummary(r.data.by_status || {})),
    ]);
  }, [status]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => toast.error("Could not load Praxa doctor-match queue"))
      .finally(() => setLoading(false));
  }, [load]);

  const grantPremium = async (userId) => {
    if (!userId) return;
    try {
      await api.patch(`/praxa-ops/consumers/${userId}/plan`, { plan: "premium" });
      toast.success("Consumer marked Premium");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not grant Premium");
    }
  };

  const patch = async (id, nextStatus) => {
    const note = window.prompt("Internal staff note (optional — not shown to consumer):");
    if (note === null) return;
    const consumerMsg = window.prompt(
      "Message for the consumer in Praxa (optional — they will see this):",
    );
    if (consumerMsg === null) return;
    try {
      await api.patch(`/praxa-ops/doctor-match/${id}`, {
        status: nextStatus,
        staff_notes: note || undefined,
        consumer_message: consumerMsg || undefined,
      });
      toast.success(`Marked ${nextStatus}`);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Update failed");
    }
  };

  if (loading) return <PageLoader label="Loading Praxa matches…" />;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl">
      <div className="overline mb-2">// praxa hq</div>
      <h1 className="font-display font-black text-2xl tracking-tight flex items-center gap-2">
        <Stethoscope className="text-praxium-accent" /> Doctor match queue
      </h1>
      <p className="text-sm text-praxium-subtle mt-2">
        Consumer requests from Praxa HQ. Follow up with vetted options near their ZIP — do not invent
        a live directory they didn&apos;t request.
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {STATUS_FILTERS.filter((s) => s.value !== "all").map((s) => (
          <span
            key={s.value}
            className="px-2 py-1 rounded-sm border border-praxium-line bg-white tabular"
          >
            {s.label}: {summary[s.value] || 0}
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setStatus(s.value)}
            className={`text-xs uppercase tracking-widest px-3 py-1.5 rounded-sm border ${
              status === s.value
                ? "bg-praxium-ink text-white border-praxium-ink"
                : "border-praxium-line text-praxium-subtle"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {requests.length === 0 && (
          <EmptyState
            title="No requests"
            body="When consumers submit a doctor match in Praxa, they land here."
          />
        )}
        {requests.map((r) => (
          <div
            key={r.id}
            className="bg-white border border-praxium-line rounded-sm p-4"
            data-testid={`praxa-match-${r.id}`}
          >
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <div className="font-semibold">
                  ZIP {r.zip_code} · {r.specialty}
                  {r.prefer_lop ? " · LOP preferred" : ""}
                </div>
                <div className="text-xs text-praxium-subtle mt-1">
                  {r.consumer?.name || "—"} · {r.consumer?.email || "no email"} ·{" "}
                  {r.consumer?.phone || "no phone"}
                </div>
                <div className="text-xs text-praxium-subtle mt-0.5">
                  {formatWhen(r.created_at)} · status{" "}
                  <span className="uppercase tracking-wider">{r.status}</span>
                </div>
              </div>
            </div>
            {r.notes && <p className="mt-2 text-sm text-praxium-ink/80">{r.notes}</p>}
            {r.staff_notes && (
              <p className="mt-2 text-xs text-praxium-subtle border-t border-praxium-line pt-2">
                Staff (internal): {r.staff_notes}
              </p>
            )}
            {r.consumer_message && (
              <p className="mt-1 text-xs text-praxium-ink">
                Shown to consumer: {r.consumer_message}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {["contacted", "matched", "closed", "declined"].map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={r.status === s}
                  onClick={() => patch(r.id, s)}
                  className="text-xs px-3 py-1.5 border border-praxium-line rounded-sm hover:border-praxium-accent disabled:opacity-40"
                >
                  Mark {s}
                </button>
              ))}
              {r.user_id && (
                <button
                  type="button"
                  onClick={() => grantPremium(r.user_id)}
                  className="text-xs px-3 py-1.5 border border-praxium-accent text-praxium-accent rounded-sm"
                  data-testid={`grant-premium-${r.id}`}
                >
                  Grant Premium
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
