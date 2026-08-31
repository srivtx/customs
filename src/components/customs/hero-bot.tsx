"use client";

import { cn } from "@/lib/utils";

/**
 * hero-bot.tsx — the customs bot, v2: a smooth little officer.
 *
 * Not line-art — a soft rounded body inked with gradients (lit from
 * above, like anything with mass), a glossy crown highlight, a visor
 * face that blinks, and one mandate chip orbiting it. The ground
 * shadow breathes with the float, so the bot reads as sitting in
 * space, not drawn on the page. Everything moves on transform and
 * opacity only (60fps, no layout), every color is a token — the bot
 * re-inks itself when the desk lamp flips. Hover it and its eyes turn
 * sage. The chip's type is the site's own label mono — one type
 * system, even inside the picture. Reduced motion: it stands still,
 * quietly on duty.
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
        {/* the body's light — lit from above, falling away below: this
            is what makes a flat shape read as a volume */}
        <linearGradient id="hb-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--ink)" stopOpacity="0.13" />
          <stop offset="1" stopColor="var(--ink)" stopOpacity="0.03" />
        </linearGradient>
        {/* the glass crown — a gloss catching the desk light */}
        <linearGradient id="hb-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        {/* the ground shadow's softness */}
        <filter id="hb-blur" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>

      {/* ---------------- the mandate orbit — one ring, one chip ----------------
          The ring group rotates about the bot's center; the chip rides it
          and counter-rotates about its own center, so it stays upright.
          The chip is the signed envelope: ed25519, ₹5,000. */}
      <g className="hb-ring">
        <circle cx="240" cy="206" r="136" fill="none" stroke="var(--ink)" strokeOpacity="0.12" strokeWidth="1" />
        <g className="hb-chip">
          <rect x="178" y="57" width="124" height="26" rx="5" fill="var(--paper)" stroke="var(--ink)" strokeOpacity="0.28" strokeWidth="1" />
          <text x="240" y="73.5" textAnchor="middle" className="hb-mono">
            <tspan fill="var(--cleared)">✓</tspan>
            <tspan fill="var(--ink-soft)" dx="6">ED25519 · ₹5,000</tspan>
          </text>
        </g>
      </g>

      {/* ---------------- the ground shadow — breathes with the float ---------------- */}
      <ellipse className="hb-shadow" cx="240" cy="318" rx="82" ry="13" fill="var(--ink)" filter="url(#hb-blur)" />

      {/* ---------------- the customs bot ---------------- */}
      <g className="hb-bot">
        {/* the antenna — the desk light, softly pulsing */}
        <line x1="240" y1="142" x2="240" y2="118" stroke="var(--ink)" strokeWidth="2" strokeOpacity="0.4" strokeLinecap="round" />
        <circle cx="240" cy="111" r="12" fill="none" stroke="var(--cleared)" strokeOpacity="0.28" strokeWidth="1" />
        <circle className="hb-bead" cx="240" cy="111" r="6" fill="var(--cleared)" />

        {/* the side pods — little ears, same light as the body */}
        <rect x="162" y="186" width="11" height="32" rx="5.5" fill="url(#hb-body)" stroke="var(--ink)" strokeOpacity="0.24" strokeWidth="1" />
        <rect x="307" y="186" width="11" height="32" rx="5.5" fill="url(#hb-body)" stroke="var(--ink)" strokeOpacity="0.24" strokeWidth="1" />

        {/* the body — one smooth capsule, lit from above */}
        <rect x="172" y="142" width="136" height="118" rx="42" fill="url(#hb-body)" stroke="var(--ink)" strokeOpacity="0.3" strokeWidth="1" />
        {/* the glass crown — the gloss that sells the volume */}
        <path d="M196 150 H284 Q288 150 288 154 V172 Q288 178 282 178 H198 Q192 178 192 172 V154 Q192 150 196 150 Z" fill="url(#hb-glass)" />

        {/* the visor — the face, a shade darker than the body */}
        <rect x="198" y="178" width="84" height="54" rx="17" fill="var(--ink)" fillOpacity="0.06" stroke="var(--ink)" strokeOpacity="0.2" strokeWidth="1" />
        {/* the eyes — they blink, and they turn sage when you visit */}
        <rect className="hb-eye" x="224" y="194" width="10" height="17" rx="5" fill="var(--ink)" />
        <rect className="hb-eye" x="246" y="194" width="10" height="17" rx="5" fill="var(--ink)" />
        {/* the smile — one small, pleased arc */}
        <path d="M232 221 Q240 227 248 221" fill="none" stroke="var(--ink)" strokeWidth="2.4" strokeOpacity="0.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}
