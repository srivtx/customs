"use client";

import { cn } from "@/lib/utils";

/**
 * hero-bot.tsx — the customs bot, v4: the little one.
 *
 * One smooth egg-shaped body, and a face drawn straight onto it — no
 * visor frame, no visor rectangle: just two big glossy eyes (each with
 * a specular glint, so they read as wet and alive), a whisper of blush
 * beneath them, and a small pleased smile. The eyes blink on their own
 * clock and glance aside every little while; hover turns them sage.
 *
 * The one flourish: an iridescent aurora — a wide, soft multi-hue
 * gradient clipped to the body's own shape, gliding slowly through it,
 * like light passing inside glass. It is the only place on the desk
 * where more than one color lives, which is exactly why it reads as
 * delightful instead of decorated.
 *
 * Structure: the body's volume comes from light, not line-art (lit from
 * above, ambient occlusion at the foot, gloss across the crown, a
 * ground shadow that breathes with the float). Every structural color
 * is a token; all motion is transform/opacity; reduced motion lets it
 * rest, quietly on duty.
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
        {/* the body's light — lit from above, falling away below */}
        <linearGradient id="hb-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--ink)" stopOpacity="0.13" />
          <stop offset="0.62" stopColor="var(--ink)" stopOpacity="0.05" />
          <stop offset="1" stopColor="var(--ink)" stopOpacity="0.02" />
        </linearGradient>
        {/* the gloss — the specular catch that sells the curve */}
        <linearGradient id="hb-gloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.2" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        {/* the aurora — the rainbow under the skin: soft hues, wide
            ribbon, wider than the body so it always drifts through */}
        <linearGradient id="hb-aurora-grad" x1="0" y1="0" x2="1" y2="0.35">
          <stop offset="0" stopColor="#a2c0a9" stopOpacity="0" />
          <stop offset="0.22" stopColor="#a2c0a9" stopOpacity="0.85" />
          <stop offset="0.45" stopColor="#9ec8e6" stopOpacity="0.8" />
          <stop offset="0.68" stopColor="#c9b6e4" stopOpacity="0.8" />
          <stop offset="0.88" stopColor="#e7cf9e" stopOpacity="0.75" />
          <stop offset="1" stopColor="#e7cf9e" stopOpacity="0" />
        </linearGradient>
        {/* the clip: the aurora only ever shows inside the body */}
        <clipPath id="hb-clip">
          <path d="M240 106 C304 106 344 150 344 214 C344 278 300 320 240 320 C180 320 136 278 136 214 C136 150 176 106 240 106 Z" />
        </clipPath>
        {/* the ground shadow's softness */}
        <filter id="hb-blur" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        {/* the blush's softness — a whisper, not a sticker */}
        <filter id="hb-blush-blur" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* the ground shadow — breathes with the float */}
      <ellipse className="hb-shadow" cx="240" cy="348" rx="76" ry="11" fill="var(--ink)" filter="url(#hb-blur)" />

      {/* ---------------- the little one ---------------- */}
      <g className="hb-bot">
        {/* the body — one smooth egg, lit from above */}
        <path
          d="M240 106 C304 106 344 150 344 214 C344 278 300 320 240 320 C180 320 136 278 136 214 C136 150 176 106 240 106 Z"
          fill="url(#hb-body)"
          stroke="var(--ink)"
          strokeOpacity="0.3"
          strokeWidth="1"
        />

        {/* the aurora — gliding through the body, clipped to its shape */}
        <g clipPath="url(#hb-clip)">
          <rect className="hb-aurora" x="40" y="106" width="400" height="214" fill="url(#hb-aurora-grad)" />
        </g>

        {/* the underside shade — ambient occlusion at the foot */}
        <path
          d="M168 262 C188 302 212 318 240 318 C268 318 292 302 312 262 C296 296 270 310 240 310 C210 310 184 296 168 262 Z"
          fill="var(--ink)"
          fillOpacity="0.1"
          filter="url(#hb-blur)"
        />
        {/* the gloss — the desk light caught across the crown */}
        <rect x="194" y="126" width="92" height="17" rx="8.5" fill="url(#hb-gloss)" />

        {/* ---------------- the face — drawn on the body, no frame ---------------- */}
        <g className="hb-eyes">
          {/* the eyes — big, glossy, alive: ink with a wet glint */}
          <rect className="hb-eye" x="210" y="182" width="13" height="24" rx="6.5" fill="var(--ink)" />
          <rect className="hb-eye" x="257" y="182" width="13" height="24" rx="6.5" fill="var(--ink)" />
          {/* the glints — the specular dots that make eyes read as eyes */}
          <circle cx="213.5" cy="187.5" r="2.6" fill="var(--paper)" opacity="0.9" />
          <circle cx="260.5" cy="187.5" r="2.6" fill="var(--paper)" opacity="0.9" />
        </g>
        {/* the blush — one soft breath of warmth under each eye */}
        <ellipse cx="204" cy="216" rx="10" ry="5.5" fill="#d9a8a8" opacity="0.4" filter="url(#hb-blush-blur)" />
        <ellipse cx="276" cy="216" rx="10" ry="5.5" fill="#d9a8a8" opacity="0.4" filter="url(#hb-blush-blur)" />
        {/* the smile — one small, pleased arc */}
        <path d="M228 222 Q240 231 252 222" fill="none" stroke="var(--ink)" strokeWidth="2.6" strokeOpacity="0.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}
