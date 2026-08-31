import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Gavel, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import PageLoader from "@/components/common/PageLoader";
import EmptyState from "@/components/common/EmptyState";

// Mirrors backend/citations.py LINEAR_STATES — forward-only happy path.
// "strategy_set" is reachable only via POST /citations/{id}/strategy
// (attorney-gated), never through the generic state-transition endpoint.
const LINEAR_STATES = [
  "detected",
  "verified",
  "conflict_cleared",
  "engaged",
  "strategy_set",
  "filed",
  "awaiting_response",
  "negotiating",
  "disposition_offered",
  "client_approved",
  "resolved",
  "verified_closed",
];

// Reachable from any non-terminal state, never part of the linear chain.
const FAILURE_STATES = ["declined", "withdrawn", "defaulted", "referred_out"];

const ALL_STATES = [...LINEAR_STATES, ...FAILURE_STATES];

const OFFER_RUNGS = ["dismissal", "amend_non_moving", "deferral", "fine_reduction", "payment_plan"];
const OFFER_DIRECTIONS = ["ask", "counter", "accept"];

const LOW_CONFIDENCE_THRESHOLD = 0.7;

function stateLabel(state) {
  if (!state) return "—";
  return state
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

function formatMoney(amount) {
  if (amount === null || amount === undefined || amount === "") return "—";
  const n = Number(amount);
  if (Number.isNaN(n)) return String(amount);
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

// Next states reachable from the generic PATCH /state endpoint — the
// forward-only linear chain (skipping the attorney-gated strategy_set)
// plus the failure exits, as long as the citation isn't already terminal.
function nextStateOptions(current) {
  if (!current) return [];
  if (FAILURE_STATES.includes(current) || current === LINEAR_STATES[LINEAR_STATES.length - 1]) {
    return [];
  }
  const idx = LINEAR_STATES.indexOf(current);
  const forward =
    idx === -1 ? [] : LINEAR_STATES.slice(idx + 1).filter((s) => s !== "strategy_set");
  return [...forward, ...FAILURE_STATES];
}

function gateErrorMessage(e, fallback) {
  if (e?.response?.status === 403) return "Requires attorney sign-off";
  return e?.response?.data?.detail || fallback;
}

function CitationActions({ citation, onDone }) {
  const options = useMemo(() => nextStateOptions(citation.state), [citation.state]);
  const [targetState, setTargetState] = useState(options[0] || "");
  const [stateNote, setStateNote] = useState("");
  const [advancing, setAdvancing] = useState(false);

  const [strategy, setStrategy] = useState(citation.strategy || "");
  const [strategyNote, setStrategyNote] = useState("");
  const [settingStrategy, setSettingStrategy] = useState(false);

  const [rung, setRung] = useState(OFFER_RUNGS[0]);
  const [direction, setDirection] = useState(OFFER_DIRECTIONS[0]);
  const [terms, setTerms] = useState("");
  const [amount, setAmount] = useState("");
  const [submittingOffer, setSubmittingOffer] = useState(false);

  const advance = async () => {
    if (!targetState) return;
    setAdvancing(true);
    try {
      await api.patch(`/citations/${citation.id}/state`, {
        state: targetState,
        note: stateNote || undefined,
      });
      toast.success(`Advanced to ${stateLabel(targetState)}`);
      setStateNote("");
      onDone();
    } catch (e) {
      toast.error(gateErrorMessage(e, "Illegal transition"));
    } finally {
      setAdvancing(false);
    }
  };

  const setStrategyAction = async () => {
    if (!strategy.trim()) {
      toast.error("Strategy is required");
      return;
    }
    setSettingStrategy(true);
    try {
      await api.post(`/citations/${citation.id}/strategy`, {
        strategy: strategy.trim(),
        note: strategyNote || undefined,
      });
      toast.success("Strategy set");
      setStrategyNote("");
      onDone();
    } catch (e) {
      toast.error(gateErrorMessage(e, "Could not set strategy"));
    } finally {
      setSettingStrategy(false);
    }
  };

  const submitOffer = async () => {
    setSubmittingOffer(true);
    try {
      await api.post(`/citations/${citation.id}/offers`, {
        rung,
        direction,
        terms: terms || undefined,
        amount: amount === "" ? undefined : Number(amount),
      });
      toast.success("Offer recorded");
      setTerms("");
      setAmount("");
      onDone();
    } catch (e) {
      toast.error(gateErrorMessage(e, "Could not record offer"));
    } finally {
      setSubmittingOffer(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-praxium-line space-y-5">
      {/* Advance state */}
      <div>
        <div className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle mb-1.5">
          Advance state
        </div>
        {options.length === 0 ? (
          <div className="text-xs text-praxium-subtle">No further transitions — pipeline is terminal.</div>
        ) : (
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={targetState}
              onChange={(e) => setTargetState(e.target.value)}
              className="rounded-sm border border-praxium-line bg-transparent px-2 py-1.5 text-xs font-mono"
              data-testid={`citation-advance-select-${citation.id}`}
            >
              {options.map((s) => (
                <option key={s} value={s}>
                  {stateLabel(s)}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={stateNote}
              onChange={(e) => setStateNote(e.target.value)}
              placeholder="Note (optional)"
              className="rounded-sm border border-praxium-line bg-transparent px-2 py-1.5 text-xs flex-1 min-w-[10rem]"
              data-testid={`citation-advance-note-${citation.id}`}
            />
            <button
              type="button"
              onClick={advance}
              disabled={advancing}
              className="rounded-sm bg-praxium-accent-text px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
              data-testid={`citation-advance-submit-${citation.id}`}
            >
              {advancing ? "Advancing…" : "Advance"}
            </button>
          </div>
        )}
      </div>

      {/* Set strategy — attorney gate */}
      <div>
        <div className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle mb-1.5">
          Set strategy <span className="text-praxium-accent-text">— Attorney gate</span>
        </div>
        <textarea
          value={strategy}
          onChange={(e) => setStrategy(e.target.value)}
          placeholder="Strategy…"
          rows={2}
          className="w-full rounded-sm border border-praxium-line bg-transparent px-2 py-1.5 text-xs"
          data-testid={`citation-strategy-text-${citation.id}`}
        />
        <div className="flex flex-wrap gap-2 items-center mt-2">
          <input
            type="text"
            value={strategyNote}
            onChange={(e) => setStrategyNote(e.target.value)}
            placeholder="Sign-off note (optional)"
            className="rounded-sm border border-praxium-line bg-transparent px-2 py-1.5 text-xs flex-1 min-w-[10rem]"
            data-testid={`citation-strategy-note-${citation.id}`}
          />
          <button
            type="button"
            onClick={setStrategyAction}
            disabled={settingStrategy}
            className="rounded-sm border border-praxium-accent px-3 py-1.5 text-xs font-bold text-praxium-accent disabled:opacity-50"
            data-testid={`citation-strategy-submit-${citation.id}`}
          >
            {settingStrategy ? "Setting…" : "Set strategy"}
          </button>
        </div>
      </div>

      {/* Add offer — attorney gate */}
      <div>
        <div className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle mb-1.5">
          Add offer <span className="text-praxium-accent-text">— Attorney gate</span>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={rung}
            onChange={(e) => setRung(e.target.value)}
            className="rounded-sm border border-praxium-line bg-transparent px-2 py-1.5 text-xs font-mono"
            data-testid={`citation-offer-rung-${citation.id}`}
          >
            {OFFER_RUNGS.map((r) => (
              <option key={r} value={r}>
                {stateLabel(r)}
              </option>
            ))}
          </select>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            className="rounded-sm border border-praxium-line bg-transparent px-2 py-1.5 text-xs font-mono"
            data-testid={`citation-offer-direction-${citation.id}`}
          >
            {OFFER_DIRECTIONS.map((d) => (
              <option key={d} value={d}>
                {stateLabel(d)}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            placeholder="Terms"
            className="rounded-sm border border-praxium-line bg-transparent px-2 py-1.5 text-xs flex-1 min-w-[8rem]"
            data-testid={`citation-offer-terms-${citation.id}`}
          />
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="rounded-sm border border-praxium-line bg-transparent px-2 py-1.5 text-xs w-28"
            data-testid={`citation-offer-amount-${citation.id}`}
          />
          <button
            type="button"
            onClick={submitOffer}
            disabled={submittingOffer}
            className="rounded-sm border border-praxium-accent px-3 py-1.5 text-xs font-bold text-praxium-accent disabled:opacity-50"
            data-testid={`citation-offer-submit-${citation.id}`}
          >
            {submittingOffer ? "Submitting…" : "Submit offer"}
          </button>
        </div>

        {citation.offers && citation.offers.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {citation.offers.map((o, i) => (
              <div
                key={i}
                className="text-xs font-mono text-praxium-subtle border border-praxium-line rounded-sm px-2 py-1.5"
              >
                <span className="text-praxium-accent-text">{stateLabel(o.direction)}</span> ·{" "}
                {stateLabel(o.rung)} · {formatMoney(o.amount)}
                {o.terms ? ` · ${o.terms}` : ""} · {formatWhen(o.date)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Citations() {
  const [citations, setCitations] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [stateFilter, setStateFilter] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback(() => {
    const params = {};
    if (stateFilter) params.state = stateFilter;
    return Promise.all([
      api.get("/citations", { params }).then((r) => setCitations(r.data.citations || [])),
      api.get("/citations/summary").then((r) => setSummary(r.data.by_state || {})),
    ]);
  }, [stateFilter]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => toast.error("Could not load citations"))
      .finally(() => setLoading(false));
  }, [load]);

  const toggleState = (state) => setStateFilter((prev) => (prev === state ? null : state));
  const toggleExpanded = (id) => setExpandedId((prev) => (prev === id ? null : id));

  if (loading) return <PageLoader label="Loading citations…" />;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl">
      <div className="overline mb-2">// citation os</div>
      <h1 className="font-display font-black text-2xl tracking-tight flex items-center gap-2">
        <Gavel className="text-praxium-accent" /> Citations
      </h1>
      <p className="text-sm text-praxium-subtle mt-2">
        Track every citation from detection through verified close — strategy and negotiation asks
        require attorney sign-off before they leave this pipeline.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {ALL_STATES.map((state) => {
          const count = summary[state] || 0;
          const active = stateFilter === state;
          return (
            <button
              key={state}
              type="button"
              onClick={() => toggleState(state)}
              className={`rounded-sm border px-3 py-2 text-left ${
                active ? "border-praxium-accent" : "border-praxium-line"
              }`}
              data-testid={`citations-summary-${state}`}
            >
              <div className="text-[9px] font-mono uppercase tracking-wider text-praxium-subtle">
                {stateLabel(state)}
              </div>
              <div className={`font-display font-black text-lg ${count > 0 ? "text-praxium-accent-text" : ""}`}>
                {count}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 space-y-3">
        {citations.length === 0 ? (
          <EmptyState title="No citations in the pipeline." testId="citations-empty" />
        ) : (
          citations.map((c) => {
            const lowConfidence = typeof c.confidence === "number" && c.confidence < LOW_CONFIDENCE_THRESHOLD;
            const expanded = expandedId === c.id;
            return (
              <div key={c.id} className="data-card p-4" data-testid={`citation-row-${c.id}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="font-semibold text-sm">{c.citation_number}</span>
                      <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 border border-praxium-line text-praxium-subtle">
                        {stateLabel(c.state)}
                      </span>
                      {lowConfidence && (
                        <span
                          className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 border border-praxium-accent text-praxium-accent flex items-center gap-1"
                          data-testid={`citation-low-confidence-${c.id}`}
                        >
                          <AlertTriangle size={10} /> Low confidence
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono text-praxium-subtle mt-1">
                      {c.issuing_agency || c.court || "—"}
                      {c.court && c.issuing_agency ? ` · ${c.court}` : ""}
                      {" · "}Deadline {formatWhen(c.response_deadline)}
                      {" · "}
                      {formatMoney(c.fine_amount)}
                    </div>
                    {c.violation_desc && (
                      <div className="mt-2 text-xs text-praxium-subtle leading-relaxed">
                        {c.violation_desc}
                      </div>
                    )}
                    {c.strategy && (
                      <div className="mt-2 text-xs font-mono text-praxium-subtle">
                        <span className="text-praxium-subtle">strategy:</span> {c.strategy}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleExpanded(c.id)}
                    className="shrink-0 rounded-sm border border-praxium-line px-2 py-1.5 text-xs font-semibold text-praxium-subtle flex items-center gap-1"
                    data-testid={`citation-toggle-${c.id}`}
                  >
                    {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    Actions
                  </button>
                </div>

                {expanded && <CitationActions citation={c} onDone={load} />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
