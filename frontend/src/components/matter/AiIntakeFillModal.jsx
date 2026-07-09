import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { X, Sparkles, FileText, Mic, MicOff } from "lucide-react";
import api from "@/lib/api";

const SR = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : undefined;

function get(obj, path) {
  return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function set(obj, path, value) {
  const keys = path.split(".");
  const next = { ...obj };
  let cursor = next;
  keys.forEach((key, i) => {
    if (i === keys.length - 1) {
      cursor[key] = value;
    } else {
      cursor[key] = { ...(cursor[key] || {}) };
      cursor = cursor[key];
    }
  });
  return next;
}

// Fields we manage, in review-form order, grouped by section.
const FIELD_GROUPS = [
  {
    title: "Client",
    fields: [
      { path: "contact.name", label: "Name" },
      { path: "contact.phone", label: "Phone" },
      { path: "contact.email", label: "Email" },
      { path: "contact.address", label: "Address" },
      { path: "contact.date_of_birth", label: "Date of birth" },
    ],
  },
  {
    title: "Matter",
    fields: [
      { path: "matter.incident_date", label: "Incident date" },
      { path: "matter.description", label: "Description" },
    ],
  },
  {
    title: "Insurance — 3P (third party)",
    fields: [
      { path: "insurance.third_party.carrier_name", label: "Carrier name" },
      { path: "insurance.third_party.claim_number", label: "Claim number" },
      { path: "insurance.third_party.policy_number", label: "Policy number" },
      { path: "insurance.third_party.adjuster.name", label: "Adjuster name" },
      { path: "insurance.third_party.adjuster.phone", label: "Adjuster phone" },
      { path: "insurance.third_party.adjuster.email", label: "Adjuster email" },
      { path: "insurance.third_party.adjuster.mailing_address", label: "Adjuster mailing address" },
    ],
  },
  {
    title: "Insurance — 1P (first party)",
    fields: [
      { path: "insurance.first_party.carrier_name", label: "Carrier name" },
      { path: "insurance.first_party.claim_number", label: "Claim number" },
      { path: "insurance.first_party.policy_number", label: "Policy number" },
      { path: "insurance.first_party.medpay_limit", label: "MedPay limit", numeric: true },
      { path: "insurance.first_party.adjuster.name", label: "Adjuster name" },
      { path: "insurance.first_party.adjuster.phone", label: "Adjuster phone" },
      { path: "insurance.first_party.adjuster.email", label: "Adjuster email" },
      { path: "insurance.first_party.adjuster.mailing_address", label: "Adjuster mailing address" },
    ],
  },
];

function isDocSelectable(doc) {
  const ct = (doc.content_type || "").toLowerCase();
  const name = (doc.name || "").toLowerCase();
  return ct.includes("pdf") || ct.includes("text") || name.endsWith(".pdf") || name.endsWith(".txt");
}

export default function AiIntakeFillModal({ matterId, open, onClose, onApplied }) {
  const [step, setStep] = useState(1);
  const [docs, setDocs] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [running, setRunning] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState(null); // { proposals, current, missing_fields, client_contact_id }
  const [values, setValues] = useState({});
  const [recordingPath, setRecordingPath] = useState(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setResult(null);
    setValues({});
    setSelectedDocIds([]);
    setLoadingDocs(true);
    api
      .get(`/documents?matter_id=${matterId}`)
      .then((r) => {
        const list = (r.data || []).filter(isDocSelectable);
        setDocs(list);
        setSelectedDocIds(list.map((d) => d.id));
      })
      .catch(() => toast.error("Could not load documents"))
      .finally(() => setLoadingDocs(false));
  }, [open, matterId]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  if (!open) return null;

  const toggleDoc = (id) => {
    setSelectedDocIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  const missingPaths = new Set((result?.missing_fields || []).map((m) => m.path));

  const runAiFill = async () => {
    setRunning(true);
    try {
      const payload = {};
      if (selectedDocIds.length && selectedDocIds.length !== docs.length) {
        payload.document_ids = selectedDocIds;
      }
      const r = await api.post(`/matters/${matterId}/ai/intake-fill`, payload);
      const { proposals, current } = r.data;
      const seeded = {};
      FIELD_GROUPS.forEach((group) => {
        group.fields.forEach(({ path }) => {
          const proposed = get(proposals, path);
          const existing = get(current, path);
          seeded[path] = proposed ?? existing ?? "";
        });
      });
      setResult(r.data);
      setValues(seeded);
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.detail || "AI intake fill failed");
    } finally {
      setRunning(false);
    }
  };

  const updateValue = (path, v) => {
    setValues((prev) => set(prev, path, v));
  };

  const toggleMic = (path, label) => {
    if (!SR) return;
    if (recordingPath === path) {
      recognitionRef.current?.stop();
      return;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      if (transcript.trim()) {
        setValues((prev) => {
          const existing = (get(prev, path) || "").toString();
          const next = existing ? `${existing} ${transcript.trim()}` : transcript.trim();
          return set(prev, path, next);
        });
      }
    };
    recognition.onerror = () => {
      toast.error(`Could not capture speech for ${label}`);
      setRecordingPath(null);
    };
    recognition.onend = () => {
      setRecordingPath(null);
    };
    recognitionRef.current = recognition;
    setRecordingPath(path);
    recognition.start();
  };

  const apply = async () => {
    if (!result) return;
    setApplying(true);
    try {
      const current = result.current || {};

      // --- contact ---
      const contactPatch = {};
      ["name", "phone", "email", "address", "date_of_birth"].forEach((key) => {
        const path = `contact.${key}`;
        const v = (values[path] ?? "").toString().trim();
        const currentV = get(current, path);
        if (v && v !== (currentV || "")) contactPatch[key] = v;
      });
      if (result.client_contact_id) {
        if (Object.keys(contactPatch).length) {
          await api.put(`/contacts/${result.client_contact_id}`, contactPatch);
        }
      } else if ((values["contact.name"] || "").toString().trim()) {
        const createPayload = { kind: "client", ...contactPatch };
        if (!createPayload.name) createPayload.name = values["contact.name"].toString().trim();
        const r = await api.post("/contacts", createPayload);
        const newId = r.data?.id;
        if (newId) {
          await api.put(`/matters/${matterId}`, { client_id: newId });
        }
      }

      // --- matter ---
      const matterPatch = {};
      ["incident_date", "description"].forEach((key) => {
        const path = `matter.${key}`;
        const v = (values[path] ?? "").toString().trim();
        const currentV = get(current, path);
        if (v && v !== (currentV || "")) matterPatch[key] = v;
      });
      if (Object.keys(matterPatch).length) {
        await api.put(`/matters/${matterId}`, matterPatch);
      }

      // --- insurance ---
      const insurancePatch = {};
      ["third_party", "first_party"].forEach((side) => {
        const sidePatch = {};
        ["carrier_name", "claim_number", "policy_number"].forEach((key) => {
          const path = `insurance.${side}.${key}`;
          const v = (values[path] ?? "").toString().trim();
          const currentV = get(current, path);
          if (v && v !== (currentV || "")) sidePatch[key] = v;
        });
        const adjusterPatch = {};
        ["name", "phone", "email", "mailing_address"].forEach((key) => {
          const path = `insurance.${side}.adjuster.${key}`;
          const v = (values[path] ?? "").toString().trim();
          const currentV = get(current, path);
          if (v && v !== (currentV || "")) adjusterPatch[key] = v;
        });
        if (Object.keys(adjusterPatch).length) sidePatch.adjuster = adjusterPatch;
        if (side === "first_party") {
          const path = "insurance.first_party.medpay_limit";
          const raw = values[path];
          const v = raw === "" || raw == null ? null : Number(raw);
          const currentV = get(current, path);
          if (v != null && !Number.isNaN(v) && v !== currentV) {
            sidePatch.medpay = { limit: v };
          }
        }
        if (Object.keys(sidePatch).length) insurancePatch[side] = sidePatch;
      });
      if (Object.keys(insurancePatch).length) {
        await api.patch(`/matters/${matterId}/insurance`, insurancePatch);
      }

      toast.success("Intake fields applied");
      onApplied?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Applying intake fields failed");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" data-testid="ai-intake-fill-modal">
      <div className="data-card w-full max-w-3xl max-h-[90vh] overflow-y-auto p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="overline mb-1 flex items-center gap-2">
              <Sparkles size={12} /> // ai fill from documents
            </div>
            <p className="text-sm text-praxium-subtle max-w-xl">
              Extract intake fields from uploaded case documents, then review and fill any gaps.
            </p>
          </div>
          <button type="button" className="btn-ghost p-2" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <div className="overline mb-2">// documents to read</div>
              {loadingDocs ? (
                <p className="text-sm text-praxium-subtle">Loading documents…</p>
              ) : docs.length === 0 ? (
                <p className="text-sm text-praxium-subtle">No readable documents found on the Documents tab.</p>
              ) : (
                <ul className="space-y-1 max-h-64 overflow-y-auto border border-praxium-line rounded-sm p-2">
                  {docs.map((doc) => (
                    <li key={doc.id}>
                      <label className="flex items-center gap-2 text-sm cursor-pointer py-1">
                        <input
                          type="checkbox"
                          checked={selectedDocIds.includes(doc.id)}
                          onChange={() => toggleDoc(doc.id)}
                          data-testid={`ai-fill-doc-${doc.id}`}
                        />
                        <FileText size={12} className="text-praxium-subtle shrink-0" />
                        <span className="truncate">{doc.name}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost text-sm" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-praxium text-sm"
                disabled={running || !selectedDocIds.length}
                onClick={runAiFill}
                data-testid="ai-fill-run"
              >
                {running ? "Reading documents…" : "Run AI fill"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {FIELD_GROUPS.map((group) => (
              <div key={group.title} className="data-card p-4 space-y-3">
                <div className="overline">// {group.title.toLowerCase()}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {group.fields.map(({ path, label, numeric }) => {
                    const missing = missingPaths.has(path);
                    const currentV = get(result?.current, path);
                    const proposedV = get(result?.proposals, path);
                    const showWasNote =
                      currentV != null && currentV !== "" && proposedV != null && proposedV !== currentV;
                    const isRecording = recordingPath === path;
                    return (
                      <div key={path} className="text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-mono uppercase text-praxium-subtle">{label}</span>
                          {missing ? (
                            <span className="text-[10px] font-mono uppercase bg-amber-100 text-amber-900 border border-amber-200 rounded px-1">
                              needs info
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 flex items-center gap-1">
                          <input
                            type={numeric ? "number" : "text"}
                            value={values[path] ?? ""}
                            onChange={(e) => updateValue(path, e.target.value)}
                            className={`flex-1 text-sm px-2 py-1.5 border rounded-sm ${
                              missing ? "border-amber-400" : "border-praxium-line"
                            }`}
                            data-testid={`ai-fill-field-${path}`}
                          />
                          {SR ? (
                            <button
                              type="button"
                              className={`btn-ghost p-1.5 ${isRecording ? "animate-pulse text-red-600 border-red-400" : ""}`}
                              onClick={() => toggleMic(path, label)}
                              aria-label={isRecording ? `Stop recording ${label}` : `Speak ${label}`}
                              data-testid={`ai-fill-mic-${path}`}
                            >
                              {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
                            </button>
                          ) : null}
                        </div>
                        {showWasNote ? (
                          <p className="text-xs text-praxium-subtle mt-0.5">was: {currentV}</p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex justify-between gap-2">
              <button type="button" className="btn-ghost text-sm" onClick={() => setStep(1)}>
                Back
              </button>
              <div className="flex gap-2">
                <button type="button" className="btn-ghost text-sm" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-praxium text-sm"
                  disabled={applying}
                  onClick={apply}
                  data-testid="ai-fill-apply"
                >
                  {applying ? "Applying…" : "Apply"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
