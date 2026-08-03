import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Mailbox, AlertTriangle, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import PageLoader from "@/components/common/PageLoader";
import EmptyState from "@/components/common/EmptyState";
import { Link } from "react-router-dom";

// Mirrors backend/mail_adapters.py TICKET_TYPES.
const TICKET_TYPES = [
  "citation",
  "medical_record",
  "medical_bill",
  "lien_notice",
  "insurance_correspondence",
  "court_notice",
  "general_correspondence",
  "unknown",
];

const STATUS_FILTERS = [
  { value: "ingested", label: "Ingested" },
  { value: "routed", label: "Routed" },
  { value: "all", label: "All" },
];

const LOW_CONFIDENCE_THRESHOLD = 0.7;

function ticketTypeLabel(t) {
  if (!t) return "—";
  return t
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatWhen(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function IngestForm({ onDone }) {
  const [open, setOpen] = useState(false);
  const [fromAddr, setFromAddr] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [matterId, setMatterId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and body are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post("/mail/ingest", {
        from_addr: fromAddr || undefined,
        subject: subject.trim(),
        body: body.trim(),
        matter_id: matterId || undefined,
      });
      toast.success(`Classified as ${ticketTypeLabel(res.data.ticket_type)}`);
      setFromAddr("");
      setSubject("");
      setBody("");
      setMatterId("");
      onDone();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Ingest failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="data-card p-4 mt-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-left"
        data-testid="mail-ingest-toggle"
      >
        <span className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle">
          Ingest test email
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className="mt-4 space-y-2">
          <input
            type="text"
            value={fromAddr}
            onChange={(e) => setFromAddr(e.target.value)}
            placeholder="From address (optional)"
            className="w-full rounded-sm border border-praxium-line bg-transparent px-2 py-1.5 text-xs"
            data-testid="mail-ingest-from"
          />
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="w-full rounded-sm border border-praxium-line bg-transparent px-2 py-1.5 text-xs"
            data-testid="mail-ingest-subject"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Body"
            rows={4}
            className="w-full rounded-sm border border-praxium-line bg-transparent px-2 py-1.5 text-xs"
            data-testid="mail-ingest-body"
          />
          <input
            type="text"
            value={matterId}
            onChange={(e) => setMatterId(e.target.value)}
            placeholder="Matter ID (optional)"
            className="w-full rounded-sm border border-praxium-line bg-transparent px-2 py-1.5 text-xs"
            data-testid="mail-ingest-matter"
          />
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="rounded-sm bg-praxium-accent px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
            data-testid="mail-ingest-submit"
          >
            {submitting ? "Ingesting…" : "Ingest"}
          </button>
        </div>
      )}
    </div>
  );
}

function RouteControl({ item, onDone }) {
  const [ticketType, setTicketType] = useState(item.ticket_type || TICKET_TYPES[0]);
  const [matterId, setMatterId] = useState(item.matter_id || "");
  const [routing, setRouting] = useState(false);

  const route = async () => {
    setRouting(true);
    try {
      await api.post(`/mail/items/${item.id}/route`, {
        ticket_type: ticketType,
        matter_id: matterId || undefined,
      });
      toast.success(`Routed as ${ticketTypeLabel(ticketType)}`);
      onDone();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Route failed");
    } finally {
      setRouting(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-praxium-line flex flex-wrap gap-2 items-center">
      <select
        value={ticketType}
        onChange={(e) => setTicketType(e.target.value)}
        className="rounded-sm border border-praxium-line bg-transparent px-2 py-1.5 text-xs font-mono"
        data-testid={`mail-route-type-${item.id}`}
      >
        {TICKET_TYPES.map((t) => (
          <option key={t} value={t}>
            {ticketTypeLabel(t)}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={matterId}
        onChange={(e) => setMatterId(e.target.value)}
        placeholder="Matter ID (optional)"
        className="rounded-sm border border-praxium-line bg-transparent px-2 py-1.5 text-xs flex-1 min-w-[10rem]"
        data-testid={`mail-route-matter-${item.id}`}
      />
      <button
        type="button"
        onClick={route}
        disabled={routing}
        className="rounded-sm border border-praxium-accent px-3 py-1.5 text-xs font-bold text-praxium-accent disabled:opacity-50"
        data-testid={`mail-route-submit-${item.id}`}
      >
        {routing ? "Routing…" : item.status === "ingested" ? "Route" : "Re-route"}
      </button>
    </div>
  );
}

export default function MailInbox() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("ingested");

  const load = useCallback(() => {
    const params = status === "all" ? {} : { status };
    return api.get("/mail/items", { params }).then((r) => setItems(r.data.items || []));
  }, [status]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => toast.error("Could not load mail inbox"))
      .finally(() => setLoading(false));
  }, [load]);

  if (loading) return <PageLoader label="Loading mail inbox…" />;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl">
      <div className="overline mb-2">// intake mailbox</div>
      <h1 className="font-display font-black text-2xl tracking-tight flex items-center gap-2">
        <Mailbox className="text-praxium-accent" /> Mail inbox
      </h1>
      <p className="text-sm text-praxium-subtle mt-2">
        Every inbound mail item lands here first — classified automatically, routed straight to the
        Citation OS when confidence is high, or held for a human to re-route.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatus(f.value)}
            className={`text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 border rounded-sm ${
              status === f.value
                ? "border-praxium-accent text-praxium-accent"
                : "border-praxium-line text-praxium-subtle"
            }`}
            data-testid={`mail-status-${f.value}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <IngestForm onDone={load} />

      <div className="mt-6 space-y-3">
        {items.length === 0 ? (
          <EmptyState title="No mail items in this view." testId="mail-empty" />
        ) : (
          items.map((item) => {
            const lowConfidence =
              typeof item.confidence === "number" && item.confidence < LOW_CONFIDENCE_THRESHOLD;
            const routedToCitation = item.routed_to && item.routed_to.startsWith("citation:");
            return (
              <div key={item.id} className="data-card p-4" data-testid={`mail-row-${item.id}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="font-semibold text-sm">{item.subject || "(no subject)"}</span>
                      <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 border border-praxium-line text-praxium-subtle">
                        {ticketTypeLabel(item.ticket_type)}
                      </span>
                      <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 border border-praxium-line text-praxium-subtle">
                        {item.status}
                      </span>
                      {lowConfidence && (
                        <span
                          className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 border border-praxium-accent text-praxium-accent flex items-center gap-1"
                          data-testid={`mail-low-confidence-${item.id}`}
                        >
                          <AlertTriangle size={10} /> Low confidence
                        </span>
                      )}
                      {routedToCitation && (
                        <Link
                          to="/citations"
                          className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 border border-praxium-line text-praxium-subtle flex items-center gap-1 hover:border-praxium-accent hover:text-praxium-accent"
                          data-testid={`mail-routed-citation-${item.id}`}
                        >
                          <ArrowRight size={10} /> Citation
                        </Link>
                      )}
                    </div>
                    <div className="text-xs font-mono text-praxium-subtle mt-1">
                      {item.from_addr || "unknown sender"}
                      {" · "}confidence {typeof item.confidence === "number" ? item.confidence.toFixed(2) : "—"}
                      {" · "}
                      {formatWhen(item.created_at)}
                      {item.matter_id ? ` · matter ${String(item.matter_id).slice(0, 8)}…` : ""}
                    </div>
                    {item.body && (
                      <div className="mt-2 text-xs text-praxium-subtle leading-relaxed line-clamp-3">
                        {item.body}
                      </div>
                    )}
                    {item.extracted && Object.keys(item.extracted).length > 0 && (
                      <div className="mt-2 text-xs font-mono text-praxium-subtle space-y-0.5">
                        {Object.entries(item.extracted).map(([k, v]) => (
                          <div key={k}>
                            <span className="text-praxium-subtle">{k}:</span> {String(v)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <RouteControl item={item} onDone={load} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
