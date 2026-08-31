import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Link } from "react-router-dom";
import { ArrowUpRight, Briefcase, CheckSquare, AlertCircle, UserPlus, Plus, Sparkles, Command, GraduationCap } from "lucide-react";
import { STATUSES, STATUS_DOT, timeAgo } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import PageLoader from "@/components/common/PageLoader";

export default function Dashboard() {
  const { user, firm } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/dashboard").then((r) => setData(r.data));
  }, []);

  if (!data) return <PageLoader label="Loading dashboard…" />;

  const isNewFirm = (data.total_matters ?? 0) === 0;

  const metrics = [
    { label: "Open matters", value: data.open_matters, dest: "/matters", testid: "metric-open-matters" },
    { label: "Open tasks", value: data.open_tasks, dest: "/tasks", testid: "metric-open-tasks" },
    { label: "Overdue", value: data.overdue_tasks, dest: "/tasks", color: "text-rose-600", testid: "metric-overdue" },
    { label: "New leads", value: data.new_leads, dest: "/marketplace", testid: "metric-new-leads" },
    { label: "Contacts", value: data.contacts_count, dest: "/contacts", testid: "metric-contacts" },
    { label: "Total matters", value: data.total_matters, dest: "/matters", testid: "metric-total-matters" },
  ];

  return (
    <div className="px-6 py-6">
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="overline mb-2">// {firm?.name || "your firm"} // {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
          <h1 className="font-display font-black text-3xl tracking-tight" data-testid="dashboard-greeting">Good day, {user?.name?.split(" ")[0]}.</h1>
        </div>
        <Link to="/matters/new" className="btn-praxium" data-testid="dashboard-new-matter">
          <Plus size={14} /> New matter
        </Link>
      </div>

      {isNewFirm && (
        <div className="mb-6 border border-praxium-accent/30 bg-gradient-to-r from-praxium-accent/5 to-transparent p-6 lg:p-8" data-testid="dashboard-onboarding">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="overline mb-2 text-praxium-accent-text">// first 30 seconds</div>
              <h2 className="font-display font-black text-xl lg:text-2xl tracking-tight">Your firm is live. Here&apos;s where to start.</h2>
              <p className="mt-2 text-sm text-praxium-subtle max-w-xl">
                Praxium ships with 45 modules ready. Create your first matter, add a contact, or press <span className="font-mono text-praxium-ink">⌘K</span> to search anything.
              </p>
            </div>
            <Link to="/matters/new" className="btn-praxium shrink-0 rounded-full">
              <Plus size={14} /> Create first matter
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: Briefcase, label: "Create a matter", to: "/matters/new", testid: "onboard-matter" },
              { icon: UserPlus, label: "Add a contact", to: "/contacts/new", testid: "onboard-contact" },
              { icon: GraduationCap, label: "PI training guides", to: "/training", testid: "onboard-training" },
              { icon: Command, label: "Try ⌘K search", to: "/matters", testid: "onboard-search" },
            ].map((step) => (
              <Link
                key={step.label}
                to={step.to}
                data-testid={step.testid}
                className="flex items-center gap-3 p-4 bg-praxium-surface border border-praxium-line hover:border-praxium-accent transition-colors"
              >
                <step.icon size={18} className="text-praxium-accent shrink-0" />
                <span className="text-sm font-medium">{step.label}</span>
              </Link>
            ))}
          </div>
          <p className="mt-4 text-[10px] font-mono text-praxium-subtle flex items-center gap-2">
            <Sparkles size={12} className="text-praxium-accent" />
            CoCounsel AI (⌘J) works best once you have a matter with notes and documents.
          </p>
        </div>
      )}

      {/* Metric strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-praxium-line border border-praxium-line">
        {metrics.map((m) => (
          <Link key={m.label} to={m.dest} data-testid={m.testid}
            className="bg-praxium-surface p-4 hover:bg-praxium-bg transition-colors group">
            <div className="overline">{m.label}</div>
            <div className={`mt-2 font-display font-black text-3xl tabular ${m.color || ""}`}>{m.value}</div>
            <div className="mt-1 text-[10px] font-mono text-praxium-subtle flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              view <ArrowUpRight size={10} />
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-12 gap-6">
        {/* Pipeline */}
        <div className="col-span-12 lg:col-span-8 data-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="overline mb-1">// pipeline</div>
              <h3 className="font-display font-black text-lg">Matter status</h3>
            </div>
            <Link to="/reports" className="text-xs font-mono text-praxium-accent-text hover:underline">PI audit →</Link>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {STATUSES.map((s) => (
              <div key={s} className="text-center p-3 bg-praxium-bg rounded-sm" data-testid={`pipeline-${s}`}>
                <div className={`w-2 h-2 rounded-full ${STATUS_DOT[s]} mx-auto`} />
                <div className="mt-2 text-[10px] font-mono uppercase tracking-wider text-praxium-subtle">{s}</div>
                <div className="mt-1 font-display font-black text-xl tabular">{data.pipeline?.[s] || 0}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="col-span-12 lg:col-span-4 data-card p-5">
          <div className="overline mb-3">// shortcuts</div>
          <div className="space-y-1">
            <Link to="/matters/new" className="flex items-center gap-2 p-2 rounded-sm hover:bg-praxium-bg" data-testid="quick-new-matter">
              <Briefcase size={14} className="text-praxium-accent" /><span className="text-sm">New matter</span>
            </Link>
            <Link to="/contacts/new" className="flex items-center gap-2 p-2 rounded-sm hover:bg-praxium-bg" data-testid="quick-new-contact">
              <UserPlus size={14} className="text-praxium-accent" /><span className="text-sm">Add contact</span>
            </Link>
            <Link to="/tasks" className="flex items-center gap-2 p-2 rounded-sm hover:bg-praxium-bg" data-testid="quick-tasks">
              <CheckSquare size={14} className="text-praxium-accent" /><span className="text-sm">My tasks</span>
            </Link>
            <Link to="/marketplace" className="flex items-center gap-2 p-2 rounded-sm hover:bg-praxium-bg" data-testid="quick-leads">
              <AlertCircle size={14} className="text-praxium-accent" /><span className="text-sm">Inbox leads</span>
            </Link>
          </div>
        </div>

        {/* Activity */}
        <div className="col-span-12 data-card p-5">
          <div className="overline mb-3">// recent activity</div>
          {data.recent_activity?.length === 0 ? (
            <div className="text-sm text-praxium-subtle py-8 text-center">No activity yet. Create your first matter to get started.</div>
          ) : (
            <div className="divide-y divide-praxium-line">
              {data.recent_activity?.map((a) => (
                <div key={a.id} className="py-2.5 flex items-start gap-3" data-testid={`activity-${a.id}`}>
                  <div className="w-1.5 h-1.5 rounded-full bg-praxium-accent mt-2" />
                  <div className="flex-1">
                    <div className="text-sm"><span className="font-semibold">{a.actor_name}</span> {a.description}</div>
                    <div className="text-[10px] font-mono text-praxium-subtle">{timeAgo(a.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
