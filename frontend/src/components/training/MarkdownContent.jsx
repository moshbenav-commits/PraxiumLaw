import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

/** Lightweight markdown → React (no extra deps). */
export default function MarkdownContent({ markdown, className, onInternalLink }) {
  const navigate = useNavigate();
  if (!markdown) return null;

  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let i = 0;

  const linkify = (text, keyPrefix) => {
    const parts = [];
    const re = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|`[^`]+`)/g;
    let last = 0;
    let m;
    let k = 0;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) parts.push(text.slice(last, m.index));
      const tok = m[0];
      if (tok.startsWith("**")) {
        parts.push(<strong key={`${keyPrefix}-b${k++}`}>{tok.slice(2, -2)}</strong>);
      } else if (tok.startsWith("`")) {
        parts.push(
          <code key={`${keyPrefix}-c${k++}`} className="px-1 py-0.5 bg-praxium-bg rounded text-xs font-mono">
            {tok.slice(1, -1)}
          </code>,
        );
      } else {
        const lm = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (lm) {
          const label = lm[1];
          const href = lm[2];
          const article = href.match(/articles\/([0-9a-z\-]+)\.md/i);
          const guide = href.match(/training-guides\/([a-z\-]+)\.md/i);
          if (article || guide) {
            const slug = article ? article[1] : guide[1];
            const type = article ? "article" : "guide";
            parts.push(
              <button
                type="button"
                key={`${keyPrefix}-l${k++}`}
                className="text-praxium-accent hover:underline font-medium"
                onClick={() => (onInternalLink ? onInternalLink(type, slug) : navigate(`/training/${type}/${slug}`))}
              >
                {label}
              </button>,
            );
          } else if (href.startsWith("http")) {
            parts.push(
              <a key={`${keyPrefix}-l${k++}`} href={href} target="_blank" rel="noreferrer" className="text-praxium-accent hover:underline">
                {label}
              </a>,
            );
          } else {
            parts.push(<span key={`${keyPrefix}-l${k++}`}>{label}</span>);
          }
        }
      }
      last = m.index + tok.length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith("```")) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push(
        <pre key={`pre-${blocks.length}`} className="my-4 p-4 bg-praxium-bg border border-praxium-line rounded-sm overflow-x-auto text-xs font-mono">
          {code.join("\n")}
        </pre>,
      );
      continue;
    }

    if (line.startsWith("# ")) {
      blocks.push(
        <h1 key={`h1-${blocks.length}`} className="font-display font-black text-2xl sm:text-3xl tracking-tight mt-2 mb-4">
          {line.slice(2)}
        </h1>,
      );
      i += 1;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={`h2-${blocks.length}`} className="font-display font-bold text-xl mt-8 mb-3">
          {line.slice(3)}
        </h2>,
      );
      i += 1;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push(
        <h3 key={`h3-${blocks.length}`} className="font-display font-semibold text-lg mt-6 mb-2">
          {line.slice(4)}
        </h3>,
      );
      i += 1;
      continue;
    }

    if (line.startsWith("| ") && line.includes("|")) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        if (!/^\|[\s\-:|]+\|$/.test(lines[i].trim())) rows.push(lines[i]);
        i += 1;
      }
      if (rows.length) {
        const parse = (r) => r.split("|").slice(1, -1).map((c) => c.trim());
        const header = parse(rows[0]);
        const body = rows.slice(1);
        blocks.push(
          <div key={`tbl-${blocks.length}`} className="my-4 overflow-x-auto">
            <table className="w-full text-sm border border-praxium-line">
              <thead>
                <tr className="bg-praxium-bg">
                  {header.map((h) => (
                    <th key={h} className="text-left px-3 py-2 border-b border-praxium-line font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, ri) => (
                  <tr key={ri} className="border-b border-praxium-line last:border-0">
                    {parse(row).map((cell, ci) => (
                      <td key={ci} className="px-3 py-2 align-top">{linkify(cell, `t${ri}-${ci}`)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
      }
      continue;
    }

    if (/^[-*] \[ \]/.test(line)) {
      blocks.push(
        <div key={`cb-${blocks.length}`} className="flex gap-2 text-sm my-1">
          <span className="text-praxium-subtle">☐</span>
          <span>{linkify(line.replace(/^[-*] \[ \]\s*/, ""), `cb${blocks.length}`)}</span>
        </div>,
      );
      i += 1;
      continue;
    }

    if (/^[-*] /.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(lines[i].replace(/^[-*] /, ""));
        i += 1;
      }
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="list-disc pl-5 my-3 space-y-1 text-sm">
          {items.map((it, idx) => (
            <li key={idx}>{linkify(it, `li${idx}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\. /.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i += 1;
      }
      blocks.push(
        <ol key={`ol-${blocks.length}`} className="list-decimal pl-5 my-3 space-y-1 text-sm">
          {items.map((it, idx) => (
            <li key={idx}>{linkify(it, `oli${idx}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    if (line.trim() === "---") {
      blocks.push(<hr key={`hr-${blocks.length}`} className="my-6 border-praxium-line" />);
      i += 1;
      continue;
    }

    if (!line.trim()) {
      i += 1;
      continue;
    }

    blocks.push(
      <p key={`p-${blocks.length}`} className="text-sm leading-relaxed my-2 text-praxium-ink">
        {linkify(line, `p${blocks.length}`)}
      </p>,
    );
    i += 1;
  }

  return <article className={cn("training-md max-w-none", className)}>{blocks}</article>;
}

export function TrainingBreadcrumb({ items }) {
  return (
    <nav className="text-xs font-mono text-praxium-subtle mb-4 flex flex-wrap gap-1 items-center">
      {items.map((it, idx) => (
        <span key={it.label} className="flex items-center gap-1">
          {idx > 0 && <span>/</span>}
          {it.to ? (
            <Link to={it.to} className="hover:text-praxium-accent">{it.label}</Link>
          ) : (
            <span className="text-praxium-ink">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
