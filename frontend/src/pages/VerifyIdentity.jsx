import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import IdVerificationFlow from "@/components/identity-verification/IdVerificationFlow";

export default function VerifyIdentityPage() {
  const { token } = useParams();
  const decoded = decodeURIComponent(token || "");

  if (!decoded) {
    return (
      <main className="px-6 py-10">
        <p className="text-sm text-praxium-subtle">Invalid verification link.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-praxium-bg px-6 py-10">
      <IdVerificationFlow token={decoded} />
    </main>
  );
}
