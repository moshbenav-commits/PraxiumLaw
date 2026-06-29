import { blobToFile } from "@/lib/capturePhotoFromVideo";
import {
  analyzeImageData,
  formatQualityFailure,
  QUALITY_THRESHOLDS
} from "@/lib/imageQualityCheck";
const SAMPLE_INTERVAL_MS = 200;
const MIN_DURATION_MS = 2e3;
const MIN_MOTION_SCORE = 8e-3;
async function captureLivenessFromVideo(video, options) {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) {
    throw new Error("Camera is not ready");
  }
  const durationMs = options?.durationMs ?? options?.challenge?.minDurationMs ?? 2500;
  const minMotionScore = options?.challenge?.minMotionScore ?? MIN_MOTION_SCORE;
  const minDurationMs = options?.challenge?.minDurationMs ?? MIN_DURATION_MS;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not access camera frames");
  const frames = [];
  const startedAt = performance.now();
  await new Promise((resolve) => {
    const tick = () => {
      ctx.drawImage(video, 0, 0, width, height);
      frames.push(ctx.getImageData(0, 0, width, height));
      if (performance.now() - startedAt >= durationMs) {
        resolve();
        return;
      }
      window.setTimeout(tick, SAMPLE_INTERVAL_MS);
    };
    tick();
  });
  const elapsed = Math.round(performance.now() - startedAt);
  const motionScore = computeMotionScore(frames);
  const { index: bestIndex } = pickSharpestFrame(frames, width, height);
  const bestFrame = frames[bestIndex];
  const quality = analyzeImageData(bestFrame, "selfie");
  const brightnessScore = quality.brightness;
  const passedChecks = [...quality.hints.length === 0 ? ["image_quality_ok"] : []];
  const failedChecks = [...quality.issues];
  if (elapsed >= minDurationMs) passedChecks.push("min_duration_ok");
  else failedChecks.push("capture_too_short");
  if (motionScore >= minMotionScore) passedChecks.push("client_motion_ok");
  else failedChecks.push("insufficient_motion");
  if (quality.passed) {
    passedChecks.push("sharpness_ok", "brightness_ok", "contrast_ok");
  }
  if (width >= QUALITY_THRESHOLDS.selfie.minWidth && height >= QUALITY_THRESHOLDS.selfie.minHeight) {
    passedChecks.push("resolution_ok");
  } else {
    failedChecks.push("resolution_too_low");
  }
  if (failedChecks.length > 0) {
    const qualityMsg = quality.passed ? "" : formatQualityFailure(quality);
    const motionMsg = failedChecks.includes("insufficient_motion") ? " Slowly turn your head during the scan \u2014 printed photos are not accepted." : "";
    throw new Error(
      qualityMsg || `Liveness check failed.${motionMsg || " Adjust your position and try again."}`
    );
  }
  ctx.putImageData(bestFrame, 0, 0);
  const blob = await canvasToJpeg(canvas);
  const file = blobToFile(blob, `liveness-${Date.now()}.jpg`);
  const meta = {
    captureMode: "live_camera",
    durationMs: elapsed,
    frameCount: frames.length,
    motionScore: round(motionScore, 4),
    sharpnessScore: round(quality.sharpness, 2),
    minWidth: width,
    minHeight: height,
    brightnessScore: round(brightnessScore, 2),
    passedChecks,
    failedChecks,
    clientTimestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  return { file, meta };
}
function computeMotionScore(frames) {
  if (frames.length < 2) return 0;
  let total = 0;
  let pairs = 0;
  for (let i = 1; i < frames.length; i += 1) {
    total += frameDifference(frames[i - 1], frames[i]);
    pairs += 1;
  }
  return pairs ? total / pairs : 0;
}
function frameDifference(a, b) {
  const dataA = a.data;
  const dataB = b.data;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < dataA.length; i += 16) {
    const lumA = luminance(dataA[i], dataA[i + 1], dataA[i + 2]);
    const lumB = luminance(dataB[i], dataB[i + 1], dataB[i + 2]);
    sum += Math.abs(lumA - lumB) / 255;
    count += 1;
  }
  return count ? sum / count : 0;
}
function pickSharpestFrame(frames, width, height) {
  let bestIndex = 0;
  let bestScore = 0;
  for (let i = 0; i < frames.length; i += 1) {
    const score = estimateSharpness(frames[i], width, height);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  return { index: bestIndex, sharpnessScore: bestScore };
}
function estimateSharpness(frame, width, height) {
  const data = frame.data;
  let sum = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const idx = (y * width + x) * 4;
      const center = luminance(data[idx], data[idx + 1], data[idx + 2]);
      const right = luminance(
        data[idx + 4],
        data[idx + 5],
        data[idx + 6]
      );
      const down = luminance(
        data[idx + width * 4],
        data[idx + width * 4 + 1],
        data[idx + width * 4 + 2]
      );
      sum += Math.abs(center - right) + Math.abs(center - down);
      count += 1;
    }
  }
  return count ? sum / count : 0;
}
function luminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
function canvasToJpeg(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not encode photo"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.92
    );
  });
}
function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
export {
  captureLivenessFromVideo
};
