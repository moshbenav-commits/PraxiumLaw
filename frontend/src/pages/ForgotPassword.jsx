import { useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Loader2 } from "lucide-react";
import AuthMarketingPanel from "@/components/auth/AuthMarketingPanel";
import usePageMeta from "@/components/landing/usePageMeta";

export default function ForgotPassword() {
  usePageMeta({
    title: "Forgot password — Praxium Suite",
    description: "Request a link to reset your Praxium Suite password.",
  });
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
    } catch {
      // Response is always neutral — no user enumeration either way.
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-praxium-bg grid grid-cols-1 lg:grid-cols-2">
      <AuthMarketingPanel
        headline="Get back into the"
        headlineAccent="legal operating system."
        sub="We'll email you a secure link to reset your password."
      />
      <div className="flex flex-col min-h-screen">
        <div className="lg:hidden p-6 border-b border-praxium-line flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-sm bg-praxium-accent-text flex items-center justify-center font-display font-black text-white text-sm">π</div>
            <span className="font-display font-black tracking-tight text-sm">PRAXIUM</span>
          </Link>
          <Link to="/login" className="text-xs font-mono uppercase tracking-wider text-praxium-accent-text">Sign in</Link>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <div className="overline mb-3">// authentication</div>
            <h2 className="font-display font-black text-3xl tracking-tight">Forgot password.</h2>
            {sent ? (
              <p className="mt-4 text-sm text-praxium-subtle" data-testid="forgot-password-sent">
                If an account exists for that email, we've sent a reset link. Check your inbox.
              </p>
            ) : (
              <>
                <p className="mt-2 text-sm text-praxium-subtle">
                  Enter your email and we'll send you a link to reset your password.
                </p>
                <form onSubmit={submit} className="mt-8 space-y-4" data-testid="forgot-password-form">
                  <div>
                    <label className="overline block mb-1.5">Email</label>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      required
                      autoComplete="email"
                      data-testid="forgot-password-email"
                      className="w-full px-3 py-2.5 border border-praxium-line rounded-sm text-sm outline-none focus:border-praxium-accent focus:ring-1 focus:ring-praxium-accent/30"
                    />
                  </div>
                  <button type="submit" disabled={loading} data-testid="forgot-password-submit" className="btn-praxium w-full rounded-full">
                    {loading ? <Loader2 className="animate-spin" size={14} /> : "Send reset link"}
                  </button>
                </form>
              </>
            )}
            <p className="mt-6 text-sm text-praxium-subtle">
              <Link to="/login" className="text-praxium-accent-text hover:underline">Back to sign in.</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
