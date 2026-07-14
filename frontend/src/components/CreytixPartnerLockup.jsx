import React from "react";

/** Local lockup for CRA Praxium — mirrors @creytix/partner-kit pattern (icon + plus + Creytix). */
export function CreytixPartnerLockup({ partnerName = "Praxium Law" }) {
  const size = 36;
  return (
    <a
      href="/partnered-with-creytix"
      aria-label={`${partnerName} partnered with Creytix`}
      className="inline-flex flex-col items-start gap-1.5 no-underline text-inherit"
    >
      <span className="inline-flex items-center gap-2.5">
        <span
          className="inline-flex items-center justify-center rounded-lg bg-white/15 text-sm font-bold text-white"
          style={{ width: size, height: size }}
          aria-hidden="true"
        >
          P
        </span>
        <span className="text-lg font-medium text-white/55" aria-hidden="true">
          +
        </span>
        <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Creytix">
          <defs>
            <linearGradient id="cxHexGrad" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#E85D3B" />
              <stop offset="55%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#4F46E5" />
            </linearGradient>
          </defs>
          <path
            d="M32 4 L54 17 L54 47 L32 60 L10 47 L10 17 Z"
            fill="#FFFFFF"
            stroke="url(#cxHexGrad)"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <path d="M32 22 L44 29 L44 41 L32 48 L20 41 L20 29 Z" fill="none" stroke="#111827" strokeWidth="1.6" />
          <path d="M32 22 L44 29 L32 36 L20 29 Z" fill="#F9FAFB" stroke="#111827" strokeWidth="1.4" />
          <path d="M20 29 L32 36 L32 48 L20 41 Z" fill="#F3F4F6" stroke="#111827" strokeWidth="1.4" />
          <path d="M32 36 L44 29 L44 41 L32 48 Z" fill="#111827" stroke="#111827" strokeWidth="1.2" />
        </svg>
      </span>
      <span className="text-xs text-white/70">Partnered with Creytix</span>
    </a>
  );
}
