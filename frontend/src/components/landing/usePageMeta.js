import { useEffect } from "react";

const DEFAULT = {
  title: "Praxium Suite — Law Firm Operating System",
  description:
    "Replace Filevine and eight other tools with one AI-native platform. Save up to 70% on software. Built for U.S. law firms.",
};

/** Sets document title + meta description for public marketing routes (CRA has no SSR). */
export default function usePageMeta({ title = DEFAULT.title, description = DEFAULT.description } = {}) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    let meta = document.querySelector('meta[name="description"]');
    const prevDescription = meta?.getAttribute("content") ?? "";
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", description);

    return () => {
      document.title = prevTitle;
      if (meta) meta.setAttribute("content", prevDescription);
    };
  }, [title, description]);
}
