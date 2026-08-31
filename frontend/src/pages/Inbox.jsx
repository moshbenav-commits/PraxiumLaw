import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Inbox as InboxIcon, Mail, MessageSquare, Users } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import PageLoader from "@/components/common/PageLoader";
import EmptyState from "@/components/common/EmptyState";
import { toast } from "sonner";

export default function Inbox() {
  const [leads, setLeads] = useState([]);
  const [chat, setChat] = useState([]);
  const [portalMsgs, setPortalMsgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyMatter, setReplyMatter] = useState("");
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/leads"),
      api.get("/chat/messages?channel=general"),
      api.get("/portal/staff/messages"),
    ])
      .then(([leadsRes, chatRes, portalRes]) => {
        setLeads(leadsRes.data);
        setChat(chatRes.data);
        setPortalMsgs(portalRes.data.items || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const sendReply = async (e) => {
    e.preventDefault();
    if (!replyMatter || !replyText.trim()) return;
    try {
      await api.post("/portal/staff/messages", { matter_id: replyMatter, content: replyText.trim() });
      toast.success("Reply sent to client");
      setReplyText("");
      const r = await api.get("/portal/staff/messages");
      setPortalMsgs(r.data.items || []);
    } catch {
      toast.error("Reply failed");
    }
  };

  const clientMessages = portalMsgs.filter((m) => m.author_kind === "client");
  const unreadClient = clientMessages.filter((m) => !m.read_by_staff);

  const items = [
    ...unreadClient.map((m) => ({
      ...m,
      _kind: "client_portal",
      _icon: Users,
      _title: `Client message — matter ${m.matter_id?.slice(0, 8)}`,
      _sub: m.content?.slice(0, 120),
      _ts: m.created_at,
      _matterId: m.matter_id,
    })),
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
      <p className="text-sm text-praxium-subtle mt-2">
        Leads, team chat, and client portal messages in one feed.
      </p>

      {clientMessages.length > 0 && (
        <div className="mt-6 data-card p-4">
          <div className="overline mb-2">// reply to client</div>
          <form onSubmit={sendReply} className="flex flex-col sm:flex-row gap-2">
            <input
              value={replyMatter}
              onChange={(e) => setReplyMatter(e.target.value)}
              placeholder="Matter ID"
              className="px-3 py-2 border border-praxium-line rounded-sm text-sm font-mono flex-1"
            />
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Reply to client…"
              className="px-3 py-2 border border-praxium-line rounded-sm text-sm flex-[2]"
            />
            <button type="submit" className="btn-praxium shrink-0">Send</button>
          </form>
          <p className="text-[10px] text-praxium-subtle mt-2">
            Click a client message below to copy its matter ID, or open{" "}
            <Link to="/matters" className="text-praxium-accent-text">Matters</Link>.
          </p>
        </div>
      )}

      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Inbox is empty"
            body="New leads, client portal messages, and chat will appear here."
            actionLabel="View LawMatch"
            actionTo="/marketplace"
            testId="inbox-empty"
          />
        </div>
      ) : (
        <div className="mt-6 data-card overflow-hidden">
          <div className="divide-y divide-praxium-line">
            {items.map((it, i) => (
              <div
                key={i}
                className="px-4 py-3 hover:bg-praxium-bg flex items-start gap-3 cursor-pointer"
                data-testid={`inbox-item-${i}`}
                onClick={() => it._matterId && setReplyMatter(it._matterId)}
                onKeyDown={() => {}}
                role={it._matterId ? "button" : undefined}
                tabIndex={it._matterId ? 0 : undefined}
              >
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
