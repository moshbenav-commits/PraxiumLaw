import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ScrollText, Upload, Users, Plus, Copy, Download, Eye, Mail } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import PdfFieldEditor from "@/components/pdf/PdfFieldEditor";
import PdfViewerModal from "@/components/pdf/PdfViewerModal";
import {
  createSignRequest,
  downloadSignedPdfStaff,
  listSignRequests,
  patchSignFields,
  resendSignInvite,
} from "@/lib/esignApi";
import { downloadB64File, isPdfDoc, viewDocument } from "@/lib/documentsApi";

const STATUS_LABEL = {
  pending: "Awaiting signature",
  signed: "Signed",
};

export default function NativeSign() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [matters, setMatters] = useState([]);
  const [matterDocs, setMatterDocs] = useState([]);
  const [fieldEditor, setFieldEditor] = useState(null);
  const [pdfPreview, setPdfPreview] = useState({ open: false, title: "", b64: "" });
  const [form, setForm] = useState({
    matter_id: "",
    document_id: "",
    title: "Retainer agreement",
    document_title: "Retainer Agreement",
    signer_name: "",
    signer_email: "",
  });
  const [busy, setBusy] = useState(false);

  const reload = () => {
    setLoading(true);
    listSignRequests()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(reload, []);
  useEffect(() => {
    api.get("/matters").then((r) => setMatters(r.data?.items || r.data || [])).catch(() => setMatters([]));
  }, []);

  useEffect(() => {
    if (!form.matter_id) {
      setMatterDocs([]);
      return;
    }
    api.get(`/documents?matter_id=${form.matter_id}`).then((r) => setMatterDocs(r.data || [])).catch(() => setMatterDocs([]));
  }, [form.matter_id]);

  const onCreate = async (e) => {
    e.preventDefault();
    if (!form.matter_id) {
      toast.error("Select a matter");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title: form.title,
        document_title: form.document_title,
        signer_name: form.signer_name,
        signer_email: form.signer_email,
      };
      if (form.document_id) payload.document_id = form.document_id;
      const data = await createSignRequest(form.matter_id, payload);
      const url = data.dev_sign_url || data.sign_request?.sign_url;
      if (url && data.dev_sign_url) {
        await navigator.clipboard.writeText(url);
        toast.success(data.email_sent ? "Sign request created — link copied (dev)" : "Sign request created — link copied (email skipped, no Resend key)");
      } else if (data.email_sent) {
        toast.success("Sign request emailed to signer");
      } else {
        toast.success("Sign request created (configure Resend to email signers)");
      }
      if (form.document_id && data.sign_request?.id) {
        setFieldEditor({
          signId: data.sign_request.id,
          pdfB64: null,
          documentId: form.document_id,
        });
        const docView = await viewDocument(form.document_id);
        setFieldEditor({
          signId: data.sign_request.id,
          pdfB64: docView.data_b64,
          documentId: form.document_id,
        });
      } else {
        setShowForm(false);
      }
      reload();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not create sign request");
    } finally {
      setBusy(false);
    }
  };

  const saveFields = async (fields) => {
    if (!fieldEditor?.signId) return;
    setBusy(true);
    try {
      await patchSignFields(fieldEditor.signId, fields);
      toast.success("Signature fields saved");
      setFieldEditor(null);
      setShowForm(false);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not save fields");
    } finally {
      setBusy(false);
    }
  };

  const previewDoc = async (docId, name) => {
    try {
      const data = await viewDocument(docId);
      setPdfPreview({ open: true, title: name, b64: data.data_b64 });
    } catch {
      toast.error("Could not load PDF");
    }
  };

  const downloadSigned = async (signId) => {
    try {
      const data = await downloadSignedPdfStaff(signId);
      downloadB64File(data.name, data.content_type, data.data_b64);
    } catch {
      toast.error("Signed PDF not available");
    }
  };

  const onResend = async (signId) => {
    setBusy(true);
    try {
      const data = await resendSignInvite(signId);
      if (data.dev_sign_url) {
        await navigator.clipboard.writeText(data.dev_sign_url);
        toast.success(data.email_sent ? "Invite resent — link copied (dev)" : "Link copied (email skipped, no Resend key)");
      } else if (data.email_sent) {
        toast.success("Sign invite resent by email");
      } else {
        toast.error("Email not sent — add RESEND_API_KEY");
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not resend invite");
    } finally {
      setBusy(false);
    }
  };

  const pdfDocs = matterDocs.filter(isPdfDoc);

  return (
    <div className="px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="overline mb-2">// nativesign</div>
          <h1 className="font-display font-black text-3xl tracking-tight flex items-center gap-3">
            <ScrollText className="text-praxium-accent" /> NativeSign
          </h1>
          <p className="text-sm text-praxium-subtle mt-2 max-w-2xl">
            In-app e-signature — PDF viewer, field placement, flattened signed PDF download. DocuSign optional in v2.
          </p>
        </div>
        <button type="button" className="btn-praxium" onClick={() => setShowForm(true)} data-testid="esign-new">
          <Plus size={16} className="inline mr-1" /> New sign request
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="data-card p-5">
          <Upload className="text-praxium-accent mb-3" size={20} />
          <div className="font-display font-bold mb-1">Attach PDF</div>
          <p className="text-xs text-praxium-subtle">Upload a matter PDF, place signature/date fields, send magic link.</p>
        </div>
        <div className="data-card p-5">
          <Users className="text-praxium-accent mb-3" size={20} />
          <div className="font-display font-bold mb-1">Client signs</div>
          <p className="text-xs text-praxium-subtle">Review PDF in-browser, draw signature on overlay fields.</p>
        </div>
        <div className="data-card p-5">
          <ScrollText className="text-praxium-accent mb-3" size={20} />
          <div className="font-display font-bold mb-1">Audit trail</div>
          <p className="text-xs text-praxium-subtle">View/sign events logged · signed PDF stored on matter.</p>
        </div>
      </div>

      {fieldEditor?.pdfB64 ? (
        <div className="data-card p-6 mb-6">
          <h2 className="font-display font-bold mb-4">Place signature fields</h2>
          <PdfFieldEditor
            pdfB64={fieldEditor.pdfB64}
            onSave={saveFields}
            onCancel={() => setFieldEditor(null)}
            saving={busy}
          />
        </div>
      ) : null}

      {showForm && !fieldEditor ? (
        <form onSubmit={onCreate} className="data-card p-6 mb-6 max-w-xl space-y-4">
          <h2 className="font-display font-bold">New sign request</h2>
          <label className="block text-sm">
            Matter
            <select
              className="input-praxium w-full mt-1"
              value={form.matter_id}
              onChange={(e) => setForm({ ...form, matter_id: e.target.value, document_id: "" })}
              required
            >
              <option value="">Select matter…</option>
              {matters.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.case_number} — {m.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            PDF template (optional)
            <select
              className="input-praxium w-full mt-1"
              value={form.document_id}
              onChange={(e) => {
                const doc = pdfDocs.find((d) => d.id === e.target.value);
                setForm({
                  ...form,
                  document_id: e.target.value,
                  document_title: doc?.name || form.document_title,
                });
              }}
            >
              <option value="">Generate blank agreement PDF</option>
              {pdfDocs.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </label>
          {form.document_id ? (
            <button
              type="button"
              className="btn-ghost text-xs inline-flex items-center gap-1"
              onClick={() => previewDoc(form.document_id, form.document_title)}
            >
              <Eye size={12} /> Preview PDF
            </button>
          ) : null}
          <label className="block text-sm">
            Request title
            <input className="input-praxium w-full mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </label>
          <label className="block text-sm">
            Document title
            <input className="input-praxium w-full mt-1" value={form.document_title} onChange={(e) => setForm({ ...form, document_title: e.target.value })} required />
          </label>
          <label className="block text-sm">
            Signer name
            <input className="input-praxium w-full mt-1" value={form.signer_name} onChange={(e) => setForm({ ...form, signer_name: e.target.value })} required />
          </label>
          <label className="block text-sm">
            Signer email
            <input type="email" className="input-praxium w-full mt-1" value={form.signer_email} onChange={(e) => setForm({ ...form, signer_email: e.target.value })} required />
          </label>
          <div className="flex gap-2">
            <button type="submit" className="btn-praxium" disabled={busy}>{busy ? "Sending…" : "Send sign link"}</button>
            <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      ) : null}

      <div className="data-card overflow-hidden">
        <div className="px-5 py-3 border-b border-praxium-line overline">Envelopes</div>
        {loading ? (
          <p className="p-5 text-sm text-praxium-subtle">Loading…</p>
        ) : items.length === 0 ? (
          <p className="p-5 text-sm text-praxium-subtle">No sign requests yet.</p>
        ) : (
          <ul className="divide-y divide-praxium-line">
            {items.map((item) => (
              <li key={item.id} className="px-5 py-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-xs text-praxium-subtle">
                    {item.signer_name} · {item.signer_email} · {STATUS_LABEL[item.status] || item.status}
                    {item.document_id ? " · PDF attached" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {item.status === "pending" && item.sign_url ? (
                    <>
                      <button
                        type="button"
                        className="btn-ghost text-xs flex items-center gap-1 min-h-[44px] px-2"
                        onClick={() => onResend(item.id)}
                        disabled={busy}
                      >
                        <Mail size={12} /> Resend email
                      </button>
                      <button
                        type="button"
                        className="btn-ghost text-xs flex items-center gap-1 min-h-[44px] px-2"
                        onClick={() => {
                          navigator.clipboard.writeText(item.sign_url);
                          toast.success("Sign link copied");
                        }}
                      >
                        <Copy size={12} /> Copy link
                      </button>
                    </>
                  ) : item.status === "signed" ? (
                    <>
                      <span className="text-xs font-mono text-emerald-700">Signed {new Date(item.signed_at).toLocaleString()}</span>
                      <button type="button" className="btn-ghost text-xs flex items-center gap-1" onClick={() => downloadSigned(item.id)}>
                        <Download size={12} /> PDF
                      </button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-praxium-subtle mt-4">
        Public sign page: <code className="font-mono">/sign/:token</code> · Configure{" "}
        <Link to="/settings" className="text-praxium-accent-text hover:underline">Resend</Link> in backend env for prod email delivery.
      </p>

      <PdfViewerModal
        open={pdfPreview.open}
        title={pdfPreview.title}
        pdfB64={pdfPreview.b64}
        onClose={() => setPdfPreview({ open: false, title: "", b64: "" })}
      />
    </div>
  );
}
