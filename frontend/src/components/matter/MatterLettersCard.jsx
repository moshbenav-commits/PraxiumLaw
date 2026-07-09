import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, FileDown, Lock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { getMatterLetters, generateLetter } from "@/lib/lettersApi";
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

  const load = useCallback(() => {
    getMatterLetters(matterId)
      .then(setData)
      .catch(() => toast.error("Could not load letter catalog"));
  }, [matterId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (!data) return null;

  const letters = (data.letters || []).filter((l) => l.tab === tab && l.id !== "reduction_request");
  const recent = data.recent || [];

  const generate = async (letterType, format) => {
    setBusy(true);
    try {
      const payload = { letter_type: letterType, format, ...extraPayload };
      if (letterType === "drop") {
        if (dropRecipient.name.trim()) payload.recipient_name = dropRecipient.name.trim();
        if (dropRecipient.address.trim()) payload.recipient_address = dropRecipient.address.trim();
      }
      const r = await generateLetter(matterId, payload);
      toast.success(
        `${r.name} filed on the matter${r.watermark ? " — DRAFT watermark until attorney approval" : ""}`
      );
      (r.warnings || []).forEach((w) => toast.warning(w));
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
                  className="text-praxium-accent hover:underline truncate max-w-[60%] text-left"
                  onClick={() => downloadDoc(doc.id)}
                  title={doc.name}
                >
                  {doc.name}
                </button>
                {doc.letter?.watermark ? (
                  <span className="text-[10px] font-mono uppercase text-amber-800">draft</span>
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
