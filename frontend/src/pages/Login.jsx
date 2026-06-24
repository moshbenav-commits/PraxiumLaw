import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Login() {
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
            Welcome back to the<br/>
            <span className="text-praxium-accent">legal operating system.</span>
          </h1>
          <p className="mt-4 text-white/60 max-w-md text-sm">Built for the firms that don't have time for clunky software.</p>
        </div>
        <div className="text-xs font-mono text-white/40">// πραξις // praxis // action</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="overline mb-3">// authentication</div>
          <h2 className="font-display font-black text-3xl tracking-tight">Sign in.</h2>
          <p className="mt-2 text-sm text-praxium-subtle">No account yet? <Link to="/signup" className="text-praxium-accent hover:underline" data-testid="login-signup-link">Start free.</Link></p>
          <form onSubmit={submit} className="mt-8 space-y-4" data-testid="login-form">
            <div>
              <label className="overline block mb-1.5">Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required data-testid="login-email"
                className="w-full px-3 py-2 border border-praxium-line rounded-sm text-sm outline-none focus:border-praxium-accent" />
            </div>
            <div>
              <label className="overline block mb-1.5">Password</label>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required data-testid="login-password"
                className="w-full px-3 py-2 border border-praxium-line rounded-sm text-sm outline-none focus:border-praxium-accent" />
            </div>
            <button type="submit" disabled={loading} data-testid="login-submit" className="btn-praxium w-full">
              {loading ? <Loader2 className="animate-spin" size={14} /> : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
