import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, FileDown, Lock, PenLine } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/utils";
import { getMatterLetters, generateLetter, sendLetterForSignature } from "@/lib/lettersApi";
import { downloadB64File } from "@/lib/documentsApi";
import api from "@/lib/api";

function inputClass() {
  return "w-full text-xs border border-praxium-line rounded-sm px-2 py-1 bg-white";
}

/**
 * DocGen letters card — lists letter types for a tab, generates DOCX/PDF,
 * files the output on the matter, and shows recently generated letters.
 * `extraPayload` is merged into the generate request (e.g. scenario_id).
 */
export default function MatterLettersCard({ matterId, tab, extraPayload = {}, refreshKey = 0 }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dropRecipient, setDropRecipient] = useState({ name: "", address: "" });
  const [selectedBillIds, setSelectedBillIds] = useState([]);
  const [attachBills, setAttachBills] = useState({});
  const [lorSide, setLorSide] = useState("third_party");

  const load = useCallback(() => {
    getMatterLetters(matterId)
      .then(setData)
      .catch(() => toast.error("Could not load letter catalog"));
  }, [matterId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    setSelectedBillIds((data?.medpay_bills || []).map((b) => b.id));
  }, [data]);

  if (!data) return null;

  const medpayBills = data.medpay_bills || [];

  const toggleBill = (id) => {
    setSelectedBillIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  const toggleAttachBills = (letterId) => {
    setAttachBills((m) => ({ ...m, [letterId]: !m[letterId] }));
  };

  const letters = (data.letters || []).filter(
    (l) => l.tab === tab && l.id !== "reduction_request" && l.id !== "lien_verification"
  );
  const recent = data.recent || [];

  const generate = async (letterType, format) => {
    setBusy(true);
    try {
      const payload = { letter_type: letterType, format, ...extraPayload };
      if (letterType === "drop") {
        if (dropRecipient.name.trim()) payload.recipient_name = dropRecipient.name.trim();
        if (dropRecipient.address.trim()) payload.recipient_address = dropRecipient.address.trim();
      }
      if (letterType === "lor") {
        payload.side = lorSide;
      }
      if (letterType === "medpay" && medpayBills.length) {
        payload.ledger_row_ids = selectedBillIds;
      }
      if (letterType === "medpay" || letterType === "demand") {
        if (attachBills[letterType]) {
          if (format === "pdf") {
            payload.include_bills = true;
          } else {
            toast.warning("Bill attachment applies to PDF format — generating DOCX without bills");
          }
        }
      }
      const r = await generateLetter(matterId, payload);
      toast.success(
        `${r.name} filed on the matter${r.watermark ? " — DRAFT watermark until attorney approval" : ""}`
      );
      (r.warnings || []).forEach((w) => toast.warning(w));
      if (r.attached_bills?.length) toast.success(`Attached ${r.attached_bills.length} bill PDF(s)`);
      (r.missing_bill_providers || []).forEach((name) => toast.warning(`No bill PDF found for ${name}`));
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Letter generation failed");
    } finally {
      setBusy(false);
    }
  };

  const downloadDoc = async (docId) => {
    try {
      const r = await api.get(`/documents/${docId}/download`);
      downloadB64File(r.data.name, r.data.content_type, r.data.data_b64);
    } catch {
      toast.error("Download failed");
    }
  };

  const client = data.client;

  const sendForSignature = async (doc) => {
    if (!client?.name || !client?.email) {
      toast.error("Link a client contact with name and email first (Intake tab)");
      return;
    }
    setBusy(true);
    try {
      const r = await sendLetterForSignature(matterId, doc, client);
      const url = r.dev_sign_url || r.sign_request?.sign_url;
      if (r.dev_sign_url && url) {
        await navigator.clipboard.writeText(url);
        toast.success("Sign link copied (dev)");
      } else if (r.email_sent) {
        toast.success(`Sign request emailed to ${client.name}`);
      } else {
        toast.success("Sign request created (configure email to notify the client)");
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not send for signature");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="data-card p-4 space-y-3" data-testid={`letters-card-${tab}`}>
      <div className="overline text-[10px] flex items-center gap-2">
        <FileText size={12} /> Letters — DocGen
      </div>
      <ul className="space-y-2">
        {letters.map((l) => {
          const blocked = l.blockers?.length > 0 || !l.permission_ok;
          return (
            <li key={l.id} className="text-sm border-b border-praxium-line pb-2 last:border-b-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{l.label}</span>
                {l.draft_watermark ? (
                  <span className="text-[10px] font-mono uppercase bg-amber-100 text-amber-900 border border-amber-200 rounded px-1">
                    draft watermark
                  </span>
                ) : null}
                <span className="ml-auto flex gap-1">
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    disabled={busy || blocked}
                    onClick={() => generate(l.id, "docx")}
                    data-testid={`letter-generate-${l.id}-docx`}
                  >
                    <FileDown size={11} /> DOCX
                  </button>
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    disabled={busy || blocked}
                    onClick={() => generate(l.id, "pdf")}
                    data-testid={`letter-generate-${l.id}-pdf`}
                  >
                    <FileDown size={11} /> PDF
                  </button>
                </span>
              </div>
              <p className="text-xs text-praxium-subtle">{l.description}</p>
              {l.blockers?.map((b) => (
                <p key={b} className="text-xs text-amber-800 flex items-center gap-1">
                  <Lock size={10} /> {b}
                </p>
              ))}
              {l.missing_fields?.length ? (
                <div className="text-[11px] text-praxium-subtle mt-1" data-testid={`letter-missing-fields-${l.id}`}>
                  <span className="font-mono uppercase text-[10px] text-amber-800">
                    Missing {l.missing_fields.length} merge field{l.missing_fields.length > 1 ? "s" : ""}:
                  </span>{" "}
                  {l.missing_fields.map((f, i) => (
                    <span key={f.field}>
                      {i > 0 ? " · " : ""}
                      {f.label} <span className="text-praxium-subtle/70">({f.source})</span>
                    </span>
                  ))}
                </div>
              ) : null}
              {l.id === "drop" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <input
                    className={inputClass()}
                    placeholder="Recipient (provider / lien holder)"
                    value={dropRecipient.name}
                    onChange={(e) => setDropRecipient((d) => ({ ...d, name: e.target.value }))}
                    data-testid="letter-drop-recipient"
                  />
                  <input
                    className={inputClass()}
                    placeholder="Recipient address"
                    value={dropRecipient.address}
                    onChange={(e) => setDropRecipient((d) => ({ ...d, address: e.target.value }))}
                  />
                </div>
              ) : null}
              {l.id === "lor" ? (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-mono uppercase text-praxium-subtle">Side</span>
                  <select
                    className={inputClass() + " w-auto"}
                    value={lorSide}
                    onChange={(e) => setLorSide(e.target.value)}
                    data-testid="letter-lor-side"
                  >
                    <option value="third_party">3P (adverse carrier)</option>
                    <option value="first_party">1P (own carrier)</option>
                  </select>
                </div>
              ) : null}
              {l.id === "medpay" && medpayBills.length ? (
                <div className="mt-2 space-y-1">
                  {medpayBills.map((bill) => (
                    <label key={bill.id} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={selectedBillIds.includes(bill.id)}
                        onChange={() => toggleBill(bill.id)}
                        data-testid={`letter-medpay-bill-${bill.id}`}
                      />
                      <span>
                        {bill.provider_name} — {formatMoney(bill.balance)}
                      </span>
                      {!bill.has_bill_pdf ? (
                        <span className="text-[10px] text-praxium-subtle">no bill PDF</span>
                      ) : null}
                    </label>
                  ))}
                </div>
              ) : null}
              {l.id === "medpay" || l.id === "demand" ? (
                <label className="flex items-center gap-2 text-xs mt-2">
                  <input
                    type="checkbox"
                    checked={!!attachBills[l.id]}
                    onChange={() => toggleAttachBills(l.id)}
                    data-testid={`letter-attach-bills-${l.id}`}
                  />
                  <span>Attach bill PDFs</span>
                  <span className="text-[10px] text-praxium-subtle">
                    PDF format only — appends matching bill documents
                  </span>
                </label>
              ) : null}
            </li>
          );
        })}
      </ul>

      {recent.length > 0 ? (
        <div>
          <div className="overline text-[10px] mb-1">Generated letters</div>
          <ul className="space-y-1">
            {recent.slice(0, 6).map((doc) => (
              <li key={doc.id} className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  className="text-praxium-accent-text hover:underline truncate max-w-[60%] text-left"
                  onClick={() => downloadDoc(doc.id)}
                  title={doc.name}
                >
                  {doc.name}
                </button>
                {doc.letter?.watermark ? (
                  <span className="text-[10px] font-mono uppercase text-amber-800">draft</span>
                ) : null}
                {doc.signable ? (
                  <button
                    type="button"
                    className="btn-ghost text-[10px] inline-flex items-center gap-1"
                    disabled={busy}
                    onClick={() => sendForSignature(doc)}
                    title="Send this PDF letter to the client for e-signature (NativeSign)"
                    data-testid={`letter-sign-${doc.id}`}
                  >
                    <PenLine size={10} /> Sign
                  </button>
                ) : null}
                <span className="text-praxium-subtle ml-auto font-mono">
                  {formatDate(doc.uploaded_at)} · {doc.letter?.generated_by_name || ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
