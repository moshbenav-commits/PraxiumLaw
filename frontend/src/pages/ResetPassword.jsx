import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import PasswordInput from "@/components/auth/PasswordInput";
import usePageMeta from "@/components/landing/usePageMeta";

export default function ResetPassword() {
  usePageMeta({ title: "Reset password — Praxium Suite" });
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setDone(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Reset link invalid or expired");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-praxium-bg p-6">
        <div className="data-card p-6 text-sm">
          Missing reset token.{" "}
          <Link to="/forgot-password" className="text-praxium-accent hover:underline">Request a new link.</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-praxium-bg flex items-center justify-center p-6">
      <div className="w-full max-w-sm data-card p-6">
        <div className="overline mb-2">// password reset</div>
        <h1 className="font-display font-black text-2xl">Set a new password</h1>
        {done ? (
          <>
            <p className="mt-4 text-sm text-praxium-subtle" data-testid="reset-password-done">
              Your password has been updated.
            </p>
            <Link to="/login" className="btn-praxium w-full justify-center mt-6 inline-flex">
              Sign in
            </Link>
          </>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4" data-testid="reset-password-form">
            <div>
              <label className="overline block mb-1">New password</label>
              <PasswordInput
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                data-testid="reset-password-new"
                className="w-full px-3 py-2 border border-praxium-line rounded-sm text-sm"
              />
            </div>
            <div>
              <label className="overline block mb-1">Confirm</label>
              <PasswordInput
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                data-testid="reset-password-confirm"
                className="w-full px-3 py-2 border border-praxium-line rounded-sm text-sm"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-praxium w-full justify-center" data-testid="reset-password-submit">
              {loading ? <Loader2 className="animate-spin" size={16} /> : "Reset password"}
            </button>
          </form>
        )}
        <p className="mt-4 text-xs text-praxium-subtle">
          Remembered it? <Link to="/login" className="text-praxium-accent">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
