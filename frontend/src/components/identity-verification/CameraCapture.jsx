"use client";
import { jsx, jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from "react";
import { blobToFile, capturePhotoFromVideo } from "@/lib/capturePhotoFromVideo";
import { captureLivenessFromVideo } from "@/lib/idVerificationLiveness";
import {
  analyzeImageFile,
  analyzeVideoFrame,
  formatQualityFailure,
  liveQualityStatus
} from "@/lib/imageQualityCheck";
import {
  ImageQualityPreview,
  LiveQualityIndicators
} from "@/components/identity-verification/ImageQualityPreview";
function CameraCapture({
  label,
  facingMode = "user",
  variant = "photo",
  allowUpload = true,
  livenessChallenge = null,
  onCapture,
  disabled = false
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [liveQuality, setLiveQuality] = useState(null);
  const [pendingPreview, setPendingPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const qualityProfile = variant === "liveness" ? "selfie" : "idDocument";
  const liveStatus = liveQualityStatus(liveQuality);
  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsReady(false);
    setLiveQuality(null);
  }, []);
  useEffect(() => {
    let cancelled = false;
    async function start() {
      if (disabled || pendingPreview) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setIsReady(true);
          setError(null);
        }
      } catch (err) {
        const name = err instanceof DOMException ? err.name : "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setError(
            allowUpload ? "Camera permission was denied. Enable camera access in your browser settings, refresh this page, or upload a photo instead." : "Camera permission is required for the live face scan. Enable camera access in your browser settings and refresh this page."
          );
        } else if (name === "NotFoundError") {
          setError(
            allowUpload ? "No camera was found on this device. Upload a photo instead." : "No camera was found. Use a phone or device with a front camera."
          );
        } else {
          setError(
            allowUpload ? "Camera access is required. Allow camera permission or upload a photo instead." : "Camera access is required for the face scan. Enable camera permission and try again."
          );
        }
      }
    }
    void start();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [allowUpload, disabled, facingMode, pendingPreview, stopStream]);
  useEffect(() => {
    if (!isReady || pendingPreview || !videoRef.current) return void 0;
    const interval = window.setInterval(() => {
      const video = videoRef.current;
      if (!video) return;
      const result = analyzeVideoFrame(video, qualityProfile);
      if (result) setLiveQuality(result);
    }, 500);
    return () => window.clearInterval(interval);
  }, [isReady, pendingPreview, qualityProfile]);
  useEffect(() => {
    return () => {
      if (pendingPreview?.previewUrl) {
        URL.revokeObjectURL(pendingPreview.previewUrl);
      }
    };
  }, [pendingPreview]);
  const showPreview = (preview) => {
    setPendingPreview((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return preview;
    });
    stopStream();
  };
  const clearPreview = () => {
    setPendingPreview((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    setError(null);
  };
  const runCountdown = async () => {
    for (let n = 3; n >= 1; n -= 1) {
      setCountdown(n);
      await new Promise((resolve) => window.setTimeout(resolve, 700));
    }
    setCountdown(null);
  };
  const handleCapture = async () => {
    if (!videoRef.current || !isReady) return;
    if (variant === "liveness" && !liveStatus.ready) {
      setError(
        liveQuality ? formatQualityFailure(liveQuality) : "Waiting for camera \u2014 improve lighting or wipe your lens before scanning."
      );
      return;
    }
    setIsCapturing(true);
    setError(null);
    try {
      if (variant === "liveness") {
        await runCountdown();
        const { file, meta } = await captureLivenessFromVideo(videoRef.current, {
          challenge: livenessChallenge
        });
        const quality = await analyzeImageFile(file, "selfie");
        showPreview({
          file,
          previewUrl: URL.createObjectURL(file),
          quality,
          livenessMeta: meta
        });
      } else {
        const blob = await capturePhotoFromVideo(videoRef.current);
        const file = blobToFile(blob, `capture-${Date.now()}.jpg`);
        const quality = await analyzeImageFile(file, "idDocument");
        showPreview({
          file,
          previewUrl: URL.createObjectURL(file),
          quality,
          livenessMeta: {
            captureMode: "live_camera",
            durationMs: 0,
            frameCount: 1,
            motionScore: 0,
            sharpnessScore: quality.sharpness,
            minWidth: quality.width,
            minHeight: quality.height,
            brightnessScore: quality.brightness,
            passedChecks: quality.passed ? ["camera_capture", "image_quality_ok"] : ["camera_capture"],
            failedChecks: quality.issues,
            clientTimestamp: (/* @__PURE__ */ new Date()).toISOString()
          }
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Capture failed");
    } finally {
      setIsCapturing(false);
      setCountdown(null);
    }
  };
  const handleFileInput = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setIsCapturing(true);
    try {
      const quality = await analyzeImageFile(file, "idDocument");
      showPreview({
        file,
        previewUrl: URL.createObjectURL(file),
        quality
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsCapturing(false);
      e.target.value = "";
    }
  };
  const handleApprovePreview = async () => {
    if (!pendingPreview) return;
    setIsUploading(true);
    setError(null);
    try {
      await onCapture({
        file: pendingPreview.file,
        livenessMeta: pendingPreview.livenessMeta
      });
      clearPreview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };
  const captureLabel = variant === "liveness" ? isCapturing ? countdown ? `Hold still\u2026 ${countdown}` : "Scanning\u2026" : liveStatus.ready ? "Start face scan" : "Fix lighting or lens first" : isCapturing ? "Checking\u2026" : "Take photo";
  if (pendingPreview) {
    return /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-gray-900", children: "Review before submitting" }),
      /* @__PURE__ */ jsx("div", { className: "overflow-hidden rounded-xl border border-gray-200 bg-black aspect-[4/3] max-w-md", children: /* @__PURE__ */ jsx(
        "img",
        {
          src: pendingPreview.previewUrl,
          alt: "Capture preview",
          className: "h-full w-full object-cover"
        }
      ) }),
      /* @__PURE__ */ jsx(ImageQualityPreview, { result: pendingPreview.quality }),
      error ? /* @__PURE__ */ jsx("p", { className: "text-sm text-red-600", children: error }) : null,
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            disabled: isUploading || !pendingPreview.quality.passed,
            onClick: () => void handleApprovePreview(),
            className: "rounded-full bg-[#FFA01C] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50",
            children: isUploading ? "Uploading\u2026" : "Use this photo"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            disabled: isUploading,
            onClick: clearPreview,
            className: "rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50",
            children: "Retake"
          }
        )
      ] }),
      !pendingPreview.quality.passed ? /* @__PURE__ */ jsx("p", { className: "text-xs text-amber-700", children: "This photo cannot be submitted until quality checks pass. Tap Retake after fixing the issues above." }) : null
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-gray-900", children: label }),
    variant === "liveness" ? /* @__PURE__ */ jsx("p", { className: "text-xs text-gray-600", children: "Live scan only \u2014 watch the badges below the camera. Wipe smudges off the lens, use good lighting, then slowly turn your head during the 2-second scan." }) : /* @__PURE__ */ jsx("p", { className: "text-xs text-gray-600", children: "We scan every photo for blur, darkness, and glare before you can submit. Wipe the camera lens if the preview looks soft or hazy." }),
    /* @__PURE__ */ jsxs("div", { className: "relative overflow-hidden rounded-xl border border-gray-200 bg-black aspect-[4/3] max-w-md", children: [
      /* @__PURE__ */ jsx(
        "video",
        {
          ref: videoRef,
          playsInline: true,
          muted: true,
          className: "h-full w-full object-cover"
        }
      ),
      !isReady && !error ? /* @__PURE__ */ jsx("div", { className: "absolute inset-0 flex items-center justify-center text-sm text-white/80", children: "Starting camera\u2026" }) : null,
      countdown ? /* @__PURE__ */ jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-black/40 text-5xl font-bold text-white", children: countdown }) : null,
      isReady && !countdown ? /* @__PURE__ */ jsx(
        LiveQualityIndicators,
        {
          lighting: liveStatus.lighting,
          focus: liveStatus.focus,
          ready: liveStatus.ready
        }
      ) : null
    ] }),
    liveQuality && !liveStatus.ready ? /* @__PURE__ */ jsx(ImageQualityPreview, { result: liveQuality, compact: true }) : null,
    error ? /* @__PURE__ */ jsx("p", { className: "text-sm text-red-600", children: error }) : null,
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          disabled: disabled || !isReady || isCapturing,
          onClick: () => void handleCapture(),
          className: "rounded-full bg-[#FFA01C] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50",
          children: captureLabel
        }
      ),
      allowUpload ? /* @__PURE__ */ jsxs("label", { className: "cursor-pointer rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50", children: [
        "Upload photo",
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "file",
            accept: "image/*",
            capture: facingMode === "environment" ? "environment" : "user",
            className: "hidden",
            disabled: disabled || isCapturing,
            onChange: (e) => void handleFileInput(e)
          }
        )
      ] }) : null
    ] })
  ] });
}
export {
  CameraCapture
};
