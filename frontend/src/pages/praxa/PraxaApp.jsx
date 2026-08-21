import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { streamAiChat } from "@/lib/api";
import {
  BookOpen,
  MessageCircle,
  ShieldCheck,
  Send,
  Loader2,
  Heart,
  Download,
  Trash2,
  User,
  LogOut,
  Camera,
  Check,
  Calculator,
} from "lucide-react";

const SYMPTOMS = [
  { id: "neck", label: "Neck" },
  { id: "back", label: "Back" },
  { id: "headache", label: "Headache" },
  { id: "shoulder", label: "Shoulder" },
  { id: "knee", label: "Knee" },
  { id: "hip", label: "Hip" },
  { id: "sleep", label: "Sleep issues" },
  { id: "anxiety", label: "Anxiety" },
  { id: "numbness", label: "Numbness" },
  { id: "dizziness", label: "Dizziness" },
  { id: "other", label: "Other" },
];

const SPECIALTIES = [
  { id: "general", label: "General / not sure" },
  { id: "ortho", label: "Orthopedics" },
  { id: "pt", label: "Physical therapy" },
  { id: "chiro", label: "Chiropractic" },
  { id: "imaging", label: "Imaging / MRI" },
  { id: "mental", label: "Mental health" },
];

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("praxa_token")}` };
}

function timeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

function logout(nav) {
  localStorage.removeItem("praxa_token");
  localStorage.removeItem("praxa_user");
  nav("/praxa");
}

export default function PraxaApp() {
  const nav = useNavigate();
  const [tab, setTab] = useState("home");
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const u = localStorage.getItem("praxa_user");
    const t = localStorage.getItem("praxa_token");
    if (!u || !t) {
      nav("/praxa/signup");
      return;
    }
    setUser(JSON.parse(u));
    setReady(true);
    api
      .get("/praxa/me", { headers: authHeaders() })
      .then((r) => {
        if (r.data?.user) {
          setUser(r.data.user);
          localStorage.setItem("praxa_user", JSON.stringify(r.data.user));
        }
      })
      .catch(() => {});
  }, [nav]);

  if (!ready || !user) {
    return (
      <div className="min-h-screen bg-praxa-bg flex items-center justify-center text-praxa-subtle text-sm">
        <Loader2 className="animate-spin mr-2" size={16} /> Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-praxa-bg praxa-surface text-praxa-ink pb-24">
      <header className="sticky top-0 z-40 bg-praxa-bg/80 backdrop-blur-xl border-b border-praxa-line">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between">
          <Link to="/praxa" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-praxa-accent flex items-center justify-center text-white text-sm font-bold">
              π
            </div>
            <span className="font-semibold tracking-tight">
              Praxa{" "}
              <span className="text-praxa-sage text-[10px] font-normal ml-0.5 uppercase tracking-widest">
                HQ
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setTab("account")}
            className="text-xs text-praxa-sage hover:text-praxa-ink"
            data-testid="praxa-open-account"
          >
            Hi, {user.name?.split(" ")[0] || "there"}
          </button>
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 py-6">
        {tab === "home" && <HomeTab user={user} onGo={setTab} />}
        {tab === "journal" && <JournalTab />}
        {tab === "coach" && <CoachTab />}
        {tab === "estimate" && <EstimateTab />}
        {tab === "providers" && <DoctorsTab />}
        {tab === "account" && (
          <AccountTab user={user} setUser={setUser} onLogout={() => logout(nav)} />
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-praxa-line z-40">
        <div className="max-w-md mx-auto grid grid-cols-6">
          {[
            { id: "home", icon: Heart, label: "Home" },
            { id: "journal", icon: BookOpen, label: "Journal" },
            { id: "coach", icon: MessageCircle, label: "Coach" },
            { id: "estimate", icon: Calculator, label: "Estimate" },
            { id: "providers", icon: ShieldCheck, label: "Doctors" },
            { id: "account", icon: User, label: "Account" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              data-testid={`praxa-tab-${t.id}`}
              className={`flex flex-col items-center gap-1 py-3 ${
                tab === t.id ? "text-praxa-accent" : "text-praxa-subtle"
              }`}
            >
              <t.icon size={16} />
              <span className="text-[9px] uppercase tracking-widest">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function HomeTab({ user, onGo }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs uppercase tracking-widest text-praxa-sage">Today</div>
        <h1 className="text-3xl font-light mt-1">Good {timeOfDay()}.</h1>
        <p className="text-sm text-praxa-subtle mt-1">
          {user.name?.split(" ")[0]}, keep a real record — not a tough face.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-praxa-line">
        <div className="text-xs uppercase tracking-widest text-praxa-sage">Today&apos;s check-in</div>
        <div className="mt-2 text-xl font-semibold">How are you feeling?</div>
        <p className="text-sm text-praxa-subtle mt-1">
          Pain, sleep, what you couldn&apos;t do. Future-you will thank present-you.
        </p>
        <button
          type="button"
          onClick={() => onGo("journal")}
          data-testid="praxa-quick-log"
          className="mt-4 bg-praxa-accent text-white px-5 py-2.5 rounded-full text-sm font-medium"
        >
          Log today →
        </button>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-praxa-line">
        <div className="text-xs uppercase tracking-widest text-praxa-sage">Insurance rule #1</div>
        <div className="mt-2 text-xl font-semibold leading-tight">Be accurate. Not strong.</div>
        <p className="text-sm text-praxa-subtle mt-2">
          When the adjuster asks &ldquo;How are you?&rdquo; — describe what hurts. Don&apos;t say
          &ldquo;I&apos;m fine&rdquo; to be polite.
        </p>
      </div>

      <div className="bg-praxa-ink text-white rounded-3xl p-6">
        <div className="text-xs uppercase tracking-widest text-white/60">Ask your coach</div>
        <div className="mt-2 text-lg font-semibold">
          &ldquo;They want a recorded statement. What do I do?&rdquo;
        </div>
        <button
          type="button"
          onClick={() => onGo("coach")}
          className="mt-3 text-sm text-praxa-accent"
        >
          Ask coach →
        </button>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-praxa-line">
        <div className="text-xs uppercase tracking-widest text-praxa-sage">Educational range</div>
        <div className="mt-2 font-semibold">Settlement estimator</div>
        <p className="text-sm text-praxa-subtle mt-1">
          Wide educational bands only — not what your case is worth.
        </p>
        <button
          type="button"
          onClick={() => onGo("estimate")}
          className="mt-3 text-sm text-praxa-accent font-medium"
        >
          Run estimate →
        </button>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-praxa-line">
        <div className="text-xs uppercase tracking-widest text-praxa-sage">Need care?</div>
        <div className="mt-2 font-semibold">Request a doctor match</div>
        <p className="text-sm text-praxa-subtle mt-1">
          Tell us your ZIP and specialty. A coordinator follows up — not a fake instant list.
        </p>
        <button
          type="button"
          onClick={() => onGo("providers")}
          className="mt-3 text-sm text-praxa-accent font-medium"
        >
          Request match →
        </button>
      </div>
    </div>
  );
}

function JournalTab() {
  const [entries, setEntries] = useState([]);
  const [painLevel, setPainLevel] = useState(5);
  const [notes, setNotes] = useState("");
  const [symptoms, setSymptoms] = useState([]);
  const [sleep, setSleep] = useState(null);
  const [activities, setActivities] = useState("");
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);

  const load = useCallback(() => {
    api
      .get("/praxa/journal", { headers: authHeaders() })
      .then((r) => setEntries(r.data || []))
      .catch(() => setEntries([]));
  }, []);

  useEffect(load, [load]);

  const toggleSymptom = (id) => {
    setSymptoms((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const onPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErr("Choose an image file");
      return;
    }
    if (file.size > 150_000) {
      setErr("Photo must be under ~150KB — try a smaller photo");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(String(reader.result));
      setErr("");
    };
    reader.readAsDataURL(file);
  };

  const log = async () => {
    setSaving(true);
    setErr("");
    try {
      await api.post(
        "/praxa/journal",
        {
          pain_level: painLevel,
          notes,
          symptoms,
          sleep_quality: sleep,
          activities_affected: activities,
          photo_data_url: photo || undefined,
        },
        { headers: authHeaders() },
      );
      setNotes("");
      setSymptoms([]);
      setSleep(null);
      setActivities("");
      setPhoto(null);
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Could not save entry");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this journal entry?")) return;
    await api.delete(`/praxa/journal/${id}`, { headers: authHeaders() });
    load();
  };

  const exportCsv = async () => {
    const res = await api.get("/praxa/journal/export.csv", {
      headers: authHeaders(),
      responseType: "blob",
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = "praxa-journal.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-light">Journal</h1>
        <button
          type="button"
          onClick={exportCsv}
          className="text-xs flex items-center gap-1 text-praxa-sage hover:text-praxa-ink"
          data-testid="journal-export"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-praxa-line space-y-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-praxa-sage">Pain level (0–10)</div>
          <div className="mt-3 grid grid-cols-11 gap-1">
            {Array.from({ length: 11 }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPainLevel(i)}
                data-testid={`pain-${i}`}
                className={`h-9 rounded-md text-xs font-mono ${
                  i <= painLevel ? "bg-praxa-accent text-white" : "bg-praxa-line text-praxa-subtle"
                }`}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest text-praxa-sage mb-2">Symptoms</div>
          <div className="flex flex-wrap gap-1.5">
            {SYMPTOMS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSymptom(s.id)}
                className={`text-xs px-2.5 py-1.5 rounded-full border ${
                  symptoms.includes(s.id)
                    ? "bg-praxa-accent text-white border-praxa-accent"
                    : "border-praxa-line text-praxa-subtle"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest text-praxa-sage mb-2">Sleep (1–5)</div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSleep(n)}
                className={`flex-1 h-9 rounded-md text-sm ${
                  sleep === n ? "bg-praxa-ink text-white" : "bg-praxa-line text-praxa-subtle"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <input
          value={activities}
          onChange={(e) => setActivities(e.target.value)}
          placeholder="Activities you couldn't do today"
          className="w-full px-4 py-3 border border-praxa-line rounded-xl text-sm outline-none focus:border-praxa-accent"
          data-testid="journal-activities"
        />

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="What's going on today?"
          data-testid="journal-notes"
          className="w-full px-4 py-3 border border-praxa-line rounded-xl text-sm outline-none focus:border-praxa-accent"
        />

        <div className="flex items-center gap-3">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-sm flex items-center gap-1.5 text-praxa-sage border border-praxa-line px-3 py-2 rounded-full"
          >
            <Camera size={14} /> {photo ? "Photo attached" : "Add photo"}
          </button>
          {photo && (
            <button type="button" onClick={() => setPhoto(null)} className="text-xs text-praxa-subtle">
              Remove
            </button>
          )}
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <button
          type="button"
          onClick={log}
          disabled={saving}
          data-testid="journal-log"
          className="bg-praxa-accent text-white px-5 py-2.5 rounded-full text-sm font-medium disabled:opacity-60"
        >
          {saving ? "Saving…" : "Log entry"}
        </button>
      </div>

      <div className="space-y-2">
        {entries.length === 0 && (
          <p className="text-sm text-praxa-subtle text-center py-6">No entries yet. Log today.</p>
        )}
        {entries.map((e) => (
          <div
            key={e.id}
            className="bg-white border border-praxa-line p-4 rounded-2xl"
            data-testid={`entry-${e.id}`}
          >
            <div className="flex justify-between items-start gap-2">
              <div>
                <span className="text-xs uppercase tracking-widest text-praxa-sage">
                  {new Date(e.created_at).toLocaleString()}
                </span>
                <div className="font-mono text-sm mt-0.5">
                  Pain {e.pain_level}/10
                  {e.sleep_quality != null ? ` · Sleep ${e.sleep_quality}/5` : ""}
                  {e.has_photo ? " · 📷" : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(e.id)}
                className="text-praxa-subtle hover:text-red-600 p-1"
                aria-label="Delete entry"
              >
                <Trash2 size={14} />
              </button>
            </div>
            {(e.symptoms || []).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {e.symptoms.map((s) => (
                  <span
                    key={s}
                    className="text-[10px] uppercase tracking-wider bg-praxa-bg border border-praxa-line px-2 py-0.5 rounded-full"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
            {e.activities_affected && (
              <p className="mt-2 text-sm text-praxa-subtle">Couldn&apos;t: {e.activities_affected}</p>
            )}
            {e.notes && <p className="mt-2 text-sm">{e.notes}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function CoachTab() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sid, setSid] = useState(null);
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text) => {
    if (!text.trim() || streaming) return;
    setMessages((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);
    try {
      await streamAiChat({
        isPraxa: true,
        message: text,
        sessionId: sid,
        onChunk: (_, full) =>
          setMessages((m) => {
            const c = [...m];
            c[c.length - 1] = { role: "assistant", content: full };
            return c;
          }),
        onDone: (_, s) => setSid(s),
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      <h1 className="text-3xl font-light mb-1">Insurance Coach</h1>
      <p className="text-xs text-praxa-subtle mb-3">
        General information only — not legal advice for your case.
      </p>
      <div className="flex-1 overflow-y-auto space-y-3 pb-3">
        {messages.length === 0 && (
          <div className="bg-white border border-praxa-line rounded-2xl p-5">
            <div className="text-sm text-praxa-subtle">
              Ask about adjuster calls, releases, deadlines, or scary letters. I&apos;ll give you the
              playbook — then point you to a licensed attorney for case-specific advice.
            </div>
            <div className="mt-3 space-y-1.5">
              {[
                "What do I say if they call?",
                "Should I sign their release?",
                "How long do I have to file?",
              ].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  data-testid={`coach-quick-${q.slice(0, 10)}`}
                  className="w-full text-left px-3 py-2 text-sm bg-praxa-bg rounded-xl"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-praxa-accent text-white"
                  : "bg-white border border-praxa-line"
              }`}
            >
              {m.content ||
                (streaming && i === messages.length - 1 ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  ""
                ))}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="flex gap-2 sticky bottom-20">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder="Ask anything..."
          data-testid="coach-input"
          className="flex-1 px-4 py-2.5 border border-praxa-line rounded-full text-sm outline-none focus:border-praxa-accent bg-white"
        />
        <button
          type="button"
          onClick={() => send(input)}
          disabled={!input.trim() || streaming}
          data-testid="coach-send"
          className="bg-praxa-accent text-white w-10 h-10 rounded-full flex items-center justify-center"
        >
          {streaming ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
        </button>
      </div>
    </div>
  );
}

const INJURY_LABELS = {
  soft_tissue: "Soft tissue",
  fracture: "Fracture",
  disc: "Disc",
  surgery: "Surgery",
  catastrophic: "Catastrophic",
};

const MATCH_STATUS_LABELS = {
  queued: "Queued — we'll follow up",
  contacted: "We're reaching out",
  matched: "Options shared",
  closed: "Closed",
  declined: "Couldn't match",
};

function EstimateTab() {
  const [injury, setInjury] = useState("soft_tissue");
  const [severity, setSeverity] = useState(3);
  const [treatment, setTreatment] = useState("conservative");
  const [liability, setLiability] = useState("unclear");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const money = (n) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  const loadHistory = useCallback(() => {
    api
      .get("/praxa/settlement-estimate", { headers: authHeaders() })
      .then((r) => setHistory(Array.isArray(r.data) ? r.data : []))
      .catch(() => setHistory([]));
  }, []);

  useEffect(loadHistory, [loadHistory]);

  const run = async () => {
    setSaving(true);
    setErr("");
    try {
      const r = await api.post(
        "/praxa/settlement-estimate",
        {
          injury_category: injury,
          severity,
          treatment,
          liability,
          state: "CA",
        },
        { headers: authHeaders() },
      );
      setResult(r.data);
      loadHistory();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Could not run estimate");
      setResult(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-light">Settlement estimator</h1>
      <p className="text-sm text-praxa-subtle">
        Educational ranges only. Not a valuation of your case. Not legal advice.
      </p>

      <div className="bg-white rounded-3xl p-6 border border-praxa-line space-y-4">
        <div>
          <label className="text-xs uppercase tracking-widest text-praxa-sage">Injury category</label>
          <select
            value={injury}
            onChange={(e) => setInjury(e.target.value)}
            className="mt-1 w-full px-4 py-3 border border-praxa-line rounded-xl text-sm bg-white"
            data-testid="estimate-injury"
          >
            <option value="soft_tissue">Soft tissue / sprain-strain</option>
            <option value="fracture">Fracture</option>
            <option value="disc">Disc injury</option>
            <option value="surgery">Surgery indicated / done</option>
            <option value="catastrophic">Catastrophic / TBI / paralysis</option>
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-praxa-sage">
            Severity within category (1–5)
          </label>
          <div className="mt-2 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSeverity(n)}
                className={`flex-1 h-9 rounded-md text-sm ${
                  severity === n ? "bg-praxa-accent text-white" : "bg-praxa-line text-praxa-subtle"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-praxa-sage">Treatment so far</label>
          <select
            value={treatment}
            onChange={(e) => setTreatment(e.target.value)}
            className="mt-1 w-full px-4 py-3 border border-praxa-line rounded-xl text-sm bg-white"
            data-testid="estimate-treatment"
          >
            <option value="none">Little / none yet</option>
            <option value="conservative">Conservative care (PT, meds)</option>
            <option value="ongoing">Ongoing specialist care</option>
            <option value="surgery_done">Surgery completed</option>
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-praxa-sage">Liability clarity</label>
          <select
            value={liability}
            onChange={(e) => setLiability(e.target.value)}
            className="mt-1 w-full px-4 py-3 border border-praxa-line rounded-xl text-sm bg-white"
            data-testid="estimate-liability"
          >
            <option value="disputed">Disputed / shared fault</option>
            <option value="unclear">Unclear</option>
            <option value="clear">Clear other-party fault</option>
          </select>
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button
          type="button"
          onClick={run}
          disabled={saving}
          data-testid="estimate-run"
          className="bg-praxa-accent text-white px-5 py-2.5 rounded-full text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Calculating…" : "Show educational range"}
        </button>
      </div>

      {result && (
        <div className="bg-praxa-ink text-white rounded-3xl p-6 space-y-3" data-testid="estimate-result">
          <div className="text-xs uppercase tracking-widest text-white/50">Illustrative band</div>
          <div className="text-2xl font-light tabular">
            {money(result.band.low)} – {money(result.band.high)}
          </div>
          <div className="text-sm text-white/70">
            Midpoint of this exercise: <span className="text-white font-medium">{money(result.band.mid)}</span>
          </div>
          <p className="text-xs text-white/55 leading-relaxed border-t border-white/10 pt-3">
            {result.disclaimer}
          </p>
          <p className="text-[11px] text-white/40">{result.methodology}</p>
          <ul className="text-xs text-white/70 space-y-1">
            {(result.next_steps || []).map((s) => (
              <li key={s}>· {s}</li>
            ))}
          </ul>
          <a
            href="https://www.goldmedalinjury.com/free-consultation"
            className="inline-block mt-2 text-sm text-praxa-accent"
          >
            Free case review →
          </a>
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-2" data-testid="estimate-history">
          <div className="text-xs uppercase tracking-widest text-praxa-sage">Past runs</div>
          {history.map((h) => (
            <div
              key={h.id}
              className="bg-white border border-praxa-line rounded-2xl p-4 text-sm flex justify-between gap-3"
            >
              <div>
                <div className="font-medium">
                  {INJURY_LABELS[h.inputs?.injury_category] || h.inputs?.injury_category} · sev{" "}
                  {h.inputs?.severity}
                </div>
                <div className="text-xs text-praxa-subtle mt-0.5">
                  {h.created_at ? new Date(h.created_at).toLocaleString() : ""}
                </div>
              </div>
              <div className="text-right tabular text-praxa-ink shrink-0">
                {money(h.band?.low)} – {money(h.band?.high)}
              </div>
            </div>
          ))}
          <p className="text-[11px] text-praxa-subtle">Educational only — not a case valuation.</p>
        </div>
      )}
    </div>
  );
}

function DoctorsTab() {
  const [zip, setZip] = useState("");
  const [specialty, setSpecialty] = useState("general");
  const [notes, setNotes] = useState("");
  const [preferLop, setPreferLop] = useState(true);
  const [requests, setRequests] = useState([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api
      .get("/praxa/doctor-match", { headers: authHeaders() })
      .then((r) => setRequests(r.data || []))
      .catch(() => setRequests([]));
  }, []);

  useEffect(load, [load]);

  const submit = async () => {
    setSaving(true);
    setErr("");
    setMsg("");
    try {
      const r = await api.post(
        "/praxa/doctor-match",
        { zip_code: zip, specialty, notes, prefer_lop: preferLop },
        { headers: authHeaders() },
      );
      setMsg(r.data?.message || "Request received.");
      setZip("");
      setNotes("");
      load();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Could not submit request");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-light">Doctor match</h1>
      <p className="text-sm text-praxa-subtle">
        We don&apos;t show a fake directory. Submit your ZIP and needs — a coordinator follows up with
        vetted options, including Letter of Protection where available.
      </p>

      <div className="bg-white rounded-3xl p-6 border border-praxa-line space-y-4">
        <div>
          <label className="text-xs uppercase tracking-widest text-praxa-sage">ZIP code</label>
          <input
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            inputMode="numeric"
            placeholder="92101"
            data-testid="doctor-zip"
            className="mt-1 w-full px-4 py-3 border border-praxa-line rounded-xl text-sm outline-none focus:border-praxa-accent"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-praxa-sage">Specialty</label>
          <select
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="mt-1 w-full px-4 py-3 border border-praxa-line rounded-xl text-sm bg-white outline-none focus:border-praxa-accent"
            data-testid="doctor-specialty"
          >
            {SPECIALTIES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Injuries, preferred language, insurance situation…"
          className="w-full px-4 py-3 border border-praxa-line rounded-xl text-sm outline-none focus:border-praxa-accent"
          data-testid="doctor-notes"
        />
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={preferLop}
            onChange={(e) => setPreferLop(e.target.checked)}
            className="rounded border-praxa-line"
          />
          Prefer providers who accept Letter of Protection
        </label>
        {err && <p className="text-sm text-red-600">{err}</p>}
        {msg && (
          <p className="text-sm text-praxa-sage flex items-start gap-2">
            <Check size={16} className="shrink-0 mt-0.5" /> {msg}
          </p>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={saving || zip.replace(/\D/g, "").length < 5}
          data-testid="doctor-match-submit"
          className="bg-praxa-accent text-white px-5 py-2.5 rounded-full text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Sending…" : "Request match"}
        </button>
      </div>

      {requests.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-widest text-praxa-sage">Your requests</div>
          {requests.map((r) => (
            <div
              key={r.id}
              className="bg-white border border-praxa-line rounded-2xl p-4 text-sm"
              data-testid={`match-req-${r.id}`}
            >
              <div className="flex justify-between gap-2">
                <span className="font-medium">
                  ZIP {r.zip_code} · {r.specialty}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-praxa-sage text-right max-w-[45%]">
                  {MATCH_STATUS_LABELS[r.status] || r.status}
                </span>
              </div>
              <div className="text-xs text-praxa-subtle mt-1">
                {new Date(r.created_at).toLocaleString()}
                {r.prefer_lop ? " · LOP preferred" : ""}
              </div>
              {r.notes && <p className="mt-2 text-praxa-subtle">{r.notes}</p>}
              {r.consumer_message && (
                <p className="mt-2 text-sm text-praxa-ink border-t border-praxa-line pt-2">
                  Update: {r.consumer_message}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AccountTab({ user, setUser, onLogout }) {
  const [name, setName] = useState(user.name || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [incident, setIncident] = useState(user.incident_date || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const save = async () => {
    setSaving(true);
    setMsg("");
    try {
      const r = await api.patch(
        "/praxa/me",
        { name, phone, incident_date: incident || undefined },
        { headers: authHeaders() },
      );
      if (r.data?.user) {
        setUser(r.data.user);
        localStorage.setItem("praxa_user", JSON.stringify(r.data.user));
      }
      setMsg("Saved.");
    } catch (e) {
      setMsg(e?.response?.data?.detail || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const exportAll = async () => {
    const r = await api.get("/praxa/export.json", { headers: authHeaders() });
    const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "praxa-export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-light">Account</h1>
      <div className="bg-white rounded-3xl p-6 border border-praxa-line space-y-3">
        <div className="text-xs text-praxa-subtle">{user.email}</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="w-full px-4 py-3 border border-praxa-line rounded-xl text-sm outline-none focus:border-praxa-accent"
          data-testid="account-name"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone"
          className="w-full px-4 py-3 border border-praxa-line rounded-xl text-sm outline-none focus:border-praxa-accent"
        />
        <input
          type="date"
          value={incident}
          onChange={(e) => setIncident(e.target.value)}
          className="w-full px-4 py-3 border border-praxa-line rounded-xl text-sm outline-none focus:border-praxa-accent"
        />
        {msg && <p className="text-sm text-praxa-sage">{msg}</p>}
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="bg-praxa-ink text-white px-5 py-2.5 rounded-full text-sm font-medium"
          data-testid="account-save"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>

      <button
        type="button"
        onClick={exportAll}
        className="w-full flex items-center justify-center gap-2 bg-white border border-praxa-line rounded-2xl py-3 text-sm"
        data-testid="account-export"
      >
        <Download size={14} /> Download my data (JSON)
      </button>

      <p className="text-[11px] text-praxa-subtle leading-relaxed">
        Praxa provides legal information, not legal advice. For advice about your case, talk to a
        licensed attorney.{" "}
        <a href="https://www.goldmedalinjury.com/free-consultation" className="text-praxa-sage underline">
          Free case review →
        </a>
      </p>

      <button
        type="button"
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 text-sm text-praxa-subtle py-3"
        data-testid="account-logout"
      >
        <LogOut size={14} /> Sign out
      </button>
    </div>
  );
}
