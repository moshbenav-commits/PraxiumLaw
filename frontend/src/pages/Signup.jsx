import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Signup() {
  const { signup } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", firm_name: "" });
  const [loading, setLoading] = useState(false);
  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signup(form);
      toast.success("Welcome to Praxium");
      nav("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Signup failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-praxium-bg grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-praxium-ink text-white">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-sm bg-praxium-accent flex items-center justify-center font-display font-black text-sm">π</div>
          <span className="font-display font-black tracking-tight">PRAXIUM</span>
        </Link>
        <div>
          <h1 className="font-display font-black text-4xl tracking-tight leading-tight max-w-md">
            Run your firm on<br/>
            <span className="text-praxium-accent">Praxium Suite.</span>
          </h1>
          <p className="mt-4 text-white/60 max-w-md text-sm">30 days free. No credit card. Cancel anytime.</p>
          <ul className="mt-8 space-y-2 text-sm text-white/80">
            <li>→ All modules included from day one</li>
            <li>→ Free migration from Filevine / Clio / MyCase</li>
            <li>→ CoCounsel AI included</li>
            <li>→ 90-day money-back guarantee</li>
          </ul>
        </div>
        <div className="text-xs font-mono text-white/40">// πραξις // praxis // action</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="overline mb-3">// create firm</div>
          <h2 className="font-display font-black text-3xl tracking-tight">Start free.</h2>
          <p className="mt-2 text-sm text-praxium-subtle">Already on Praxium? <Link to="/login" className="text-praxium-accent hover:underline" data-testid="signup-login-link">Sign in.</Link></p>
          <form onSubmit={submit} className="mt-8 space-y-4" data-testid="signup-form">
            <div>
              <label className="overline block mb-1.5">Your name</label>
              <input value={form.name} onChange={upd("name")} required data-testid="signup-name" placeholder="Sarah Chen"
                className="w-full px-3 py-2 border border-praxium-line rounded-sm text-sm outline-none focus:border-praxium-accent" />
            </div>
            <div>
              <label className="overline block mb-1.5">Firm name</label>
              <input value={form.firm_name} onChange={upd("firm_name")} required data-testid="signup-firm"
                placeholder="Chen Law Group" className="w-full px-3 py-2 border border-praxium-line rounded-sm text-sm outline-none focus:border-praxium-accent" />
            </div>
            <div>
              <label className="overline block mb-1.5">Work email</label>
              <input value={form.email} onChange={upd("email")} type="email" required data-testid="signup-email"
                className="w-full px-3 py-2 border border-praxium-line rounded-sm text-sm outline-none focus:border-praxium-accent" />
            </div>
            <div>
              <label className="overline block mb-1.5">Password</label>
              <input value={form.password} onChange={upd("password")} type="password" required minLength={6} data-testid="signup-password"
                className="w-full px-3 py-2 border border-praxium-line rounded-sm text-sm outline-none focus:border-praxium-accent" />
            </div>
            <button type="submit" disabled={loading} data-testid="signup-submit" className="btn-praxium w-full">
              {loading ? <Loader2 className="animate-spin" size={14} /> : "Create firm + start free"}
            </button>
            <p className="text-[10px] font-mono text-praxium-subtle text-center">
              By signing up you agree to our terms.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
