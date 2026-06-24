import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function PraxaSignup() {
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", incident_date: "" });
  const [loading, setLoading] = useState(false);
  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.post("/praxa/signup", form);
      localStorage.setItem("praxa_token", r.data.token);
      localStorage.setItem("praxa_user", JSON.stringify(r.data.user));
      nav("/praxa/app");
    } catch { alert("Signup failed"); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-praxa-bg praxa-surface flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <Link to="/praxa" className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-8 h-8 rounded-full bg-praxa-accent flex items-center justify-center text-white font-bold">π</div>
          <span className="font-semibold text-lg">Praxa <span className="text-praxa-sage text-xs font-normal ml-0.5 uppercase tracking-widest">HQ</span></span>
        </Link>
        <div className="bg-white rounded-3xl p-8 border border-praxa-line">
          <h1 className="text-2xl font-semibold tracking-tight">Let's get started.</h1>
          <p className="text-sm text-praxa-subtle mt-2">Takes about a minute. Then you can start journaling.</p>
          <form onSubmit={submit} className="mt-6 space-y-4" data-testid="praxa-signup-form">
            <div>
              <label className="text-xs uppercase tracking-widest text-praxa-sage block mb-1.5">Your name</label>
              <input value={form.name} onChange={upd("name")} required data-testid="praxa-signup-name"
                className="w-full px-4 py-2.5 border border-praxa-line rounded-xl outline-none focus:border-praxa-accent" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-praxa-sage block mb-1.5">Email</label>
              <input value={form.email} onChange={upd("email")} type="email" required data-testid="praxa-signup-email"
                className="w-full px-4 py-2.5 border border-praxa-line rounded-xl outline-none focus:border-praxa-accent" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-praxa-sage block mb-1.5">Phone</label>
              <input value={form.phone} onChange={upd("phone")} type="tel" data-testid="praxa-signup-phone"
                className="w-full px-4 py-2.5 border border-praxa-line rounded-xl outline-none focus:border-praxa-accent" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-praxa-sage block mb-1.5">When did it happen?</label>
              <input value={form.incident_date} onChange={upd("incident_date")} type="date" data-testid="praxa-signup-date"
                className="w-full px-4 py-2.5 border border-praxa-line rounded-xl outline-none focus:border-praxa-accent" />
            </div>
            <button type="submit" disabled={loading} data-testid="praxa-signup-submit"
              className="w-full bg-praxa-accent text-white py-3 rounded-full font-medium hover:opacity-90 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" size={14} /> : "Create my account"}
            </button>
            <p className="text-[10px] text-praxa-subtle text-center">By signing up you agree to our terms. Praxa provides information, not legal advice.</p>
          </form>
        </div>
      </div>
    </div>
  );
}
