import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import portalApi from "@/lib/portalApi";
import { STATUS_COLORS, formatDate, timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import PageLoader from "@/components/common/PageLoader";
import { ChevronLeft, Download, FileText, CheckSquare, Eye, PenLine, Award } from "lucide-react";
import { toast } from "sonner";
import PdfViewerModal from "@/components/pdf/PdfViewerModal";
import { isPdfDoc } from "@/lib/documentsApi";

function downloadB64(name, contentType, dataB64) {
  const bin = atob(dataB64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i);
  const blob = new Blob([arr], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PortalMatterDetail() {
  const { id } = useParams();
  const [matter, setMatter] = useState(null);
  const [activities, setActivities] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [signRequests, setSignRequests] = useState([]);
  // Settlement page gate — the server decides (attorney-approved scenario, no
  // pending reductions). null = not loaded; { ready:false } = nothing to show.
  const [settlementView, setSettlementView] = useState(null);
  const [tab, setTab] = useState("timeline");
  const [pdfViewer, setPdfViewer] = useState({ open: false, title: "", b64: "" });

  useEffect(() => {
    Promise.all([
      portalApi.get(`/portal/matters/${id}`),
      portalApi.get(`/portal/matters/${id}/activities`),
      portalApi.get(`/portal/matters/${id}/documents`),
      portalApi.get(`/portal/matters/${id}/tasks`),
      portalApi.get(`/portal/matters/${id}/sign-requests`),
      portalApi.get(`/portal/matters/${id}/settlement`).catch(() => ({ data: { ready: false } })),
    ]).then(([m, a, d, t, s, settlementRes]) => {
      setMatter(m.data);
      setActivities(a.data.items || []);
      setDocuments(d.data.items || []);
      setTasks(t.data.items || []);
      setSignRequests(s.data.items || []);
        setSettlementView(settlementRes?.data ?? { ready: false });
    });
  }, [id]);

  const handleDownload = async (docId) => {
    try {
      const r = await portalApi.get(`/portal/documents/${docId}/download`);
      downloadB64(r.data.name, r.data.content_type, r.data.data_b64);
      toast.success("Download started");
    } catch {
      toast.error("Download failed");
    }
  };

  const handleViewPdf = async (doc) => {
    if (!isPdfDoc(doc)) {
      handleDownload(doc.id);
      return;
    }
    try {
      const r = await portalApi.get(`/portal/documents/${doc.id}/download`);
      setPdfViewer({ open: true, title: doc.name, b64: r.data.data_b64 });
      toast.success("Document opened");
    } catch {
      toast.error("Could not open document");
    }
  };

  if (!matter) return <PageLoader label="Loading case…" />;

  const tabs = [
    { id: "timeline", label: "Timeline" },
    { id: "documents", label: "Documents" },
    { id: "tasks", label: "Your tasks" },
  ];

  return (
    <div>
      <Link to="/portal" className="text-xs font-mono text-praxium-subtle hover:text-praxium-accent flex items-center gap-1 mb-3">
        <ChevronLeft size={12} /> All cases
      </Link>
      <div className="font-mono text-[10px] text-praxium-subtle">{matter.case_number}</div>
      <h1 className="font-display font-black text-xl sm:text-2xl tracking-tight">{matter.title}</h1>
      <span className={cn("status-pip border text-[10px] mt-2 inline-block", STATUS_COLORS[matter.status])}>
        {matter.status}
      </span>

      {settlementView?.ready ? (
        <Link
          to={`/portal/matters/${id}/settlement`}
          className="mt-4 data-card p-4 border-l-4 flex items-center justify-between gap-3 hover:bg-black/[0.02]"
          style={{ borderLeftColor: "var(--settlement-accent, #D4AF37)" }}
        >
          <div>
            <p className="font-display font-bold text-sm flex items-center gap-2">
              <Award size={16} style={{ color: "var(--settlement-accent, #D4AF37)" }} />
              Your settlement is ready
            </p>
            <p className="text-xs text-praxium-subtle mt-1">{settlementView.celebration?.caption}</p>
          </div>
          <span className="text-xs font-mono text-praxium-subtle shrink-0">View →</span>
        </Link>
      ) : null}

      {signRequests.length > 0 ? (
        <div className="mt-4 data-card p-4 border-l-4 border-l-praxium-accent">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="font-display font-bold text-sm flex items-center gap-2">
                <PenLine size={16} className="text-praxium-accent" />
                Document awaiting your signature
              </p>
              <p className="text-xs text-praxium-subtle mt-1">
                {signRequests[0].document_title || signRequests[0].title}
                {signRequests.length > 1 ? ` (+${signRequests.length - 1} more)` : ""}
              </p>
            </div>
            <a
              href={signRequests[0].sign_url}
              className="btn-praxium inline-flex items-center justify-center min-h-[44px] w-full sm:w-auto shrink-0"
            >
              Sign document
            </a>
          </div>
        </div>
      ) : null}

      <div className="flex gap-2 mt-4 border-b border-praxium-line">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "px-3 py-2 text-xs font-mono uppercase tracking-wider border-b-2 -mb-px",
              tab === t.id ? "border-praxium-accent text-praxium-ink" : "border-transparent text-praxium-subtle"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "timeline" && (
          <div className="data-card p-4 space-y-3">
            {activities.length === 0 && <p className="text-sm text-praxium-subtle">No updates yet.</p>}
            {activities.map((a) => (
              <div key={a.id} className="text-sm border-b border-praxium-line pb-2 last:border-0">
                <div>{a.description}</div>
                <div className="text-[10px] font-mono text-praxium-subtle mt-1">{timeAgo(a.created_at)}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "documents" && (
          <div className="data-card divide-y divide-praxium-line">
            {documents.length === 0 && (
              <p className="p-4 text-sm text-praxium-subtle">No documents shared yet.</p>
            )}
            {documents.map((d) => (
              <div key={d.id} className="p-4 flex items-center gap-3">
                <FileText size={16} className="text-praxium-accent shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{d.name}</div>
                  <div className="text-[10px] font-mono text-praxium-subtle">
                    {formatDate(d.uploaded_at)} · {Math.round((d.size_bytes || 0) / 1024)} KB
                  </div>
                </div>
                <button type="button" className="btn-ghost text-xs py-1" onClick={() => handleViewPdf(d)}>
                  {isPdfDoc(d) ? (
                    <>
                      <Eye size={12} /> View
                    </>
                  ) : (
                    <>
                      <Download size={12} /> Get
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === "tasks" && (
          <div className="data-card p-4 space-y-2">
            {tasks.length === 0 && (
              <p className="text-sm text-praxium-subtle flex items-center gap-2">
                <CheckSquare size={14} /> Nothing assigned to you right now.
              </p>
            )}
            {tasks.map((t) => (
              <div key={t.id} className="flex items-start gap-2 py-2 border-b border-praxium-line last:border-0">
                <CheckSquare size={14} className={cn("mt-0.5", t.status === "done" ? "text-emerald-600" : "text-praxium-subtle")} />
                <div>
                  <div className={cn("text-sm", t.status === "done" && "line-through text-praxium-subtle")}>{t.title}</div>
                  {t.due_date && (
                    <div className="text-[10px] font-mono text-praxium-subtle">Due {formatDate(t.due_date)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Link to={`/portal/messages?matter=${id}`} className="btn-praxium mt-6 inline-flex w-full sm:w-auto justify-center">
        Message your firm
      </Link>
      <PdfViewerModal
        open={pdfViewer.open}
        title={pdfViewer.title}
        pdfB64={pdfViewer.b64}
        onClose={() => setPdfViewer({ open: false, title: "", b64: "" })}
      />
    </div>
  );
}
