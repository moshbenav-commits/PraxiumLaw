import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CameraCapture } from "@/components/identity-verification/CameraCapture";
import { API } from "@/lib/api";

const POSE_COPY = {
  center: {
    title: "Look straight at the camera",
    hint: "Center your face in the frame with good lighting.",
  },
  left: {
    title: "Turn your head to the left",
    hint: "Slowly turn during the scan until your left cheek is visible.",
  },
  right: {
    title: "Turn your head to the right",
    hint: "Slowly turn during the scan until your right cheek is visible.",
  },
};

const POSE_ORDER = ["center", "left", "right"];

async function uploadMultipart(token, path, file, extra = {}) {
  const form = new FormData();
  form.append("file", file);
  Object.entries(extra).forEach(([key, value]) => {
    if (value != null) form.append(key, value);
  });

  const response = await fetch(
    `${API}/identity-verification/${encodeURIComponent(token)}/${path}`,
    { method: "POST", body: form },
  );

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || data.error || "Upload failed");
  }

  return response.json();
}

function serializeMeta(meta) {
  if (!meta) return undefined;
  return JSON.stringify(meta);
}

export function IdVerificationFlow({ token, demoMode = false }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    const response = await fetch(
      `${API}/identity-verification/${encodeURIComponent(token)}/bootstrap`,
      { cache: "no-store" },
    );
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.detail || payload.error || "Could not load verification session");
    }
    setData(await response.json());
  }, [token]);

  useEffect(() => {
    void refresh()
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => setLoading(false));
  }, [refresh]);

  const handleIdUpload = async ({ file, livenessMeta }) => {
    await uploadMultipart(token, "id-document", file, {
      ...(livenessMeta ? { livenessMeta: serializeMeta(livenessMeta) } : {}),
    });
    await refresh();
  };

  const handleSelfieUpload = async ({ file, livenessMeta }) => {
    if (!livenessMeta) {
      throw new Error("Face scan must be captured live from your camera.");
    }
    const pose = POSE_ORDER.find((p) => !data?.steps.selfies[p]);
    if (!pose) {
      throw new Error("All face scans are already complete.");
    }
    await uploadMultipart(token, "selfie", file, {
      pose,
      livenessMeta: serializeMeta(livenessMeta),
    });
    await refresh();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(
        `${API}/identity-verification/${encodeURIComponent(token)}/submit`,
        { method: "POST" },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.detail || payload.error || "Submit failed");
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-praxium-accent" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-semibold text-red-800">Verification link unavailable</p>
        <p className="mt-2 text-sm text-red-700">{error}</p>
        <Link to="/" className="mt-4 inline-block text-sm font-semibold text-praxium-accent underline">
          Back to Praxium
        </Link>
      </div>
    );
  }

  if (!data) return null;

  if (data.status === "rejected") {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="font-semibold text-red-900">Verification could not be approved</p>
        <p className="mt-2 text-sm text-red-800">
          Session {data.orderNumber} — contact your firm if you believe this was a mistake.
        </p>
      </div>
    );
  }

  if (data.status === "verified") {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-green-200 bg-green-50 p-6">
        <p className="font-semibold text-green-900">Identity verified</p>
        <p className="mt-2 text-sm text-green-800">Session {data.orderNumber} is approved. Thank you.</p>
      </div>
    );
  }

  if (data.status === "submitted") {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-6">
        <p className="font-semibold text-amber-900">{demoMode ? "Demo submitted" : "Submitted for review"}</p>
        <p className="mt-2 text-sm text-amber-800">
          {demoMode
            ? `Demo ${data.orderNumber} — face scan + ID completed. In production, firm staff review before approval.`
            : `Session ${data.orderNumber} — your firm will review your ID and face scan.`}
        </p>
      </div>
    );
  }

  const idDone = data.steps.idDocument;
  const selfiesDone = POSE_ORDER.every((pose) => data.steps.selfies[pose]);
  const nextRequiredPose = POSE_ORDER.find((pose) => !data.steps.selfies[pose]);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-display font-black text-2xl tracking-tight text-praxium-ink">
          Verify your identity
        </h1>
        <p className="mt-2 text-sm text-praxium-subtle">
          Reference <strong>{data.orderNumber}</strong>
          {data.billingName ? (
            <>
              {" "}
              — name should match <strong>{data.billingName}</strong>
            </>
          ) : null}
        </p>
        <p className="mt-2 text-sm text-praxium-subtle">
          Complete a live face scan (turn your head left and right), then photograph your government
          ID. Firm staff review every submission — not automated biometrics.
        </p>
      </div>

      <section className="data-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display font-bold text-lg">Step 1 — Live face scan</h2>
          {selfiesDone ? (
            <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
              Done
            </span>
          ) : null}
        </div>
        <div className="mb-4 flex gap-2">
          {POSE_ORDER.map((pose) => (
            <span
              key={pose}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                data.steps.selfies[pose]
                  ? "bg-green-100 text-green-800"
                  : nextRequiredPose === pose
                    ? "bg-praxium-accent text-white"
                    : "bg-gray-100 text-gray-500"
              }`}
            >
              {pose}
            </span>
          ))}
        </div>
        {nextRequiredPose ? (
          <>
            <p className="mb-3 text-sm font-medium">{POSE_COPY[nextRequiredPose].title}</p>
            <p className="mb-4 text-sm text-praxium-subtle">
              {POSE_COPY[nextRequiredPose].hint} Keep your face in frame while the camera records a
              short clip.
            </p>
            <CameraCapture
              label={`Live scan — ${nextRequiredPose} pose`}
              facingMode="user"
              variant="liveness"
              allowUpload={false}
              livenessChallenge={data.livenessChallenge ?? null}
              onCapture={handleSelfieUpload}
            />
          </>
        ) : (
          <p className="text-sm text-green-700">All three poses captured. Continue to your ID below.</p>
        )}
      </section>

      <section className="data-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display font-bold text-lg">Step 2 — Government ID</h2>
          {idDone ? (
            <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
              Done
            </span>
          ) : null}
        </div>
        {!selfiesDone ? (
          <p className="text-sm text-praxium-subtle">Complete the live face scan first.</p>
        ) : !idDone ? (
          <CameraCapture
            label="Photo of driver's license or state ID (front)"
            facingMode="environment"
            variant="photo"
            allowUpload
            onCapture={handleIdUpload}
          />
        ) : (
          <p className="text-sm text-praxium-subtle">ID photo received. Submit for review when ready.</p>
        )}
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="button"
        disabled={!data.canSubmit || submitting}
        onClick={() => void handleSubmit()}
        className="w-full rounded-sm bg-praxium-accent px-6 py-3 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit for review"}
      </button>
    </div>
  );
}

export default IdVerificationFlow;
