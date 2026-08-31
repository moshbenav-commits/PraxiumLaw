import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import PageLoader from "@/components/common/PageLoader";
import { GraduationCap, BookOpen, AlertTriangle, FileWarning, Search, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const PRIORITY_STYLE = {
  P0: "bg-red-100 text-red-800 border-red-200",
  P1: "bg-amber-100 text-amber-900 border-amber-200",
  P2: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

export default function TrainingHub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState(null);
  const [gaps, setGaps] = useState([]);
  const [tab, setTab] = useState("guides");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/training/catalog"), api.get("/training/ux-gaps")])
      .then(([cat, gx]) => {
        setCatalog(cat.data);
        setGaps(gx.data.gaps || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const filterList = (items) => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (it) =>
        it.title.toLowerCase().includes(q) ||
        it.slug.toLowerCase().includes(q) ||
        (it.summary || "").toLowerCase().includes(q),
    );
  };

  if (loading) return <PageLoader label="Loading training…" />;

  const guides = filterList(catalog?.guides || []);
  const articles = filterList(catalog?.articles || []);
  const p0 = gaps.filter((g) => g.priority === "P0").length;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-5xl" data-testid="training-hub">
      <div className="overline mb-2">// training & help</div>
      <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tight flex items-center gap-3">
        <GraduationCap className="text-praxium-accent shrink-0" /> PI Training Center
      </h1>
      <p className="mt-2 text-sm text-praxium-subtle max-w-2xl">
        Role guides and knowledge articles for {user?.role} staff. Operational education only — not legal advice.
        {" "}
        <Link to="/training/doc/disclosure" className="text-praxium-accent-text hover:underline">Read disclosure</Link>
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link to="/settings/templates" className="btn-ghost text-sm" data-testid="training-templates-link">
          Template library
        </Link>
        <Link to="/training/intake-checklist" className="btn-ghost text-sm" data-testid="training-checklist-link">
          Intake packet checklist
        </Link>
      </div>

      {p0 > 0 && (
        <button
          type="button"
          onClick={() => setTab("gaps")}
          className="mt-4 w-full text-left data-card p-4 border-l-4 border-l-amber-500 hover:border-l-praxium-accent transition-colors"
          data-testid="training-gaps-banner"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
            <div>
              <div className="font-semibold text-sm">{p0} critical UI gaps vs training (P0)</div>
              <div className="text-xs text-praxium-subtle mt-1">
                Training describes workflows the app does not fully support yet. Review workarounds before go-live.
              </div>
            </div>
            <ChevronRight className="ml-auto shrink-0 text-praxium-subtle" size={16} />
          </div>
        </button>
      )}

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-praxium-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search guides and articles…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-praxium-line rounded-sm outline-none focus:border-praxium-accent"
            data-testid="training-search"
          />
        </div>
      </div>

      <div className="mt-4 flex gap-1 border-b border-praxium-line overflow-x-auto">
        {[
          { id: "guides", label: "Your guides", count: guides.length },
          { id: "articles", label: "Articles", count: articles.length },
          { id: "gaps", label: "UI / UX gaps", count: gaps.length },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            data-testid={`training-tab-${t.id}`}
            className={cn(
              "px-4 py-2 text-xs font-mono uppercase tracking-wider whitespace-nowrap border-b-2 -mb-px transition-colors",
              tab === t.id ? "border-praxium-accent text-praxium-accent-text" : "border-transparent text-praxium-subtle hover:text-praxium-ink",
            )}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {tab === "guides" && (
        <div className="mt-4 space-y-2">
          {guides.map((g) => (
            <Link
              key={g.slug}
              to={`/training/guide/${g.slug}`}
              className="block data-card p-4 hover:border-praxium-accent/40 transition-colors"
              data-testid={`training-guide-${g.slug}`}
            >
              <div className="font-semibold text-sm">{g.title}</div>
              {g.summary && <div className="text-xs text-praxium-subtle mt-1">{g.summary}</div>}
            </Link>
          ))}
          {guides.length === 0 && <div className="text-sm text-praxium-subtle py-8 text-center">No guides match your search.</div>}
        </div>
      )}

      {tab === "articles" && (
        <div className="mt-4 space-y-2">
          {articles.map((a) => (
            <Link
              key={a.slug}
              to={`/training/article/${a.slug}`}
              className="block data-card p-4 hover:border-praxium-accent/40 transition-colors"
              data-testid={`training-article-${a.slug}`}
            >
              <div className="flex items-center gap-2">
                <BookOpen size={14} className="text-praxium-subtle shrink-0" />
                <div className="font-semibold text-sm">{a.title}</div>
              </div>
              {a.summary && <div className="text-xs text-praxium-subtle mt-1 ml-6">{a.summary}</div>}
            </Link>
          ))}
          {articles.length === 0 && <div className="text-sm text-praxium-subtle py-8 text-center">No articles match your search.</div>}
        </div>
      )}

      {tab === "gaps" && (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-praxium-subtle">
            Derived from position training vs live UI.{" "}
            <button type="button" className="text-praxium-accent-text hover:underline" onClick={() => navigate("/training/doc/ui-ux-gaps")}>
              Full gap report
            </button>
            {" · "}
            <button type="button" className="text-praxium-accent-text hover:underline" onClick={() => navigate("/training/doc/site-wiring-audit")}>
              Site wiring audit
            </button>
          </p>
          {gaps.map((g) => (
            <div key={g.id} className="data-card p-4" data-testid={`ux-gap-${g.id}`}>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={cn("text-[10px] font-mono uppercase px-2 py-0.5 rounded border", PRIORITY_STYLE[g.priority] || PRIORITY_STYLE.P2)}>
                  {g.priority}
                </span>
                <span className="text-[10px] font-mono uppercase text-praxium-subtle">{g.area}</span>
                <span className="text-[10px] font-mono text-praxium-subtle">{g.id}</span>
              </div>
              <div className="font-semibold text-sm">{g.user_story}</div>
              <div className="mt-2 grid sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="overline mb-1">Expected</div>
                  <div>{g.expected_ui}</div>
                </div>
                <div>
                  <div className="overline mb-1">Current app</div>
                  <div className="text-amber-900">{g.current_ui}</div>
                </div>
              </div>
              {g.workaround && (
                <div className="mt-2 text-xs text-praxium-subtle">
                  <span className="font-semibold">Workaround:</span> {g.workaround}
                  {g.route_hint && <span className="font-mono ml-2">{g.route_hint}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 data-card p-4 flex gap-3 items-start">
        <FileWarning size={16} className="text-praxium-subtle shrink-0 mt-0.5" />
        <p className="text-xs text-praxium-subtle">
          Templates and scripts must be edited and approved by counsel before client use. See disclosure for full requirements.
        </p>
      </div>
    </div>
  );
}
