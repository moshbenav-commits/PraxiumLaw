import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import usePageMeta from "@/components/landing/usePageMeta";

export default function AcceptInvite() {
  usePageMeta({ title: "Accept invite — Praxium Suite" });
  const [params] = useSearchParams();
  const nav = useNavigate();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const r = await api.post("/team/accept-invite", { token, password });
      localStorage.setItem("praxium_token", r.data.token);
      localStorage.setItem("praxium_user", JSON.stringify(r.data.user));
      toast.success("Welcome to the team!");
      nav("/dashboard");
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invite invalid or expired");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-praxium-bg p-6">
        <div className="data-card p-6 text-sm">Missing invite token. Ask your admin to resend the invite.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-praxium-bg flex items-center justify-center p-6">
      <div className="w-full max-w-sm data-card p-6">
        <div className="overline mb-2">// team invite</div>
        <h1 className="font-display font-black text-2xl">Set your password</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="overline block mb-1">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-praxium-line rounded-sm text-sm"
            />
          </div>
          <div>
            <label className="overline block mb-1">Confirm</label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2 border border-praxium-line rounded-sm text-sm"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-praxium w-full justify-center">
            {loading ? <Loader2 className="animate-spin" size={16} /> : "Join firm"}
          </button>
        </form>
        <p className="mt-4 text-xs text-praxium-subtle">
          Already have an account? <Link to="/login" className="text-praxium-accent">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
