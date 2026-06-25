import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import AuthMarketingPanel from "@/components/auth/AuthMarketingPanel";
import usePageMeta from "@/components/landing/usePageMeta";

export default function Login() {
  usePageMeta({
    title: "Sign In — Praxium Suite",
    description: "Sign in to your Praxium law firm operating system.",
  });
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      nav("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-praxium-bg grid grid-cols-1 lg:grid-cols-2">
      <AuthMarketingPanel
        headline="Welcome back to the"
        headlineAccent="legal operating system."
        sub="Built for firms that don't have time for clunky software."
        bullets={["⌘K command palette from anywhere", "CoCounsel AI with matter context", "Matters, records, and comms in one login"]}
      />
      <div className="flex flex-col min-h-screen">
        <div className="lg:hidden p-6 border-b border-praxium-line flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-sm bg-praxium-accent flex items-center justify-center font-display font-black text-white text-sm">π</div>
            <span className="font-display font-black tracking-tight text-sm">PRAXIUM</span>
          </Link>
          <Link to="/signup" className="text-xs font-mono uppercase tracking-wider text-praxium-accent">Start free</Link>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <div className="overline mb-3">// authentication</div>
            <h2 className="font-display font-black text-3xl tracking-tight">Sign in.</h2>
            <p className="mt-2 text-sm text-praxium-subtle">
              No account yet?{" "}
              <Link to="/signup" className="text-praxium-accent hover:underline" data-testid="login-signup-link">
                Start free.
              </Link>
            </p>
            <form onSubmit={submit} className="mt-8 space-y-4" data-testid="login-form">
              <div>
                <label className="overline block mb-1.5">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                  autoComplete="email"
                  data-testid="login-email"
                  className="w-full px-3 py-2.5 border border-praxium-line rounded-sm text-sm outline-none focus:border-praxium-accent focus:ring-1 focus:ring-praxium-accent/30"
                />
              </div>
              <div>
                <label className="overline block mb-1.5">Password</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  required
                  autoComplete="current-password"
                  data-testid="login-password"
                  className="w-full px-3 py-2.5 border border-praxium-line rounded-sm text-sm outline-none focus:border-praxium-accent focus:ring-1 focus:ring-praxium-accent/30"
                />
              </div>
              <button type="submit" disabled={loading} data-testid="login-submit" className="btn-praxium w-full rounded-full">
                {loading ? <Loader2 className="animate-spin" size={14} /> : "Sign in"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
