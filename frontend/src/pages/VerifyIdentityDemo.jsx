import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import IdVerificationFlow from "@/components/identity-verification/IdVerificationFlow";
import { API } from "@/lib/api";

export default function VerifyIdentityDemoPage() {
  const [token, setToken] = useState(null);
  const [orderNumber, setOrderNumber] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch(`${API}/identity-verification/demo/session`, {
          method: "POST",
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.detail || data.error || "Demo unavailable");
        }
        setToken(data.token);
        setOrderNumber(data.orderNumber ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Demo unavailable");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center bg-praxium-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-praxium-accent" />
      </main>
    );
  }

  if (error || !token) {
    return (
      <main className="mx-auto max-w-lg px-6 py-10">
        <div className="data-card p-6">
          <p className="font-display font-bold text-praxium-ink">Demo not available</p>
          <p className="mt-2 text-sm text-praxium-subtle">
            {error ?? "Could not start demo."} Run Praxium backend locally with MongoDB.
          </p>
          <Link to="/" className="mt-4 inline-block text-sm font-semibold text-praxium-accent-text underline">
            Back home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-praxium-bg px-6 py-10">
      <div className="mx-auto mb-6 max-w-2xl rounded-sm border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <strong>Praxium IDV demo</strong>
        {orderNumber ? ` — ${orderNumber}` : ""}. Live face scan → government ID. No real matter linked.
      </div>
      <IdVerificationFlow token={token} demoMode />
    </main>
  );
}
