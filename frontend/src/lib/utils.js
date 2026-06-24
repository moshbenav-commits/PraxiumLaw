import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso, opts = {}) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", ...opts });
  } catch { return iso; }
}

export function formatDateTime(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
  catch { return iso; }
}

export function timeAgo(iso) {
  if (!iso) return "—";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(iso);
}

export function formatMoney(n) {
  if (n == null) return "—";
  return `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function initials(name) {
  if (!name) return "??";
  return name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export const STATUS_COLORS = {
  intake: "bg-blue-100 text-blue-900 border-blue-200",
  active: "bg-emerald-100 text-emerald-900 border-emerald-200",
  discovery: "bg-violet-100 text-violet-900 border-violet-200",
  negotiation: "bg-amber-100 text-amber-900 border-amber-200",
  litigation: "bg-rose-100 text-rose-900 border-rose-200",
  settlement: "bg-teal-100 text-teal-900 border-teal-200",
  closed: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

export const STATUS_DOT = {
  intake: "bg-blue-500", active: "bg-emerald-500", discovery: "bg-violet-500",
  negotiation: "bg-amber-500", litigation: "bg-rose-500", settlement: "bg-teal-500", closed: "bg-zinc-400",
};

export const STATUSES = ["intake", "active", "discovery", "negotiation", "litigation", "settlement", "closed"];

export const PRACTICE_AREAS = [
  { id: "personal_injury", label: "Personal Injury" },
  { id: "family", label: "Family Law" },
  { id: "criminal", label: "Criminal Defense" },
  { id: "bankruptcy", label: "Bankruptcy" },
  { id: "immigration", label: "Immigration" },
  { id: "estate", label: "Estate Planning" },
  { id: "workers_comp", label: "Workers' Comp" },
  { id: "ip", label: "Intellectual Property" },
  { id: "corporate", label: "Corporate" },
  { id: "real_estate", label: "Real Estate" },
];

export const CONTACT_KINDS = [
  { id: "client", label: "Client" },
  { id: "opposing", label: "Opposing Party" },
  { id: "witness", label: "Witness" },
  { id: "expert", label: "Expert" },
  { id: "judge", label: "Judge" },
  { id: "adjuster", label: "Adjuster" },
  { id: "provider", label: "Medical Provider" },
  { id: "vendor", label: "Vendor" },
];
