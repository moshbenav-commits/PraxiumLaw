import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Stethoscope } from "lucide-react";
import PageLoader from "@/components/common/PageLoader";
import EmptyState from "@/components/common/EmptyState";

const HUB_TABS = [
  { id: "matches", label: "Matches" },
  { id: "premium", label: "Premium waitlist" },
  { id: "opinion", label: "Second opinion" },
];

const MATCH_STATUS_FILTERS = [
  { value: "queued", label: "Queued" },
  { value: "contacted", label: "Contacted" },
  { value: "matched", label: "Matched" },
  { value: "closed", label: "Closed" },
  { value: "declined", label: "Declined" },
  { value: "all", label: "All" },
];

const UPGRADE_STATUSES = ["contacted", "granted", "closed"];
const OPINION_STATUSES = ["reviewing", "delivered", "closed", "declined"];

function formatWhen(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function isPremiumMatch(r) {
  return Boolean(
    r.priority ||
      r.consumer_plan === "premium" ||
      r.consumer?.plan === "premium",
  );
}

export default function PraxaDoctorMatchQueue() {
  const [hub, setHub] = useState("matches");
  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState({});
  const [interests, setInterests] = useState([]);
  const [opinions, setOpinions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("queued");

  const loadMatches = useCallback(() => {
    return Promise.all([
      api
        .get("/praxa-ops/doctor-match", { params: { status } })
        .then((r) => setRequests(r.data.requests || [])),
      api
        .get("/praxa-ops/doctor-match/summary")
        .then((r) => setSummary(r.data.by_status || {})),
    ]);
  }, [status]);

  const loadPremium = useCallback(() => {
    return api
      .get("/praxa-ops/upgrade-interest")
      .then((r) => setInterests(r.data.interests || []));
  }, []);

  const loadOpinions = useCallback(() => {
    return api
      .get("/praxa-ops/second-opinion")
      .then((r) => setOpinions(r.data.requests || []));
  }, []);

  const load = useCallback(() => {
    if (hub === "matches") return loadMatches();
    if (hub === "premium") return loadPremium();
    return loadOpinions();
  }, [hub, loadMatches, loadPremium, loadOpinions]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => toast.error("Could not load Praxa ops queue"))
      .finally(() => setLoading(false));
  }, [load]);

  const grantPremium = async (userId) => {
    if (!userId) return;
    try {
      await api.patch(`/praxa-ops/consumers/${userId}/plan`, { plan: "premium" });
      toast.success("Consumer marked Premium");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not grant Premium");
    }
  };

  const patchMatch = async (id, nextStatus) => {
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
      loadMatches();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Update failed");
    }
  };

  const patchUpgrade = async (id, nextStatus) => {
    try {
      await api.patch(`/praxa-ops/upgrade-interest/${id}`, { status: nextStatus });
      toast.success(`Waitlist → ${nextStatus}`);
      loadPremium();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Update failed");
    }
  };

  const patchOpinion = async (id, nextStatus) => {
    const note = window.prompt("Internal staff note (optional):");
    if (note === null) return;
    const consumerMsg = window.prompt("Message for consumer (optional):");
    if (consumerMsg === null) return;
    try {
      await api.patch(`/praxa-ops/second-opinion/${id}`, {
        status: nextStatus,
        staff_notes: note || undefined,
        consumer_message: consumerMsg || undefined,
      });
      toast.success(`Second opinion → ${nextStatus}`);
      loadOpinions();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Update failed");
    }
  };

  if (loading) return <PageLoader label="Loading Praxa ops…" />;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl">
      <div className="overline mb-2">// praxa hq</div>
      <h1 className="font-display font-black text-2xl tracking-tight flex items-center gap-2">
        <Stethoscope className="text-praxium-accent" /> Praxa Ops
      </h1>
      <p className="text-sm text-praxium-subtle mt-2">
        Consumer queues from Praxa HQ — doctor match, Premium waitlist, and second opinion.
      </p>

      <div className="mt-4 flex flex-wrap gap-2 border-b border-praxium-line pb-3">
        {HUB_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setHub(t.id)}
            className={`text-xs uppercase tracking-widest px-3 py-1.5 rounded-sm border ${
              hub === t.id
                ? "bg-praxium-ink text-white border-praxium-ink"
                : "border-praxium-line text-praxium-subtle"
            }`}
            data-testid={`praxa-ops-tab-${t.id}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {hub === "matches" && (
        <>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {MATCH_STATUS_FILTERS.filter((s) => s.value !== "all").map((s) => (
              <span
                key={s.value}
                className="px-2 py-1 rounded-sm border border-praxium-line bg-white tabular"
              >
                {s.label}: {summary[s.value] || 0}
              </span>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {MATCH_STATUS_FILTERS.map((s) => (
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
                    <div className="font-semibold flex flex-wrap items-center gap-2">
                      ZIP {r.zip_code} · {r.specialty}
                      {r.prefer_lop ? " · LOP preferred" : ""}
                      {isPremiumMatch(r) && (
                        <span className="text-[10px] uppercase tracking-wider bg-amber-100 text-amber-900 px-2 py-0.5 rounded-sm border border-amber-200">
                          Premium
                        </span>
                      )}
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
                      onClick={() => patchMatch(r.id, s)}
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
        </>
      )}

      {hub === "premium" && (
        <div className="mt-6 space-y-3">
          {interests.length === 0 && (
            <EmptyState
              title="No waitlist entries"
              body="When consumers request Premium interest in Praxa, they appear here."
            />
          )}
          {interests.map((i) => (
            <div
              key={i.id}
              className="bg-white border border-praxium-line rounded-sm p-4"
              data-testid={`praxa-upgrade-${i.id}`}
            >
              <div className="font-semibold">{i.name || "—"}</div>
              <div className="text-xs text-praxium-subtle mt-1">
                {i.email || "no email"} · {formatWhen(i.created_at)} ·{" "}
                <span className="uppercase tracking-wider">{i.status || "queued"}</span>
              </div>
              {i.note && <p className="mt-2 text-sm">{i.note}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {UPGRADE_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={i.status === s}
                    onClick={() => patchUpgrade(i.id, s)}
                    className="text-xs px-3 py-1.5 border border-praxium-line rounded-sm hover:border-praxium-accent disabled:opacity-40"
                  >
                    Mark {s}
                  </button>
                ))}
                {i.user_id && (
                  <button
                    type="button"
                    onClick={() => grantPremium(i.user_id)}
                    className="text-xs px-3 py-1.5 border border-praxium-accent text-praxium-accent rounded-sm"
                  >
                    Grant Premium
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {hub === "opinion" && (
        <div className="mt-6 space-y-3">
          {opinions.length === 0 && (
            <EmptyState
              title="No second opinion requests"
              body="Consumers submit second opinion requests in the Praxa app — no card charge in-app."
            />
          )}
          {opinions.map((o) => (
            <div
              key={o.id}
              className="bg-white border border-praxium-line rounded-sm p-4"
              data-testid={`praxa-opinion-${o.id}`}
            >
              <div className="font-semibold">{o.name || o.email || "Consumer"}</div>
              <div className="text-xs text-praxium-subtle mt-1">
                {formatWhen(o.created_at)} · urgency {o.urgency || "normal"} ·{" "}
                <span className="uppercase tracking-wider">{o.status || "queued"}</span>
              </div>
              <p className="mt-2 text-sm">{o.summary}</p>
              {o.goals && (
                <p className="mt-1 text-sm text-praxium-subtle">Goals: {o.goals}</p>
              )}
              {o.staff_notes && (
                <p className="mt-2 text-xs text-praxium-subtle border-t border-praxium-line pt-2">
                  Staff: {o.staff_notes}
                </p>
              )}
              {o.consumer_message && (
                <p className="mt-1 text-xs text-praxium-ink">
                  Shown to consumer: {o.consumer_message}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {OPINION_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={o.status === s}
                    onClick={() => patchOpinion(o.id, s)}
                    className="text-xs px-3 py-1.5 border border-praxium-line rounded-sm hover:border-praxium-accent disabled:opacity-40"
                  >
                    Mark {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
