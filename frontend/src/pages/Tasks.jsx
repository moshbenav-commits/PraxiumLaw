import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Plus, Check } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import PageLoader from "@/components/common/PageLoader";

const PRIORITY_COLORS = {
  urgent: "bg-rose-100 text-rose-900",
  high: "bg-amber-100 text-amber-900",
  medium: "bg-blue-100 text-blue-900",
  low: "bg-zinc-100 text-zinc-700",
};

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", priority: "medium", due_date: "" });

  const load = () => api.get("/tasks").then((r) => { setTasks(r.data); setLoading(false); });
  useEffect(load, []);

  const create = async (e) => {
    e.preventDefault();
    await api.post("/tasks", { ...form, due_date: form.due_date || null });
    setForm({ title: "", priority: "medium", due_date: "" });
    setShowForm(false);
    load();
  };

  const toggle = async (t) => {
    await api.put(`/tasks/${t.id}`, { status: t.status === "done" ? "open" : "done" });
    load();
  };

  if (loading) return <PageLoader label="Loading tasks…" />;

  return (
    <div className="px-4 sm:px-6 py-6">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="overline mb-2">// tasks // {tasks.filter((t) => t.status !== "done").length} open</div>
          <h1 className="font-display font-black text-3xl tracking-tight">Tasks</h1>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="btn-praxium" data-testid="tasks-new">
          <Plus size={14} /> New task
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} className="data-card p-4 mb-4 grid grid-cols-12 gap-2" data-testid="task-form">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Task title..."
            className="col-span-6 px-3 py-2 border border-praxium-line rounded-sm text-sm" data-testid="task-form-title" />
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
            className="col-span-2 px-3 py-2 border border-praxium-line rounded-sm text-sm" data-testid="task-form-priority">
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
          </select>
          <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            className="col-span-2 px-3 py-2 border border-praxium-line rounded-sm text-sm font-mono" data-testid="task-form-due" />
          <button type="submit" className="btn-praxium col-span-2" data-testid="task-form-submit">Add</button>
        </form>
      )}

      {tasks.length === 0 && !showForm ? (
        <div className="data-card p-10 text-center" data-testid="tasks-empty">
          <div className="font-display font-black text-xl tracking-tight">No tasks yet</div>
          <p className="mt-2 text-sm text-praxium-subtle max-w-md mx-auto">Track deadlines, follow-ups, and assignments across your firm.</p>
          <button type="button" onClick={() => setShowForm(true)} className="btn-praxium inline-flex mt-6 rounded-full">
            New task
          </button>
        </div>
      ) : (
      <div className="data-card overflow-hidden">
        <div className="divide-y divide-praxium-line">
          {tasks.map((t) => (
            <div key={t.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-praxium-bg" data-testid={`task-${t.id}`}>
              <button onClick={() => toggle(t)} className={cn("w-4 h-4 border rounded-sm flex items-center justify-center", t.status === "done" ? "bg-praxium-accent border-praxium-accent" : "border-praxium-line")}>
                {t.status === "done" && <Check size={10} className="text-white" />}
              </button>
              <span className={cn("flex-1 text-sm", t.status === "done" && "line-through text-praxium-subtle")}>{t.title}</span>
              <span className={cn("status-pip", PRIORITY_COLORS[t.priority])}>{t.priority}</span>
              {t.due_date && <span className="text-[10px] font-mono text-praxium-subtle w-20 text-right">{formatDate(t.due_date)}</span>}
            </div>
          ))}
        </div>
      </div>
      )}
    </div>
  );
}
