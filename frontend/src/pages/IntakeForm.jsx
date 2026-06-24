import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { Check, Loader2 } from "lucide-react";

export default function IntakeForm() {
  const { firmSlug } = useParams();
  const [form, setForm] = useState({ name: "", email: "", phone: "", case_type: "personal_injury", description: "", incident_date: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/intake", { ...form, firm_slug: firmSlug });
      setSubmitted(true);
    } catch { alert("Submission failed"); } finally { setLoading(false); }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-praxium-bg flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-praxium-line p-8 text-center">
          <div className="w-12 h-12 rounded-sm bg-praxium-accent mx-auto flex items-center justify-center mb-4">
            <Check className="text-white" size={20} />
          </div>
          <h2 className="font-display font-black text-2xl tracking-tight">We got it.</h2>
          <p className="text-sm text-praxium-subtle mt-2">A member of our team will reach out within 24 hours. Save this number: <span className="font-mono text-praxium-ink">{form.phone}</span>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-praxium-bg p-6">
      <div className="max-w-xl mx-auto">
        <Link to="/" className="flex items-center gap-2 mb-8">
          <div className="w-7 h-7 rounded-sm bg-praxium-accent flex items-center justify-center font-display font-black text-white text-sm">π</div>
          <span className="font-display font-bold tracking-tight">PRAXIUM</span>
        </Link>
        <div className="overline mb-2">// free case evaluation</div>
        <h1 className="font-display font-black text-4xl tracking-tight">Tell us what happened.</h1>
        <p className="text-sm text-praxium-subtle mt-3">We'll review your case and respond within 24 hours. Free. No obligation.</p>

        <form onSubmit={submit} className="mt-8 space-y-4 bg-white border border-praxium-line p-6 rounded-sm" data-testid="intake-form">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="overline block mb-1.5">Name</label>
              <input value={form.name} onChange={upd("name")} required data-testid="intake-name"
                className="w-full px-3 py-2 border border-praxium-line rounded-sm" />
            </div>
            <div>
              <label className="overline block mb-1.5">Phone</label>
              <input value={form.phone} onChange={upd("phone")} type="tel" required data-testid="intake-phone"
                className="w-full px-3 py-2 border border-praxium-line rounded-sm font-mono" />
            </div>
          </div>
          <div>
            <label className="overline block mb-1.5">Email</label>
            <input value={form.email} onChange={upd("email")} type="email" required data-testid="intake-email"
              className="w-full px-3 py-2 border border-praxium-line rounded-sm font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="overline block mb-1.5">Case type</label>
              <select value={form.case_type} onChange={upd("case_type")} data-testid="intake-case-type"
                className="w-full px-3 py-2 border border-praxium-line rounded-sm bg-white">
                <option value="personal_injury">Personal Injury</option>
                <option value="family">Family Law</option>
                <option value="criminal">Criminal</option>
                <option value="immigration">Immigration</option>
                <option value="estate">Estate Planning</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="overline block mb-1.5">Incident date</label>
              <input type="date" value={form.incident_date} onChange={upd("incident_date")} data-testid="intake-incident-date"
                className="w-full px-3 py-2 border border-praxium-line rounded-sm font-mono" />
            </div>
          </div>
          <div>
            <label className="overline block mb-1.5">What happened?</label>
            <textarea value={form.description} onChange={upd("description")} rows={5} required data-testid="intake-description"
              placeholder="Tell us the story in your own words..."
              className="w-full px-3 py-2 border border-praxium-line rounded-sm" />
          </div>
          <button type="submit" disabled={loading} data-testid="intake-submit" className="btn-praxium w-full">
            {loading ? <Loader2 className="animate-spin" size={14} /> : "Get free case evaluation"}
          </button>
          <p className="text-[10px] font-mono text-praxium-subtle text-center">By submitting, you authorize a confidential review. No attorney-client relationship is formed until a signed retainer agreement is in place.</p>
        </form>
      </div>
    </div>
  );
}
