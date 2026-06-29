import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { verifyPortalToken } from "@/lib/portalApi";
import { usePortal } from "@/contexts/PortalContext";
import PageLoader from "@/components/common/PageLoader";

export default function PortalVerify() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { loginWithVerifyResponse } = usePortal();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setError("Missing verification token.");
      return;
    }
    verifyPortalToken(token)
      .then((data) => {
        loginWithVerifyResponse(data);
        toast.success(`Welcome, ${data.contact?.name || "client"}`);
        nav("/portal", { replace: true });
      })
      .catch((err) => {
        setError(err.response?.data?.detail || "Link invalid or expired.");
      });
  }, [params, loginWithVerifyResponse, nav]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-praxium-bg p-6">
        <div className="data-card p-6 max-w-md text-center">
          <div className="overline mb-2">// verification failed</div>
          <p className="text-sm text-rose-600">{error}</p>
          <a href="/portal/login" className="btn-praxium mt-4 inline-flex">
            Request new link
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-praxium-bg">
      <div className="text-center">
        <Loader2 className="animate-spin mx-auto text-praxium-accent mb-3" size={28} />
        <PageLoader label="Verifying secure link…" />
      </div>
    </div>
  );
}
