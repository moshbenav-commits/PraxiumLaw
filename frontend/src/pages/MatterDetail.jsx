import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { STATUSES, STATUS_COLORS, STATUS_DOT, formatDate, formatMoney, PRACTICE_AREAS, timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ChevronLeft, Plus, Pin, Briefcase, FileText, CheckSquare, MessageSquare, Stethoscope, Scale, Users, Link2, Copy, Eye } from "lucide-react";
import { toast } from "sonner";
import PageLoader from "@/components/common/PageLoader";
import PdfViewerModal from "@/components/pdf/PdfViewerModal";
import { isPdfDoc, viewDocument } from "@/lib/documentsApi";

const TABS = [
  { id: "overview", label: "Overview", icon: Briefcase },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "notes", label: "Notes", icon: MessageSquare },
  { id: "medical", label: "Medical", icon: Stethoscope },
  { id: "filings", label: "Filings", icon: Scale },
  { id: "portal", label: "Client msgs", icon: Users },
  { id: "chat", label: "Team chat", icon: MessageSquare },
];

export default function MatterDetail() {
  const { id } = useParams();
  const [matter, setMatter] = useState(null);
  const [tab, setTab] = useState("overview");
  const [activities, setActivities] = useState([]);
  const [notes, setNotes] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [chat, setChat] = useState([]);
  const [portalMsgs, setPortalMsgs] = useState([]);
  const [newPortalMsg, setNewPortalMsg] = useState("");
  const [filings, setFilings] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [newTask, setNewTask] = useState("");
  const [newChatMsg, setNewChatMsg] = useState("");
  const [portalBusy, setPortalBusy] = useState(false);
  const [portalInviteUrl, setPortalInviteUrl] = useState("");
  const [uploadLinkUrl, setUploadLinkUrl] = useState("");
  const [clientContact, setClientContact] = useState(null);
  const [pdfViewer, setPdfViewer] = useState({ open: false, title: "", b64: "" });
  const [signDocId, setSignDocId] = useState("");

  const reload = () => {
    api.get(`/matters/${id}`).then((r) => setMatter(r.data));
    api.get(`/activities?matter_id=${id}`).then((r) => setActivities(r.data));
    api.get(`/notes?matter_id=${id}`).then((r) => setNotes(r.data));
    api.get(`/tasks?matter_id=${id}`).then((r) => setTasks(r.data));
    api.get(`/documents?matter_id=${id}`).then((r) => setDocuments(r.data));
    api.get(`/treatments?matter_id=${id}`).then((r) => setTreatments(r.data));
    api.get(`/chat/messages?matter_id=${id}&channel=matter`).then((r) => setChat(r.data));
    api.get(`/portal/staff/messages?matter_id=${id}`).then((r) => setPortalMsgs(r.data.items || [])).catch(() => setPortalMsgs([]));
    api.get(`/filings?matter_id=${id}`).then((r) => setFilings(r.data));
  };
  useEffect(reload, [id]);

  useEffect(() => {
    if (matter?.client_id) {
      api.get(`/contacts/${matter.client_id}`).then((r) => setClientContact(r.data)).catch(() => setClientContact(null));
    } else {
      setClientContact(null);
    }
  }, [matter?.client_id]);

  const togglePortal = async (enabled) => {
    setPortalBusy(true);
    try {
      const r = await api.patch(`/matters/${id}/portal`, { portal_enabled: enabled });
      setMatter(r.data.matter);
      toast.success(enabled ? "Client portal enabled" : "Portal disabled");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Update failed");
    } finally {
      setPortalBusy(false);
    }
  };

  const sendPortalInvite = async () => {
    setPortalBusy(true);
    try {
      const r = await api.patch(`/matters/${id}/portal`, { send_invite: true });
      setMatter(r.data.matter);
      const url = r.data.invite_url || r.data.dev_invite_url;
      if (url) {
        setPortalInviteUrl(url);
        await navigator.clipboard.writeText(url);
        toast.success("Portal invite link copied");
      } else {
        toast.success("Invite sent");
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invite failed — link client with email first");
    } finally {
      setPortalBusy(false);
    }
  };

  const createUploadLink = async () => {
    try {
      const r = await api.post("/medconnect/magic-link", { matter_id: id, expires_days: 30, send_email: true });
      const url = r.data.full_url || `${window.location.origin}${r.data.url}`;
      setUploadLinkUrl(url);
      if (r.data.dev_upload_url || !r.data.full_url) {
        await navigator.clipboard.writeText(url);
        toast.success(r.data.dev_upload_url ? "Upload link copied (dev)" : "Upload link copied");
      } else {
        toast.success("Upload link emailed to client");
      }
    } catch {
      toast.error("Could not create upload link");
    }
  };

  const createSignRequest = async () => {
    if (!clientContact?.email || !clientContact?.name) {
      toast.error("Link a client contact with name and email first");
      return;
    }
    try {
      const payload = {
        title: "Client agreement",
        document_title: "Client Agreement",
        signer_name: clientContact.name,
        signer_email: clientContact.email,
      };
      if (signDocId) {
        const doc = documents.find((d) => d.id === signDocId);
        payload.document_id = signDocId;
        payload.document_title = doc?.name || payload.document_title;
      }
      const r = await api.post(`/matters/${id}/sign-requests`, payload);
      const url = r.data.dev_sign_url || r.data.sign_request?.sign_url;
      if (url && r.data.dev_sign_url) {
        await navigator.clipboard.writeText(url);
        toast.success(r.data.email_sent ? "Sign link copied (dev)" : "Sign link copied (email skipped, no Resend key)");
      } else if (r.data.email_sent) {
        toast.success("Sign request emailed to client");
      } else {
        toast.success("Sign request created (configure Resend to email client)");
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not create sign request");
    }
  };

  const openPdfView = async (docId, name) => {
    try {
      const data = await viewDocument(docId);
      setPdfViewer({ open: true, title: name || data.name, b64: data.data_b64 });
    } catch {
      toast.error("Could not open PDF");
    }
  };

  const toggleDocVisible = async (docId, visible) => {
    await api.patch(`/documents/${docId}/visibility`, { client_visible: visible });
    reload();
    toast.success(visible ? "Visible to client" : "Hidden from client");
  };

  const toggleTaskVisible = async (taskId, visible) => {
    await api.patch(`/tasks/${taskId}/client-visible`, { client_visible: visible });
    reload();
  };

  const updateStatus = async (s) => {
    await api.put(`/matters/${id}`, { status: s });
    reload();
  };

  const addNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    await api.post("/notes", { matter_id: id, content: newNote });
    setNewNote("");
    reload();
    toast.success("Note added");
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    await api.post("/tasks", { matter_id: id, title: newTask });
    setNewTask("");
    reload();
    toast.success("Task added");
  };

  const sendChat = async (e) => {
    e.preventDefault();
    if (!newChatMsg.trim()) return;
    await api.post("/chat/messages", { matter_id: id, channel: "matter", content: newChatMsg });
    setNewChatMsg("");
    reload();
  };

  const sendPortalMsg = async (e) => {
    e.preventDefault();
    if (!newPortalMsg.trim()) return;
    try {
      await api.post("/portal/staff/messages", { matter_id: id, content: newPortalMsg.trim() });
      setNewPortalMsg("");
      const r = await api.get(`/portal/staff/messages?matter_id=${id}`);
      setPortalMsgs(r.data.items || []);
      toast.success("Reply sent to client portal");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Send failed");
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("matter_id", id);
    fd.append("name", file.name);
    fd.append("folder", "General");
    try {
      await api.post("/documents", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Uploaded");
      reload();
    } catch { toast.error("Upload failed"); }
  };

  if (!matter) return <PageLoader label="Loading matter…" />;

  return (
    <div>
      {/* Header */}
      <div className="border-b border-praxium-line bg-praxium-surface px-6 py-4">
        <Link to="/matters" className="text-xs font-mono text-praxium-subtle hover:text-praxium-accent flex items-center gap-1 mb-2" data-testid="matter-back">
          <ChevronLeft size={12} /> all matters
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-praxium-subtle" data-testid="matter-case-number">{matter.case_number}</span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-praxium-subtle">{PRACTICE_AREAS.find((p) => p.id === matter.practice_area)?.label}</span>
            </div>
            <h1 className="font-display font-black text-2xl tracking-tight mt-1" data-testid="matter-title">{matter.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <select value={matter.status} onChange={(e) => updateStatus(e.target.value)} data-testid="matter-status-change"
              className={cn("status-pip border", STATUS_COLORS[matter.status])}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex gap-0 mt-4 border-b border-praxium-line -mb-4">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} data-testid={`matter-tab-${t.id}`}
              className={cn(
                "px-3 py-2 text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-colors",
                tab === t.id ? "border-praxium-accent text-praxium-ink" : "border-transparent text-praxium-subtle hover:text-praxium-ink"
              )}>
              <t.icon size={12} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-6 py-5">
        {tab === "overview" && (
          <div className="grid grid-cols-12 gap-5">
            <div className="col-span-12 lg:col-span-8 space-y-5">
              <div className="data-card p-5">
                <div className="overline mb-3">// summary</div>
                <p className="text-sm whitespace-pre-wrap">{matter.description || "No description."}</p>
                <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-praxium-line">
                  <div>
                    <div className="overline">Incident</div>
                    <div className="text-sm font-mono mt-1">{formatDate(matter.incident_date)}</div>
                  </div>
                  <div>
                    <div className="overline">SOL</div>
                    <div className="text-sm font-mono mt-1">{formatDate(matter.sol_date)}</div>
                  </div>
                  <div>
                    <div className="overline">Value est.</div>
                    <div className="text-sm font-mono mt-1">{formatMoney(matter.value_estimate)}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-4 space-y-5">
              <div className="data-card p-5">
                <div className="overline mb-3 flex items-center gap-2"><Users size={12} /> // client portal</div>
                <p className="text-xs text-praxium-subtle mb-3">
                  Magic-link access for {clientContact?.name || "linked client"} — no client passwords.
                </p>
                <label className="flex items-center gap-2 text-sm mb-3">
                  <input
                    type="checkbox"
                    checked={Boolean(matter.portal_enabled)}
                    disabled={portalBusy}
                    onChange={(e) => togglePortal(e.target.checked)}
                    data-testid="matter-portal-toggle"
                  />
                  Client portal access
                </label>
                <button
                  type="button"
                  className="btn-ghost text-xs w-full justify-center mb-2"
                  disabled={portalBusy || !clientContact?.email}
                  onClick={sendPortalInvite}
                  data-testid="matter-portal-invite"
                >
                  <Link2 size={12} /> Send portal invite
                </button>
                {portalInviteUrl && (
                  <code className="text-[10px] font-mono block break-all bg-praxium-bg p-2 rounded-sm">{portalInviteUrl}</code>
                )}
                {!clientContact?.email && (
                  <p className="text-[10px] text-amber-700 mt-2">Link a client contact with email on this matter first.</p>
                )}
              </div>
              <div className="data-card p-5">
                <div className="overline mb-3">// activity</div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {activities.length === 0 && <div className="text-xs text-praxium-subtle">No activity yet.</div>}
                  {activities.map((a) => (
                    <div key={a.id} className="text-xs">
                      <div><span className="font-semibold">{a.actor_name}</span> {a.description}</div>
                      <div className="text-[10px] font-mono text-praxium-subtle">{timeAgo(a.created_at)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "tasks" && (
          <div className="data-card p-5">
            <form onSubmit={addTask} className="flex gap-2 mb-4" data-testid="matter-add-task-form">
              <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Add task..."
                className="flex-1 px-3 py-2 border border-praxium-line rounded-sm text-sm" data-testid="matter-task-input" />
              <button type="submit" className="btn-praxium" data-testid="matter-task-submit"><Plus size={14} /> Add</button>
            </form>
            <div className="divide-y divide-praxium-line">
              {tasks.map((t) => (
                <div key={t.id} className="py-2 flex items-center gap-2 flex-wrap" data-testid={`task-${t.id}`}>
                  <input type="checkbox" checked={t.status === "done"} onChange={async () => { await api.put(`/tasks/${t.id}`, { status: t.status === "done" ? "open" : "done" }); reload(); }} />
                  <span className={cn("text-sm flex-1 min-w-[120px]", t.status === "done" && "line-through text-praxium-subtle")}>{t.title}</span>
                  {t.due_date && <span className="text-[10px] font-mono text-praxium-subtle">{formatDate(t.due_date)}</span>}
                  <label className="text-[10px] font-mono flex items-center gap-1 ml-auto">
                    <input type="checkbox" checked={Boolean(t.client_visible)} onChange={(e) => toggleTaskVisible(t.id, e.target.checked)} />
                    Client sees
                  </label>
                </div>
              ))}
              {tasks.length === 0 && <div className="text-xs text-praxium-subtle py-3">No tasks yet.</div>}
            </div>
          </div>
        )}

        {tab === "documents" && (
          <div className="data-card p-5">
            <div className="flex flex-wrap gap-2 mb-4">
              <label className="btn-praxium inline-flex cursor-pointer" data-testid="matter-upload-doc">
                <Plus size={14} /> Upload document
                <input type="file" onChange={handleUpload} className="hidden" />
              </label>
              <button type="button" className="btn-ghost text-xs" onClick={createUploadLink}>
                <Copy size={12} /> Magic upload link
              </button>
              <button type="button" className="btn-ghost text-xs" onClick={createSignRequest}>
                Request signature
              </button>
              {documents.some(isPdfDoc) ? (
                <select
                  className="input-praxium text-xs py-1 max-w-[200px]"
                  value={signDocId}
                  onChange={(e) => setSignDocId(e.target.value)}
                  title="PDF to send for signature"
                >
                  <option value="">Blank agreement PDF</option>
                  {documents.filter(isPdfDoc).map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              ) : null}
            </div>
            {uploadLinkUrl && (
              <code className="text-[10px] font-mono block break-all bg-praxium-bg p-2 rounded-sm mb-4">{uploadLinkUrl}</code>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-praxium-line">
                  <th className="text-left py-2 overline">Name</th>
                  <th className="text-left py-2 overline">Folder</th>
                  <th className="text-left py-2 overline">Uploaded</th>
                  <th className="text-left py-2 overline">Client</th>
                  <th className="text-right py-2 overline">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-praxium-line">
                {documents.map((d) => (
                  <tr key={d.id} data-testid={`doc-${d.id}`}>
                    <td className="py-2 font-medium">{d.name}</td>
                    <td className="py-2 text-xs font-mono text-praxium-subtle">{d.folder}</td>
                    <td className="py-2 text-xs font-mono text-praxium-subtle">{timeAgo(d.uploaded_at)} • {d.uploaded_by_name}</td>
                    <td className="py-2">
                      <input type="checkbox" checked={Boolean(d.client_visible)} onChange={(e) => toggleDocVisible(d.id, e.target.checked)} title="Visible in client portal" />
                    </td>
                    <td className="py-2 text-right text-xs font-mono space-x-1">
                      {isPdfDoc(d) ? (
                        <button type="button" className="btn-ghost py-0.5 px-2 inline-flex items-center gap-1" onClick={() => openPdfView(d.id, d.name)}>
                          <Eye size={12} /> View
                        </button>
                      ) : null}
                      <span className="text-praxium-subtle">{Math.round(d.size_bytes / 1024)} KB</span>
                    </td>
                  </tr>
                ))}
                {documents.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-xs text-praxium-subtle">No documents yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === "notes" && (
          <div className="data-card p-5">
            <form onSubmit={addNote} className="mb-4" data-testid="matter-add-note-form">
              <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} rows={3} placeholder="Add a note..."
                className="w-full px-3 py-2 border border-praxium-line rounded-sm text-sm" data-testid="matter-note-input" />
              <button type="submit" className="btn-praxium mt-2" data-testid="matter-note-submit"><Plus size={14} /> Save note</button>
            </form>
            <div className="space-y-3">
              {notes.map((n) => (
                <div key={n.id} className="border border-praxium-line rounded-sm p-3" data-testid={`note-${n.id}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold">{n.author_name}</span>
                    <span className="text-[10px] font-mono text-praxium-subtle">{timeAgo(n.created_at)}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{n.content}</p>
                </div>
              ))}
              {notes.length === 0 && <div className="text-xs text-praxium-subtle">No notes yet.</div>}
            </div>
          </div>
        )}

        {tab === "medical" && (
          <div className="data-card p-5">
            <div className="overline mb-3">// medical providers & treatment</div>
            <div className="bg-praxium-bg p-3 rounded-sm text-xs font-mono mb-4">
              <div className="overline mb-1">// patient id (give to providers)</div>
              <div className="text-lg font-display font-black tracking-wider">PT-{matter.id.slice(0, 6).toUpperCase()}</div>
              <div className="mt-1 text-praxium-subtle">Doctors include this in email subject → auto-files to this matter.</div>
            </div>
            {treatments.length === 0 ? (
              <div className="text-xs text-praxium-subtle">No providers linked. <Link to="/medconnect" className="text-praxium-accent">Add via MedConnect.</Link></div>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-praxium-line">
                  <th className="text-left py-2 overline">Provider</th>
                  <th className="text-left py-2 overline">Role</th>
                  <th className="text-left py-2 overline">Records</th>
                  <th className="text-right py-2 overline">Billed</th>
                  <th className="text-right py-2 overline">Lien</th>
                </tr></thead>
                <tbody className="divide-y divide-praxium-line">
                  {treatments.map((t) => (
                    <tr key={t.id} data-testid={`treatment-${t.id}`}>
                      <td className="py-2">{t.provider_id?.slice(0, 8)}</td>
                      <td className="py-2 text-xs">{t.role}</td>
                      <td className="py-2 text-xs"><span className="status-pip bg-amber-100 text-amber-900">{t.records_status}</span></td>
                      <td className="py-2 text-right font-mono">{formatMoney(t.billed_total)}</td>
                      <td className="py-2 text-right font-mono">{formatMoney(t.lien_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "filings" && (
          <div className="data-card p-5">
            <div className="overline mb-3">// court filings</div>
            {filings.length === 0 ? (
              <div className="text-xs text-praxium-subtle">No filings yet. <Link to="/courtconnect" className="text-praxium-accent">Prepare in CourtConnect.</Link></div>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-praxium-line">
                  <th className="text-left py-2 overline">Type</th>
                  <th className="text-left py-2 overline">Title</th>
                  <th className="text-left py-2 overline">Court</th>
                  <th className="text-left py-2 overline">Status</th>
                </tr></thead>
                <tbody className="divide-y divide-praxium-line">
                  {filings.map((f) => (
                    <tr key={f.id}><td className="py-2 text-xs font-mono">{f.document_type}</td><td className="py-2">{f.title}</td><td className="py-2 text-xs">{f.court}</td><td className="py-2"><span className="status-pip bg-zinc-100">{f.status}</span></td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "portal" && (
          <div className="data-card p-5 flex flex-col" style={{ height: "calc(100vh - 240px)" }}>
            <div className="overline mb-1">// client portal messaging</div>
            <p className="text-xs text-praxium-subtle mb-3">
              Secure thread with {clientContact?.name || "your client"} — visible in their portal when access is enabled.
            </p>
            {!matter.portal_enabled && (
              <p className="text-xs text-amber-700 mb-3">Enable client portal access to let the client read replies.</p>
            )}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {portalMsgs.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[85%] rounded-sm p-3 text-sm",
                    m.author_kind === "client"
                      ? "bg-praxium-bg border border-praxium-line"
                      : "ml-auto bg-praxium-accent/10 border border-praxium-accent/20"
                  )}
                  data-testid={`portal-msg-${m.id}`}
                >
                  <div className="text-[10px] font-mono text-praxium-subtle mb-1">
                    {m.author_name} · {timeAgo(m.created_at)}
                  </div>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              ))}
              {portalMsgs.length === 0 && (
                <div className="text-xs text-praxium-subtle">No client messages yet — they can write from the portal Messages page.</div>
              )}
            </div>
            <form onSubmit={sendPortalMsg} className="flex gap-2 mt-3 pt-3 border-t border-praxium-line" data-testid="portal-reply-form">
              <input
                value={newPortalMsg}
                onChange={(e) => setNewPortalMsg(e.target.value)}
                placeholder="Reply to client…"
                className="flex-1 px-3 py-2 border border-praxium-line rounded-sm text-sm"
                data-testid="portal-reply-input"
              />
              <button type="submit" className="btn-praxium" data-testid="portal-reply-send">Send</button>
            </form>
          </div>
        )}

        {tab === "chat" && (
          <div className="data-card p-5 flex flex-col" style={{ height: "calc(100vh - 240px)" }}>
            <div className="overline mb-3">// matter team chat</div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {chat.map((m) => (
                <div key={m.id} className="text-sm" data-testid={`chat-msg-${m.id}`}>
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-xs">{m.author_name}</span>
                    <span className="text-[10px] font-mono text-praxium-subtle">{timeAgo(m.created_at)}</span>
                  </div>
                  <div>{m.content}</div>
                </div>
              ))}
              {chat.length === 0 && <div className="text-xs text-praxium-subtle">No messages yet.</div>}
            </div>
            <form onSubmit={sendChat} className="flex gap-2 mt-3 pt-3 border-t border-praxium-line" data-testid="chat-send-form">
              <input value={newChatMsg} onChange={(e) => setNewChatMsg(e.target.value)} placeholder="Message team..."
                className="flex-1 px-3 py-2 border border-praxium-line rounded-sm text-sm" data-testid="chat-input" />
              <button type="submit" className="btn-praxium" data-testid="chat-send">Send</button>
            </form>
          </div>
        )}
      </div>
      <PdfViewerModal
        open={pdfViewer.open}
        title={pdfViewer.title}
        pdfB64={pdfViewer.b64}
        onClose={() => setPdfViewer({ open: false, title: "", b64: "" })}
      />
    </div>
  );
}
