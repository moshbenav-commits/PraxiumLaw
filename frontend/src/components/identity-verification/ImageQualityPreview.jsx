"use client";
import { jsx, jsxs } from "react/jsx-runtime";
import { qualityIssueLabel } from "@/lib/imageQualityCheck";
function statusColor(ok) {
  return ok ? "text-green-700" : "text-amber-700";
}
function ImageQualityPreview({ result, compact = false }) {
  if (!result) return null;
  const lightingOk = !result.issues.includes("too_dark") && !result.issues.includes("too_bright");
  const focusOk = !result.issues.includes("blurry") && !result.issues.includes("low_contrast") && !result.issues.includes("dirty_lens_suspected");
  if (compact) {
    return /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2 text-xs", children: [
      /* @__PURE__ */ jsx("span", { className: statusColor(lightingOk), children: lightingOk ? "\u2713 Lighting OK" : "\u26A0 Lighting issue" }),
      /* @__PURE__ */ jsx("span", { className: statusColor(focusOk), children: focusOk ? "\u2713 Focus OK" : "\u26A0 Blurry or dirty lens" })
    ] });
  }
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: `rounded-lg border px-3 py-2 text-sm ${result.passed ? "border-green-200 bg-green-50 text-green-900" : "border-amber-200 bg-amber-50 text-amber-900"}`,
      children: [
        /* @__PURE__ */ jsx("p", { className: "font-semibold", children: result.passed ? "Quality check passed" : "Quality issues detected" }),
        /* @__PURE__ */ jsxs("ul", { className: "mt-2 space-y-1 text-xs", children: [
          /* @__PURE__ */ jsxs("li", { className: statusColor(lightingOk), children: [
            "Lighting: ",
            lightingOk ? "Good" : result.issues.includes("too_dark") ? "Too dark" : "Too bright"
          ] }),
          /* @__PURE__ */ jsxs("li", { className: statusColor(focusOk), children: [
            "Focus: ",
            focusOk ? "Sharp" : result.issues.includes("dirty_lens_suspected") ? "Lens may be smudged" : "Blurry"
          ] }),
          /* @__PURE__ */ jsxs("li", { className: "text-gray-600", children: [
            "Sharpness ",
            result.sharpness,
            " \xB7 Brightness ",
            result.brightness,
            " \xB7 Contrast ",
            result.contrast
          ] })
        ] }),
        !result.passed ? /* @__PURE__ */ jsxs("ul", { className: "mt-2 list-disc pl-4 text-xs text-amber-800", children: [
          result.issues.map((issue) => /* @__PURE__ */ jsx("li", { children: qualityIssueLabel(issue) }, issue)),
          result.hints.map((hint) => /* @__PURE__ */ jsx("li", { children: hint }, hint))
        ] }) : null
      ]
    }
  );
}
function LiveQualityIndicators({ lighting, focus, ready }) {
  const lightingLabel = lighting === "ok" ? "Lighting OK" : lighting === "dark" ? "Too dark" : lighting === "bright" ? "Too bright" : "Checking\u2026";
  const focusLabel = focus === "ok" ? "Focus OK" : focus === "dirty" ? "Wipe lens" : focus === "blurry" ? "Too blurry" : "Checking\u2026";
  return /* @__PURE__ */ jsxs("div", { className: "absolute bottom-2 left-2 right-2 flex flex-wrap gap-1.5", children: [
    /* @__PURE__ */ jsx(
      "span",
      {
        className: `rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur ${lighting === "ok" ? "bg-green-600/90 text-white" : "bg-amber-600/90 text-white"}`,
        children: lightingLabel
      }
    ),
    /* @__PURE__ */ jsx(
      "span",
      {
        className: `rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur ${focus === "ok" ? "bg-green-600/90 text-white" : "bg-amber-600/90 text-white"}`,
        children: focusLabel
      }
    ),
    ready ? /* @__PURE__ */ jsx("span", { className: "rounded-full bg-green-600/90 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur", children: "Ready to capture" }) : null
  ] });
}
export {
  ImageQualityPreview,
  LiveQualityIndicators
};
