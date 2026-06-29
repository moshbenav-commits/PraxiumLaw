import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { ChevronLeft, Workflow } from "lucide-react";
import PageLoader from "@/components/common/PageLoader";
import { Switch } from "@/components/ui/switch";

export default function SettingsWorkflows() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    api
      .get("/workflows")
      .then((r) => setItems(r.data.items || []))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const toggle = async (id, enabled) => {
    try {
      await api.patch(`/workflows/${id}`, { enabled });
      toast.success(enabled ? "Workflow enabled" : "Workflow disabled");
      load();
    } catch {
      toast.error("Update failed");
    }
  };

  if (loading) return <PageLoader label="Loading workflows…" />;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl">
      <Link to="/settings" className="text-xs font-mono text-praxium-subtle hover:text-praxium-accent flex items-center gap-1 mb-3">
        <ChevronLeft size={12} /> Settings
      </Link>
      <div className="overline mb-2">// automations</div>
      <h1 className="font-display font-black text-2xl tracking-tight flex items-center gap-2">
        <Workflow className="text-praxium-accent" /> Workflows
      </h1>
      <p className="text-sm text-praxium-subtle mt-2">
        Firm automations run on triggers like new matters or document uploads.
      </p>

      <div className="mt-6 space-y-3">
        {items.map((wf) => (
          <div key={wf.id} className="data-card p-4 flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold text-sm">{wf.name}</div>
              <div className="text-xs font-mono text-praxium-subtle mt-1">
                trigger: {wf.trigger} · {wf.actions?.length || 0} action(s)
              </div>
              {wf.conditions?.folder && (
                <div className="text-[10px] font-mono text-praxium-subtle mt-1">When folder = {wf.conditions.folder}</div>
              )}
            </div>
            <Switch checked={Boolean(wf.enabled)} onCheckedChange={(v) => toggle(wf.id, v)} aria-label={`Toggle ${wf.name}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
