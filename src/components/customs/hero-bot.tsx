"use client";

import { cn } from "@/lib/utils";

/**
 * hero-bot.tsx — the customs bot, the desk's little officer.
 *
 * x.ai keeps its hero typographic but animates it: their grid shimmer.
 * We take the same idea and give it a body — a small customs officer
 * drawn in the house language (hairlines, ink, the one sage accent)
 * with a mandate ring orbiting it. Everything moves on transform and
 * opacity only, so it stays at 60fps, and every color is a token —
 * the bot re-inks itself when the desk lamp flips. It blinks, it
 * floats, it stamps the ledger every few seconds; hover it and its
 * eyes turn sage. Reduced motion: it stands still, quietly on duty.
 */

export function HeroBot({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 400"
      aria-hidden="true"
      className={cn("hero-bot select-none", className)}
      role="img"
    >
      <defs>
        <linearGradient id="hb-shimmer" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--cleared)" stopOpacity="0" />
          <stop offset="0.45" stopColor="var(--cleared)" stopOpacity="0.9" />
          <stop offset="0.6" stopColor="var(--ink)" stopOpacity="0.5" />
          <stop offset="1" stopColor="var(--ink)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* ---------------- the shimmer — x.ai's moving hairlines ---------------- */}
      <g className="hb-shimmer-group">
        <rect className="hb-shimmer hb-shimmer-a" x="0" y="74" width="180" height="1" fill="url(#hb-shimmer)" />
        <rect className="hb-shimmer hb-shimmer-b" x="0" y="196" width="150" height="1" fill="url(#hb-shimmer)" opacity="0.7" />
        <rect className="hb-shimmer hb-shimmer-c" x="0" y="330" width="200" height="1" fill="url(#hb-shimmer)" opacity="0.55" />
        {/* the resting rails the sweeps ride on */}
        <line className="hb-rail" x1="24" y1="74" x2="456" y2="74" strokeWidth="1" />
        <line className="hb-rail" x1="24" y1="196" x2="456" y2="196" strokeWidth="1" opacity="0.55" />
        <line className="hb-rail" x1="24" y1="330" x2="456" y2="330" strokeWidth="1" opacity="0.4" />
      </g>

      {/* ---------------- the mandate ring — what orbits the bot ---------------- */}
      <g className="hb-ring">
        <circle className="hb-rail" cx="240" cy="205" r="138" fill="none" strokeWidth="1" />
        {/* the three bounds, riding the ring, staying upright */}
        <g className="hb-chip" style={{ transformOrigin: "359px 274px" }}>
          <g className="hb-chip-lean">
            <rect className="hb-strong" x="322" y="263" width="74" height="22" rx="3" fill="var(--paper)" strokeWidth="1" />
            <text x="359" y="277" textAnchor="middle" fill="var(--ink-soft)" className="hb-mono">
              ₹ cap 5,000
            </text>
          </g>
        </g>
        <g className="hb-chip" style={{ transformOrigin: "240px 67px" }}>
          <g className="hb-chip-lean">
            <rect className="hb-strong" x="196" y="56" width="88" height="22" rx="3" fill="var(--paper)" strokeWidth="1" />
            <text x="240" y="70" textAnchor="middle" fill="var(--ink-soft)" className="hb-mono">
              ✓ ed25519
            </text>
          </g>
        </g>
        <g className="hb-chip" style={{ transformOrigin: "121px 274px" }}>
          <g className="hb-chip-lean">
            <rect className="hb-strong" x="84" y="263" width="74" height="22" rx="3" fill="var(--paper)" strokeWidth="1" />
            <text x="121" y="277" textAnchor="middle" fill="var(--ink-soft)" className="hb-mono">
              10 checks
            </text>
          </g>
        </g>
      </g>

      {/* ---------------- the floating evidence ---------------- */}
      <g className="hb-bob hb-bob-a">
        <rect className="hb-strong" x="372" y="52" width="62" height="80" rx="4" fill="var(--paper)" strokeWidth="1" />
        <line className="hb-rail" x1="382" y1="66" x2="424" y2="66" strokeWidth="1" />
        <line className="hb-rail" x1="382" y1="76" x2="418" y2="76" strokeWidth="1" opacity="0.7" />
        <line className="hb-rail" x1="382" y1="86" x2="424" y2="86" strokeWidth="1" opacity="0.7" />
        <line className="hb-rail" x1="382" y1="96" x2="410" y2="96" strokeWidth="1" opacity="0.7" />
        <circle cx="386" cy="118" r="4" fill="var(--cleared)" />
        <line x1="388.5" y1="118" x2="392" y2="121.5" stroke="var(--cleared-contrast)" strokeWidth="1.4" />
        <line x1="392" y1="121.5" x2="397" y2="113" stroke="var(--cleared-contrast)" strokeWidth="1.4" />
      </g>
      <g className="hb-bob hb-bob-b">
        <rect className="hb-strong" x="18" y="288" width="136" height="26" rx="3" fill="var(--paper)" strokeWidth="1" />
        <circle cx="34" cy="301" r="3" fill="var(--cleared)" />
        <text x="46" y="304" fill="var(--ink-soft)" className="hb-mono">
          ord_7f3k · ₹6,998
        </text>
      </g>

      {/* ---------------- the customs bot ---------------- */}
      <g className="hb-bot">
        {/* antenna + the gate diamond, keeping watch */}
        <line className="hb-rail" x1="240" y1="120" x2="240" y2="138" strokeWidth="1" />
        <path d="M240 106 L250 116 L240 126 L230 116 Z" fill="var(--cleared)" />

        {/* head */}
        <rect className="hb-strong" x="192" y="138" width="96" height="68" rx="16" fill="var(--ink)" fillOpacity="0.04" strokeWidth="1" />
        {/* eyes — they blink, and they turn sage when you visit */}
        <rect className="hb-eye" x="218" y="158" width="11" height="17" rx="3.5" fill="var(--ink)" />
        <rect className="hb-eye" x="251" y="158" width="11" height="17" rx="3.5" fill="var(--ink)" />

        {/* body */}
        <rect className="hb-strong" x="203" y="210" width="74" height="46" rx="10" fill="var(--ink)" fillOpacity="0.03" strokeWidth="1" />
        {/* the chest diamond — the mandate slot */}
        <g className="hb-chest">
          <path d="M240 222 L251 233 L240 244 L229 233 Z" fill="var(--cleared)" />
        </g>
        {/* the stamp — a verdict ring leaving the chest */}
        <circle className="hb-stamp" cx="240" cy="233" r="14" fill="none" stroke="var(--cleared)" strokeWidth="1" />
        <circle className="hb-stamp hb-stamp-b" cx="240" cy="233" r="14" fill="none" stroke="var(--cleared)" strokeWidth="1" />

        {/* arms */}
        <rect className="hb-strong" x="182" y="216" width="9" height="28" rx="4.5" fill="var(--ink)" fillOpacity="0.05" strokeWidth="1" transform="rotate(18 186 230)" />
        <rect className="hb-strong" x="289" y="216" width="9" height="28" rx="4.5" fill="var(--ink)" fillOpacity="0.05" strokeWidth="1" transform="rotate(-18 293 230)" />
      </g>

      {/* the desk line the bot stands above */}
      <line className="hb-rail" x1="150" y1="330" x2="330" y2="330" strokeWidth="1" opacity="0.6" />
    </svg>
  );
}
