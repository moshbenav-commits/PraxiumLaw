import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import AuthMarketingPanel from "@/components/auth/AuthMarketingPanel";
import usePageMeta from "@/components/landing/usePageMeta";

export default function Signup() {
  usePageMeta({
    title: "Start Free — Praxium Suite",
    description: "Create your law firm on Praxium in 30 seconds. 30 days free, no credit card, free Filevine migration.",
  });
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-praxium-bg grid grid-cols-1 lg:grid-cols-2">
      <AuthMarketingPanel
        headline="Run your firm on"
        headlineAccent="Praxium Suite."
        sub="30 days free. No credit card. Cancel anytime."
      />
      <div className="flex flex-col min-h-screen">
        <div className="lg:hidden p-6 border-b border-praxium-line flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-sm bg-praxium-accent flex items-center justify-center font-display font-black text-white text-sm">π</div>
            <span className="font-display font-black tracking-tight text-sm">PRAXIUM</span>
          </Link>
          <Link to="/login" className="text-xs font-mono uppercase tracking-wider text-praxium-accent">Sign in</Link>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <div className="overline mb-3">// create firm</div>
            <h2 className="font-display font-black text-3xl tracking-tight">Start free.</h2>
            <p className="mt-2 text-sm text-praxium-subtle">
              Already on Praxium?{" "}
              <Link to="/login" className="text-praxium-accent hover:underline" data-testid="signup-login-link">
                Sign in.
              </Link>
            </p>
            <form onSubmit={submit} className="mt-8 space-y-4" data-testid="signup-form">
              <div>
                <label className="overline block mb-1.5">Your name</label>
                <input
                  value={form.name}
                  onChange={upd("name")}
                  required
                  autoComplete="name"
                  data-testid="signup-name"
                  placeholder="Sarah Chen"
                  className="w-full px-3 py-2.5 border border-praxium-line rounded-sm text-sm outline-none focus:border-praxium-accent focus:ring-1 focus:ring-praxium-accent/30"
                />
              </div>
              <div>
                <label className="overline block mb-1.5">Firm name</label>
                <input
                  value={form.firm_name}
                  onChange={upd("firm_name")}
                  required
                  data-testid="signup-firm"
                  placeholder="Chen Law Group"
                  className="w-full px-3 py-2.5 border border-praxium-line rounded-sm text-sm outline-none focus:border-praxium-accent focus:ring-1 focus:ring-praxium-accent/30"
                />
              </div>
              <div>
                <label className="overline block mb-1.5">Work email</label>
                <input
                  value={form.email}
                  onChange={upd("email")}
                  type="email"
                  required
                  autoComplete="email"
                  data-testid="signup-email"
                  className="w-full px-3 py-2.5 border border-praxium-line rounded-sm text-sm outline-none focus:border-praxium-accent focus:ring-1 focus:ring-praxium-accent/30"
                />
              </div>
              <div>
                <label className="overline block mb-1.5">Password</label>
                <input
                  value={form.password}
                  onChange={upd("password")}
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  data-testid="signup-password"
                  className="w-full px-3 py-2.5 border border-praxium-line rounded-sm text-sm outline-none focus:border-praxium-accent focus:ring-1 focus:ring-praxium-accent/30"
                />
                <p className="mt-1 text-[10px] font-mono text-praxium-subtle">Minimum 6 characters</p>
              </div>
              <button type="submit" disabled={loading} data-testid="signup-submit" className="btn-praxium w-full rounded-full">
                {loading ? <Loader2 className="animate-spin" size={14} /> : "Create firm + start free"}
              </button>
              <p className="text-[10px] font-mono text-praxium-subtle text-center leading-relaxed">
                By signing up you agree to our{" "}
                <Link to="/terms" className="text-praxium-accent hover:underline">Terms</Link> and{" "}
                <Link to="/privacy" className="text-praxium-accent hover:underline">Privacy Policy</Link>.
                No card required for the 30-day trial.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
