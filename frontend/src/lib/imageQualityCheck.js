const QUALITY_THRESHOLDS = {
  selfie: {
    minWidth: 480,
    minHeight: 480,
    minBrightness: 40,
    maxBrightness: 225,
    minSharpness: 14,
    minContrast: 18,
    dirtyLensSharpnessMax: 10,
    dirtyLensContrastMax: 14
  },
  idDocument: {
    minWidth: 640,
    minHeight: 400,
    minBrightness: 35,
    maxBrightness: 235,
    minSharpness: 10,
    minContrast: 15,
    dirtyLensSharpnessMax: 8,
    dirtyLensContrastMax: 12
  }
};
function analyzeImageData(frame, profile) {
  const { width, height } = frame;
  const thresholds = QUALITY_THRESHOLDS[profile];
  const brightness = averageBrightness(frame, width, height);
  const sharpness = estimateSharpness(frame, width, height);
  const contrast = estimateContrast(frame, width, height);
  const issues = [];
  const hints = [];
  if (width < thresholds.minWidth || height < thresholds.minHeight) {
    issues.push("resolution_too_low");
    hints.push("Move closer so your ID or face fills more of the frame.");
  }
  if (brightness < thresholds.minBrightness) {
    issues.push("too_dark");
    hints.push("Image is too dark \u2014 turn on a light or move to a brighter area.");
  } else if (brightness > thresholds.maxBrightness) {
    issues.push("too_bright");
    hints.push("Too much glare or brightness \u2014 avoid direct light on the lens or ID.");
  }
  if (sharpness < thresholds.minSharpness) {
    issues.push("blurry");
    hints.push("Image looks blurry \u2014 hold the phone steady and tap to focus if needed.");
  }
  if (contrast < thresholds.minContrast) {
    issues.push("low_contrast");
    hints.push("Hard to read details \u2014 improve lighting and avoid shadows across the image.");
  }
  if (sharpness <= thresholds.dirtyLensSharpnessMax && contrast <= thresholds.dirtyLensContrastMax && brightness >= thresholds.minBrightness) {
    issues.push("dirty_lens_suspected");
    hints.push("Lens may be smudged \u2014 wipe the front camera with a clean cloth and try again.");
  }
  return {
    passed: issues.length === 0,
    brightness: round(brightness, 1),
    sharpness: round(sharpness, 1),
    contrast: round(contrast, 1),
    width,
    height,
    issues,
    hints: [...new Set(hints)]
  };
}
function analyzeVideoFrame(video, profile) {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, width, height);
  return analyzeImageData(ctx.getImageData(0, 0, width, height), profile);
}
async function analyzeImageFile(file, profile) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    bitmap.close();
    throw new Error("Could not read image");
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return analyzeImageData(ctx.getImageData(0, 0, canvas.width, canvas.height), profile);
}
function qualityIssueLabel(issue) {
  switch (issue) {
    case "too_dark":
      return "Too dark";
    case "too_bright":
      return "Too bright / glare";
    case "blurry":
      return "Blurry";
    case "low_contrast":
      return "Low contrast";
    case "dirty_lens_suspected":
      return "Lens may be dirty";
    case "resolution_too_low":
      return "Too far away";
    default:
      return issue;
  }
}
function formatQualityFailure(result) {
  if (result.passed) return "";
  const labels = result.issues.map(qualityIssueLabel).join(", ");
  const hint = result.hints[0] ?? "Adjust lighting or wipe your camera lens and try again.";
  return `Photo quality check failed (${labels}). ${hint}`;
}
function liveQualityStatus(result) {
  if (!result) {
    return { lighting: "unknown", focus: "unknown", ready: false };
  }
  let lighting = "ok";
  if (result.issues.includes("too_dark")) lighting = "dark";
  else if (result.issues.includes("too_bright")) lighting = "bright";
  let focus = "ok";
  if (result.issues.includes("dirty_lens_suspected")) focus = "dirty";
  else if (result.issues.includes("blurry") || result.issues.includes("low_contrast")) {
    focus = "blurry";
  }
  const blocking = result.issues.filter(
    (i) => i !== "resolution_too_low"
  );
  return {
    lighting,
    focus,
    ready: blocking.length === 0
  };
}
function estimateSharpness(frame, width, height) {
  const data = frame.data;
  let sum = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const idx = (y * width + x) * 4;
      const center = luminance(data[idx], data[idx + 1], data[idx + 2]);
      const right = luminance(data[idx + 4], data[idx + 5], data[idx + 6]);
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
function estimateContrast(frame, width, height) {
  const data = frame.data;
  const samples = [];
  for (let y = 0; y < height; y += 6) {
    for (let x = 0; x < width; x += 6) {
      const idx = (y * width + x) * 4;
      samples.push(luminance(data[idx], data[idx + 1], data[idx + 2]));
    }
  }
  if (samples.length < 2) return 0;
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const variance = samples.reduce((acc, v) => acc + (v - mean) ** 2, 0) / samples.length;
  return Math.sqrt(variance);
}
function averageBrightness(frame, width, height) {
  const data = frame.data;
  let sum = 0;
  let count = 0;
  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      const idx = (y * width + x) * 4;
      sum += luminance(data[idx], data[idx + 1], data[idx + 2]);
      count += 1;
    }
  }
  return count ? sum / count : 0;
}
function luminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
export {
  QUALITY_THRESHOLDS,
  analyzeImageData,
  analyzeImageFile,
  analyzeVideoFrame,
  formatQualityFailure,
  liveQualityStatus,
  qualityIssueLabel
};
