import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";
import { requestPortalLink } from "@/lib/portalApi";
import usePageMeta from "@/components/landing/usePageMeta";

export default function PortalLogin() {
  usePageMeta({
    title: "Client Portal — Praxium",
    description: "Secure client portal for your legal matter.",
  });
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devUrl, setDevUrl] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await requestPortalLink(email.trim());
      setSent(true);
      if (data.dev_verify_url) setDevUrl(data.dev_verify_url);
      toast.success(data.message || "Check your email for a secure link.");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not send link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-praxium-bg flex flex-col" data-surface="dark">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md data-card p-6 sm:p-8">
          <div className="overline mb-2">// client portal</div>
          <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tight flex items-center gap-2">
            <Mail className="text-praxium-accent shrink-0" size={24} />
            Sign in with email
          </h1>
          <p className="mt-2 text-sm text-praxium-subtle">
            No password — we send a secure link to view your case status, documents, and messages.
          </p>

          {sent ? (
            <div className="mt-6 space-y-4">
              <p className="text-sm">
                If your firm enabled portal access for <strong>{email}</strong>, check your inbox for a one-time link
                (valid 24 hours).
              </p>
              {devUrl && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-sm text-xs">
                  <div className="overline text-amber-800 mb-1">Dev link</div>
                  <a href={devUrl} className="text-praxium-accent-text break-all font-mono">
                    {devUrl}
                  </a>
                </div>
              )}
              <button type="button" className="btn-ghost text-sm" onClick={() => setSent(false)}>
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4" data-testid="portal-login-form">
              <div>
                <label className="overline block mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full px-3 py-2.5 border border-praxium-line rounded-sm text-sm bg-white"
                  data-testid="portal-email"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-praxium w-full justify-center" data-testid="portal-submit">
                {loading ? <Loader2 className="animate-spin" size={16} /> : "Send secure link"}
              </button>
            </form>
          )}

          <p className="mt-6 text-xs text-praxium-subtle">
            Firm staff?{" "}
            <Link to="/login" className="text-praxium-accent-text hover:underline">
              Sign in to Praxium Suite
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
