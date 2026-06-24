import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { streamAiChat } from "@/lib/api";
import { BookOpen, MessageCircle, ShieldCheck, Phone, Send, Loader2, Heart } from "lucide-react";

export default function PraxaApp() {
  const nav = useNavigate();
  const [tab, setTab] = useState("home");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const u = localStorage.getItem("praxa_user");
    const t = localStorage.getItem("praxa_token");
    if (!u || !t) { nav("/praxa/signup"); return; }
    setUser(JSON.parse(u));
  }, []);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-praxa-bg praxa-surface text-praxa-ink pb-20">
      {/* Top */}
      <header className="sticky top-0 z-40 bg-praxa-bg/80 backdrop-blur-xl border-b border-praxa-line">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between">
          <Link to="/praxa" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-praxa-accent flex items-center justify-center text-white text-sm font-bold">π</div>
            <span className="font-semibold tracking-tight">Praxa</span>
          </Link>
          <div className="text-xs text-praxa-sage">Hi, {user.name?.split(" ")[0]}</div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 py-6">
        {tab === "home" && <HomeTab user={user} />}
        {tab === "journal" && <JournalTab />}
        {tab === "coach" && <CoachTab />}
        {tab === "providers" && <ProvidersTab />}
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-praxa-line">
        <div className="max-w-md mx-auto grid grid-cols-4">
          {[
            { id: "home", icon: Heart, label: "Home" },
            { id: "journal", icon: BookOpen, label: "Journal" },
            { id: "coach", icon: MessageCircle, label: "Coach" },
            { id: "providers", icon: ShieldCheck, label: "Doctors" },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} data-testid={`praxa-tab-${t.id}`}
              className={`flex flex-col items-center gap-1 py-3 ${tab === t.id ? "text-praxa-accent" : "text-praxa-subtle"}`}>
              <t.icon size={18} />
              <span className="text-[10px] uppercase tracking-widest">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function HomeTab({ user }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs uppercase tracking-widest text-praxa-sage">Today</div>
        <h1 className="text-3xl font-light mt-1">Good {timeOfDay()}.</h1>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-praxa-line">
        <div className="text-xs uppercase tracking-widest text-praxa-sage">Today's check-in</div>
        <div className="mt-2 text-xl font-semibold">How are you feeling?</div>
        <p className="text-sm text-praxa-subtle mt-1">Be honest. Future-you will thank present-you.</p>
        <button onClick={() => document.querySelector("[data-testid='praxa-tab-journal']")?.click()} data-testid="praxa-quick-log"
          className="mt-4 bg-praxa-accent text-white px-5 py-2.5 rounded-full text-sm font-medium">Log today →</button>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-praxa-line">
        <div className="text-xs uppercase tracking-widest text-praxa-sage">Insurance rule #1</div>
        <div className="mt-2 text-xl font-semibold leading-tight">Be accurate. Not strong.</div>
        <p className="text-sm text-praxa-subtle mt-2">When the adjuster asks "How are you?" — describe what hurts. Don't say "I'm fine" to be polite.</p>
      </div>

      <div className="bg-praxa-ink text-white rounded-3xl p-6">
        <div className="text-xs uppercase tracking-widest text-white/60">Ask your coach</div>
        <div className="mt-2 text-lg font-semibold">"They want a recorded statement. What do I do?"</div>
        <button onClick={() => document.querySelector("[data-testid='praxa-tab-coach']")?.click()} className="mt-3 text-sm text-praxa-accent flex items-center gap-1">
          Ask coach →
        </button>
      </div>
    </div>
  );
}

function timeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

function JournalTab() {
  const [entries, setEntries] = useState([]);
  const [painLevel, setPainLevel] = useState(5);
  const [notes, setNotes] = useState("");

  const load = () => api.get("/praxa/journal", { headers: { Authorization: `Bearer ${localStorage.getItem("praxa_token")}` } }).then((r) => setEntries(r.data));
  useEffect(load, []);

  const log = async () => {
    await api.post("/praxa/journal", { pain_level: painLevel, notes }, { headers: { Authorization: `Bearer ${localStorage.getItem("praxa_token")}` } });
    setNotes("");
    load();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-light">Journal</h1>
      <div className="bg-white rounded-3xl p-6 border border-praxa-line">
        <div className="text-xs uppercase tracking-widest text-praxa-sage">Pain level today</div>
        <div className="mt-3 grid grid-cols-10 gap-1">
          {Array.from({ length: 10 }, (_, i) => (
            <button key={i} onClick={() => setPainLevel(i + 1)} data-testid={`pain-${i + 1}`}
              className={`h-10 rounded-md text-sm font-mono ${i < painLevel ? "bg-praxa-accent text-white" : "bg-praxa-line text-praxa-subtle"}`}>{i + 1}</button>
          ))}
        </div>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="What's going on today?"
          data-testid="journal-notes" className="mt-4 w-full px-4 py-3 border border-praxa-line rounded-xl text-sm outline-none focus:border-praxa-accent" />
        <button onClick={log} data-testid="journal-log" className="mt-3 bg-praxa-accent text-white px-5 py-2.5 rounded-full text-sm font-medium">Log entry</button>
      </div>
      <div className="space-y-2">
        {entries.map((e) => (
          <div key={e.id} className="bg-white border border-praxa-line p-4 rounded-2xl" data-testid={`entry-${e.id}`}>
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase tracking-widest text-praxa-sage">{new Date(e.created_at).toLocaleDateString()}</span>
              <span className="font-mono text-sm">{e.pain_level}/10</span>
            </div>
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
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (text) => {
    if (!text.trim() || streaming) return;
    setMessages((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);
    try {
      await streamAiChat({
        isPraxa: true, message: text, sessionId: sid,
        onChunk: (_, full) => setMessages((m) => { const c = [...m]; c[c.length - 1] = { role: "assistant", content: full }; return c; }),
        onDone: (_, s) => setSid(s),
      });
    } finally { setStreaming(false); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      <h1 className="text-3xl font-light mb-3">Insurance Coach</h1>
      <div className="flex-1 overflow-y-auto space-y-3 pb-3">
        {messages.length === 0 && (
          <div className="bg-white border border-praxa-line rounded-2xl p-5">
            <div className="text-sm text-praxa-subtle">Hey. I'm your coach. Ask me anything about your insurance situation. I'll give you the playbook — not legal advice.</div>
            <div className="mt-3 space-y-1.5">
              {["What do I say if they call?", "Should I sign their release?", "How long do I have to file?"].map((q) => (
                <button key={q} onClick={() => send(q)} data-testid={`coach-quick-${q.slice(0, 10)}`}
                  className="w-full text-left px-3 py-2 text-sm bg-praxa-bg rounded-xl">{q}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-praxa-accent text-white" : "bg-white border border-praxa-line"}`}>
              {m.content || (streaming && i === messages.length - 1 ? <Loader2 className="animate-spin" size={14} /> : "")}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="flex gap-2 sticky bottom-20">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder="Ask anything..." data-testid="coach-input"
          className="flex-1 px-4 py-2.5 border border-praxa-line rounded-full text-sm outline-none focus:border-praxa-accent bg-white" />
        <button onClick={() => send(input)} disabled={!input.trim() || streaming} data-testid="coach-send"
          className="bg-praxa-accent text-white w-10 h-10 rounded-full flex items-center justify-center">
          {streaming ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
        </button>
      </div>
    </div>
  );
}

function ProvidersTab() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-light">Doctor Network</h1>
      <p className="text-sm text-praxa-subtle">Vetted providers near you who treat now, bill the settlement (Letter of Protection).</p>
      <div className="space-y-2">
        {[
          { name: "Dr. M. Patel, MD", spec: "Orthopedic", dist: "1.2 mi", lop: true },
          { name: "Coastal PT", spec: "Physical Therapy", dist: "2.4 mi", lop: true },
          { name: "Spine MRI Center", spec: "Imaging", dist: "3.1 mi", lop: true },
        ].map((p) => (
          <div key={p.name} className="bg-white rounded-2xl p-4 border border-praxa-line" data-testid={`provider-card-${p.name.slice(0, 6)}`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-praxa-subtle">{p.spec} · {p.dist}</div>
              </div>
              {p.lop && <span className="text-[10px] uppercase tracking-widest bg-praxa-sage text-white px-2 py-0.5 rounded-full">LOP</span>}
            </div>
            <button className="mt-3 text-sm text-praxa-accent flex items-center gap-1"><Phone size={12} /> Book →</button>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-praxa-subtle">Network is curated by outcomes, not paid placement. No referral kickbacks.</p>
    </div>
  );
}
