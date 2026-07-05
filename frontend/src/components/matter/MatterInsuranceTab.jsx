import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { ExternalLink, Shield, AlertCircle } from "lucide-react";
import PageLoader from "@/components/common/PageLoader";

const LOR_OPTIONS = [
  { value: "not_sent", label: "Not sent" },
  { value: "sent", label: "Sent" },
  { value: "acknowledged", label: "Acknowledged" },
];

const LIABILITY_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "denied", label: "Denied" },
  { value: "partial", label: "Partial" },
];

const POLICY_TYPES = [
  { value: "unknown", label: "Unknown" },
  { value: "personal", label: "Personal" },
  { value: "commercial", label: "Commercial" },
];

const CARRIER_PII_ITEMS = [
  { key: "withheld_client_phone", label: "Did not give client phone" },
  { key: "withheld_client_address", label: "Did not give client address" },
  { key: "withheld_client_dob", label: "Did not give client DOB" },
  { key: "withheld_client_ssn", label: "Did not give client SSN" },
  { key: "withheld_accident_narrative", label: "Did not describe how accident happened" },
  { key: "shared_injuries_only", label: "Shared injuries only (no client PII)" },
  { key: "defendant_vehicle_confirmed", label: "Confirmed defendant vehicle / plate only if asked" },
];

function CarrierCallPiiChecklist({ pii, onChange, onAcknowledge }) {
  const complete = CARRIER_PII_ITEMS.every((item) => Boolean(pii?.[item.key]));
  return (
    <div className="data-card p-5 space-y-3" data-testid="carrier-call-pii-checklist">
      <div>
        <div className="overline mb-1">// carrier open-call PII gate</div>
        <p className="text-xs text-praxium-subtle">
          Training: give adjuster policy/claim info only — never client phone, address, DOB, or SSN. Injuries only; no accident narrative.
        </p>
      </div>
      <ul className="space-y-2">
        {CARRIER_PII_ITEMS.map((item) => (
          <li key={item.key}>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(pii?.[item.key])}
                onChange={(e) => onChange({ [item.key]: e.target.checked })}
                data-testid={`pii-${item.key}`}
              />
              <span>{item.label}</span>
            </label>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn-praxium text-sm"
        disabled={!complete}
        onClick={onAcknowledge}
        data-testid="pii-acknowledge"
      >
        Acknowledge call followed PII policy
      </button>
      {pii?.acknowledged_at ? (
        <p className="text-xs font-mono text-emerald-800">Acknowledged {pii.acknowledged_at}</p>
      ) : null}
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <label className="block text-sm">
      <span className="text-xs font-mono uppercase text-praxium-subtle">{label}</span>
      <div className="mt-1">{children}</div>
      {hint ? <p className="text-[10px] text-praxium-subtle mt-1">{hint}</p> : null}
    </label>
  );
}

function inputClass(extra = "") {
  return `w-full text-sm border border-praxium-line rounded-sm px-2 py-1.5 bg-white ${extra}`;
}

function mergeSide(side, partial) {
  const next = { ...side, ...partial };
  if (partial.adjuster) next.adjuster = { ...side.adjuster, ...partial.adjuster };
  if (partial.pd_adjuster) next.pd_adjuster = { ...side.pd_adjuster, ...partial.pd_adjuster };
  if (partial.lor) next.lor = { ...side.lor, ...partial.lor };
  if (partial.limits) next.limits = { ...side.limits, ...partial.limits };
  if (partial.liability) next.liability = { ...side.liability, ...partial.liability };
  if (partial.medpay) next.medpay = { ...side.medpay, ...partial.medpay };
  return next;
}

function ClaimSidePanel({ title, sideKey, data, onUpdate, onSave, trainingHint, showDriverOwner, showMedpayNote }) {
  const touch = (partial, persist = false) => {
    onUpdate(sideKey, partial);
    if (persist) onSave(sideKey, partial);
  };

  const patchAdjuster = (field, value, persist) => {
    touch({ adjuster: { [field]: value } }, persist);
  };

  const patchPdAdjuster = (field, value, persist) => {
    touch({ pd_adjuster: { [field]: value } }, persist);
  };

  const patchLor = (field, value) => {
    touch({ lor: { [field]: value } }, true);
  };

  const patchLimits = (field, value, persist) => {
    touch({ limits: { [field]: value } }, persist);
  };

  const patchLiability = (field, value, persist) => {
    touch({ liability: { [field]: value } }, persist);
  };

  return (
    <div className="data-card p-5 space-y-5" data-testid={`insurance-${sideKey}`}>
      <div>
        <div className="overline mb-1">{title}</div>
        {trainingHint ? <p className="text-xs text-praxium-subtle">{trainingHint}</p> : null}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={Boolean(data.opened)}
          onChange={(e) => touch({
            opened: e.target.checked,
            opened_date: e.target.checked && !data.opened_date ? new Date().toISOString().slice(0, 10) : data.opened_date,
          }, true)}
        />
        Claim opened
        {data.opened_date ? <span className="text-xs font-mono text-praxium-subtle">({data.opened_date})</span> : null}
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Carrier">
          <input className={inputClass()} value={data.carrier_name || ""} onChange={(e) => touch({ carrier_name: e.target.value })} onBlur={(e) => touch({ carrier_name: e.target.value }, true)} />
        </Field>
        <Field label="Policy type">
          <select className={inputClass()} value={data.policy_type || "unknown"} onChange={(e) => touch({ policy_type: e.target.value }, true)}>
            {POLICY_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Policy number">
          <input className={inputClass()} value={data.policy_number || ""} onChange={(e) => touch({ policy_number: e.target.value })} onBlur={(e) => touch({ policy_number: e.target.value }, true)} />
        </Field>
        <Field label="Claim number">
          <input className={inputClass()} value={data.claim_number || ""} onChange={(e) => touch({ claim_number: e.target.value })} onBlur={(e) => touch({ claim_number: e.target.value }, true)} />
        </Field>
      </div>

      {showDriverOwner ? (
        <Field label="Driver same as owner?" hint="If not, there may be additional coverage.">
          <select
            className={inputClass()}
            value={data.driver_is_owner === null || data.driver_is_owner === undefined ? "" : data.driver_is_owner ? "yes" : "no"}
            onChange={(e) => touch({ driver_is_owner: e.target.value === "" ? null : e.target.value === "yes" }, true)}
          >
            <option value="">Not set</option>
            <option value="yes">Yes</option>
            <option value="no">No — check owner + driver policies</option>
          </select>
        </Field>
      ) : null}

      <div className="border-t border-praxium-line pt-4">
        <div className="overline mb-3">// BI adjuster</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Name"><input className={inputClass()} value={data.adjuster?.name || ""} onChange={(e) => patchAdjuster("name", e.target.value, false)} onBlur={(e) => patchAdjuster("name", e.target.value, true)} /></Field>
          <Field label="Phone"><input className={inputClass()} value={data.adjuster?.phone || ""} onChange={(e) => patchAdjuster("phone", e.target.value, false)} onBlur={(e) => patchAdjuster("phone", e.target.value, true)} /></Field>
          <Field label="Email"><input className={inputClass()} value={data.adjuster?.email || ""} onChange={(e) => patchAdjuster("email", e.target.value, false)} onBlur={(e) => patchAdjuster("email", e.target.value, true)} /></Field>
          <Field label="Fax"><input className={inputClass()} value={data.adjuster?.fax || ""} onChange={(e) => patchAdjuster("fax", e.target.value, false)} onBlur={(e) => patchAdjuster("fax", e.target.value, true)} /></Field>
        </div>
        <Field label="Mailing address">
          <textarea rows={2} className={inputClass()} value={data.adjuster?.mailing_address || ""} onChange={(e) => patchAdjuster("mailing_address", e.target.value, false)} onBlur={(e) => patchAdjuster("mailing_address", e.target.value, true)} />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={Boolean(data.bi_pd_same_adjuster)} onChange={(e) => touch({ bi_pd_same_adjuster: e.target.checked }, true)} />
        BI and PD same adjuster
      </label>

      {!data.bi_pd_same_adjuster ? (
        <div className="border-t border-praxium-line pt-4">
          <div className="overline mb-3">// PD adjuster</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Name"><input className={inputClass()} value={data.pd_adjuster?.name || ""} onChange={(e) => patchPdAdjuster("name", e.target.value, false)} onBlur={(e) => patchPdAdjuster("name", e.target.value, true)} /></Field>
            <Field label="Phone"><input className={inputClass()} value={data.pd_adjuster?.phone || ""} onChange={(e) => patchPdAdjuster("phone", e.target.value, false)} onBlur={(e) => patchPdAdjuster("phone", e.target.value, true)} /></Field>
          </div>
        </div>
      ) : null}

      <div className="border-t border-praxium-line pt-4">
        <div className="overline mb-3">// letter of representation</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="LOR status">
            <select className={inputClass()} value={data.lor?.status || "not_sent"} onChange={(e) => patchLor("status", e.target.value)}>
              {LOR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Sent date">
            <input type="date" className={inputClass()} value={data.lor?.sent_date || ""} onChange={(e) => patchLor("sent_date", e.target.value || null)} />
          </Field>
          <Field label="Acknowledged date">
            <input type="date" className={inputClass()} value={data.lor?.acknowledged_date || ""} onChange={(e) => patchLor("acknowledged_date", e.target.value || null)} />
          </Field>
          <Field label="Follow-up due (≈5 days)" hint="Call if no acknowledgment.">
            <input type="date" className={inputClass()} value={data.lor?.follow_up_due || ""} onChange={(e) => patchLor("follow_up_due", e.target.value || null)} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm mt-2">
          <input type="checkbox" checked={Boolean(data.lor?.document_saved)} onChange={(e) => patchLor("document_saved", e.target.checked)} />
          Sent LOR saved to matter Documents
        </label>
        <Link to="/settings/templates" className="text-xs text-praxium-accent hover:underline inline-flex items-center gap-1 mt-2">
          <ExternalLink size={11} /> 3P/1P LOR templates
        </Link>
      </div>

      <div className="border-t border-praxium-line pt-4">
        <div className="overline mb-3">// policy limits</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Limits display (e.g. 100/300)" hint="Same stack on all related claimants.">
            <input className={inputClass()} value={data.limits?.display || ""} onChange={(e) => patchLimits("display", e.target.value, false)} onBlur={(e) => patchLimits("display", e.target.value, true)} />
          </Field>
          <Field label="Limits source">
            <input className={inputClass()} placeholder="acknowledgment, dec page, paid pull…" value={data.limits?.limits_source || ""} onChange={(e) => patchLimits("limits_source", e.target.value, false)} onBlur={(e) => patchLimits("limits_source", e.target.value, true)} />
          </Field>
          <Field label="BI per person ($)">
            <input type="number" className={inputClass()} value={data.limits?.bi_per_person ?? ""} onChange={(e) => patchLimits("bi_per_person", e.target.value ? Number(e.target.value) : null, false)} onBlur={(e) => patchLimits("bi_per_person", e.target.value ? Number(e.target.value) : null, true)} />
          </Field>
          <Field label="BI per accident ($)">
            <input type="number" className={inputClass()} value={data.limits?.bi_per_accident ?? ""} onChange={(e) => patchLimits("bi_per_accident", e.target.value ? Number(e.target.value) : null, false)} onBlur={(e) => patchLimits("bi_per_accident", e.target.value ? Number(e.target.value) : null, true)} />
          </Field>
          <Field label="UM / UIM">
            <input className={inputClass()} value={data.limits?.um_uim || ""} onChange={(e) => patchLimits("um_uim", e.target.value, false)} onBlur={(e) => patchLimits("um_uim", e.target.value, true)} />
          </Field>
          <Field label="MedPay / PIP">
            <input className={inputClass()} value={data.limits?.medpay_pip || ""} onChange={(e) => patchLimits("medpay_pip", e.target.value, false)} onBlur={(e) => patchLimits("medpay_pip", e.target.value, true)} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm mt-2">
          <input type="checkbox" checked={Boolean(data.limits?.limits_confirmed)} onChange={(e) => patchLimits("limits_confirmed", e.target.checked, true)} />
          Limits confirmed on file
        </label>
      </div>

      <div className="border-t border-praxium-line pt-4">
        <div className="overline mb-3">// liability posture</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Status">
            <select className={inputClass()} value={data.liability?.status || "pending"} onChange={(e) => patchLiability("status", e.target.value, true)}>
              {LIABILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Target acceptance (~30 days)">
            <input type="date" className={inputClass()} value={data.liability?.target_acceptance_date || ""} onChange={(e) => patchLiability("target_acceptance_date", e.target.value || null, true)} />
          </Field>
        </div>
        <Field label="Notes">
          <textarea rows={2} className={inputClass()} value={data.liability?.notes || ""} onChange={(e) => patchLiability("notes", e.target.value, false)} onBlur={(e) => patchLiability("notes", e.target.value, true)} />
        </Field>
      </div>

      {showMedpayNote ? (
        <div className="rounded-sm bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
          <strong>1P / MedPay:</strong> Open only when client cannot wait on 3P. Carriers share history — early 1P can hurt BI negotiation.
        </div>
      ) : null}

      <Field label="Side notes">
        <textarea rows={2} className={inputClass()} value={data.notes || ""} onChange={(e) => touch({ notes: e.target.value })} onBlur={(e) => touch({ notes: e.target.value }, true)} />
      </Field>
    </div>
  );
}

export default function MatterInsuranceTab({ matterId }) {
  const [piInsurance, setPiInsurance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api
      .get(`/matters/${matterId}/insurance`)
      .then((r) => setPiInsurance(r.data.pi_insurance))
      .catch(() => toast.error("Could not load insurance data"))
      .finally(() => setLoading(false));
  }, [matterId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (patch) => {
    setSaving(true);
    try {
      const r = await api.patch(`/matters/${matterId}/insurance`, patch);
      setPiInsurance(r.data.pi_insurance);
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const updateSide = (sideKey, partial) => {
    setPiInsurance((prev) => ({
      ...prev,
      [sideKey]: mergeSide(prev[sideKey], partial),
    }));
  };

  const saveSide = (sideKey, partial) => save({ [sideKey]: partial });

  if (loading || !piInsurance) return <PageLoader label="Loading insurance…" />;

  const tp = piInsurance.third_party;
  const lorDue = tp?.lor?.status === "sent" && tp?.lor?.follow_up_due && tp.lor.follow_up_due <= new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5" data-testid="matter-insurance-tab">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="overline mb-1 flex items-center gap-2"><Shield size={12} /> // insurance</div>
          <p className="text-sm text-praxium-subtle max-w-xl">
            Open 3P day one + send LOR. Hold 1P until client cannot wait. Do not give carrier SSN/DOB/address on open call.
          </p>
        </div>
        <Link to="/training/article/04-opening-3p-and-1p-claims" className="btn-ghost text-xs inline-flex items-center gap-1">
          <ExternalLink size={11} /> Training: 3P/1P
        </Link>
      </div>

      {lorDue ? (
        <div className="flex items-start gap-2 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>3P LOR follow-up due — call adjuster if no acknowledgment.</span>
        </div>
      ) : null}

      <CarrierCallPiiChecklist
        pii={piInsurance.carrier_call_pii}
        onChange={(patch) => {
          setPiInsurance((prev) => ({
            ...prev,
            carrier_call_pii: { ...prev.carrier_call_pii, ...patch },
          }));
          save({ carrier_call_pii: { ...piInsurance.carrier_call_pii, ...patch } });
        }}
        onAcknowledge={() => {
          const ts = new Date().toISOString().slice(0, 10);
          const next = { ...piInsurance.carrier_call_pii, acknowledged_at: ts };
          setPiInsurance((prev) => ({ ...prev, carrier_call_pii: next }));
          save({ carrier_call_pii: next });
          toast.success("Carrier call PII checklist acknowledged");
        }}
      />

      <div className="data-card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Claimants on this loss (pro rata)" hint="Enter same limits on each related case.">
          <input
            type="number"
            min={1}
            className={inputClass()}
            value={piInsurance.claimant_count}
            onChange={(e) => setPiInsurance({ ...piInsurance, claimant_count: Number(e.target.value) || 1 })}
            onBlur={() => save({ claimant_count: piInsurance.claimant_count })}
            data-testid="insurance-claimant-count"
          />
        </Field>
        <Field label="Related cases / co-occupants">
          <input
            className={inputClass()}
            placeholder="Matter numbers, same vehicle passengers…"
            value={piInsurance.related_case_notes || ""}
            onChange={(e) => setPiInsurance({ ...piInsurance, related_case_notes: e.target.value })}
            onBlur={() => save({ related_case_notes: piInsurance.related_case_notes || "" })}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ClaimSidePanel
          title="// third party (3P) — day one"
          sideKey="third_party"
          data={piInsurance.third_party}
          onUpdate={updateSide}
          onSave={saveSide}
          trainingHint="Open claim + send LOR with signed general release. Push liability acceptance within ~30 days."
          showDriverOwner
        />
        <ClaimSidePanel
          title="// first party (1P) — last resort"
          sideKey="first_party"
          data={piInsurance.first_party}
          onUpdate={updateSide}
          onSave={saveSide}
          trainingHint="Collision, rental, MedPay/PIP, UM/UIM — only when client cannot wait on 3P."
          showMedpayNote
        />
      </div>

      {saving ? <p className="text-xs font-mono text-praxium-subtle">Saving…</p> : null}
    </div>
  );
}
