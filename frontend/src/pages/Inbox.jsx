import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Inbox as InboxIcon, Mail, MessageSquare } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import PageLoader from "@/components/common/PageLoader";
import EmptyState from "@/components/common/EmptyState";

export default function Inbox() {
  const [leads, setLeads] = useState([]);
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/leads"),
      api.get("/chat/messages?channel=general"),
    ])
      .then(([leadsRes, chatRes]) => {
        setLeads(leadsRes.data);
        setChat(chatRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const items = [
    ...leads.map((l) => ({ ...l, _kind: "lead", _icon: Mail, _title: `New lead: ${l.name}`, _sub: l.description?.slice(0, 80), _ts: l.created_at })),
    ...chat.slice(0, 10).map((m) => ({ ...m, _kind: "chat", _icon: MessageSquare, _title: m.author_name, _sub: m.content?.slice(0, 80), _ts: m.created_at })),
  ].sort((a, b) => new Date(b._ts) - new Date(a._ts));

  if (loading) return <PageLoader label="Loading inbox…" />;

  return (
    <div className="px-4 sm:px-6 py-6">
      <div className="overline mb-2">// universal inbox</div>
      <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tight flex items-center gap-3">
        <InboxIcon className="text-praxium-accent shrink-0" /> Universal Inbox
      </h1>
      <p className="text-sm text-praxium-subtle mt-2">Email, SMS, voicemail, chat, intake forms — all in one AI-prioritized feed.</p>

      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Inbox is empty"
            body="New leads, messages, and intake submissions will appear here as they arrive."
            actionLabel="View LawMatch"
            actionTo="/marketplace"
            testId="inbox-empty"
          />
        </div>
      ) : (
      <div className="mt-6 data-card overflow-hidden">
        <div className="divide-y divide-praxium-line">
          {items.map((it, i) => (
            <div key={i} className="px-4 py-3 hover:bg-praxium-bg flex items-start gap-3" data-testid={`inbox-item-${i}`}>
              <it._icon size={14} className="text-praxium-accent mt-1 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-sm truncate">{it._title}</span>
                  <span className="text-[10px] font-mono text-praxium-subtle shrink-0">{timeAgo(it._ts)}</span>
                </div>
                {it._sub && <div className="text-xs text-praxium-subtle mt-0.5 line-clamp-2">{it._sub}</div>}
                <div className="mt-1 text-[10px] font-mono uppercase tracking-wider text-praxium-subtle">{it._kind}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}
    </div>
  );
}
