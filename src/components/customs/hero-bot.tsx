"use client";

import { cn } from "@/lib/utils";

/**
 * hero-bot.tsx — the customs bot, v3: the pebble.
 *
 * One smooth egg-shaped volume and nothing else — no orbit, no antenna,
 * no ears, no text. The 3D read comes from light, not line-art: the body
 * is lit from above (a soft vertical gradient), a gloss band catches the
 * desk light across the crown, the underside falls into shade, and a
 * blurred ground shadow breathes with the float so the pebble sits in
 * space instead of being drawn on the page. The face is a quiet visor:
 * two eyes that blink, a small pleased smile. Hover and the eyes turn
 * sage. Every color is a token — it re-inks when the desk lamp flips.
 * All motion is transform/opacity; reduced motion lets it rest.
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
        {/* the body's light — lit from above, falling away below: this is
            what makes a flat shape read as a volume */}
        <linearGradient id="hb-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--ink)" stopOpacity="0.13" />
          <stop offset="0.62" stopColor="var(--ink)" stopOpacity="0.05" />
          <stop offset="1" stopColor="var(--ink)" stopOpacity="0.02" />
        </linearGradient>
        {/* the gloss band — the specular catch that sells the curve */}
        <linearGradient id="hb-gloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.2" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        {/* the visor's depth — darker at its own foot */}
        <linearGradient id="hb-visor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--ink)" stopOpacity="0.08" />
          <stop offset="1" stopColor="var(--ink)" stopOpacity="0.04" />
        </linearGradient>
        {/* the ground shadow's softness */}
        <filter id="hb-blur" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>

      {/* the ground shadow — breathes with the float: smaller and fainter
          as the pebble rises, fuller as it settles */}
      <ellipse className="hb-shadow" cx="240" cy="348" rx="76" ry="11" fill="var(--ink)" filter="url(#hb-blur)" />

      {/* ---------------- the pebble ---------------- */}
      <g className="hb-bot">
        {/* the body — one smooth egg, lit from above */}
        <path
          d="M240 106 C304 106 344 150 344 214 C344 278 300 320 240 320 C180 320 136 278 136 214 C136 150 176 106 240 106 Z"
          fill="url(#hb-body)"
          stroke="var(--ink)"
          strokeOpacity="0.3"
          strokeWidth="1"
        />
        {/* the underside shade — ambient occlusion where the pebble meets
            itself; blurred so it reads as light, not as a line */}
        <path
          d="M168 262 C188 302 212 318 240 318 C268 318 292 302 312 262 C296 296 270 310 240 310 C210 310 184 296 168 262 Z"
          fill="var(--ink)"
          fillOpacity="0.1"
          filter="url(#hb-blur)"
        />
        {/* the gloss — the desk light caught across the crown */}
        <rect x="194" y="126" width="92" height="17" rx="8.5" fill="url(#hb-gloss)" />

        {/* the visor — the face, a shade set into the body */}
        <rect x="184" y="164" width="112" height="80" rx="26" fill="url(#hb-visor)" stroke="var(--ink)" strokeOpacity="0.16" strokeWidth="1" />
        {/* the eyes — they blink, and they turn sage when you visit */}
        <rect className="hb-eye" x="215" y="190" width="10" height="19" rx="5" fill="var(--ink)" />
        <rect className="hb-eye" x="255" y="190" width="10" height="19" rx="5" fill="var(--ink)" />
        {/* the smile — one small, pleased arc */}
        <path d="M229 228 Q240 235 251 228" fill="none" stroke="var(--ink)" strokeWidth="2.4" strokeOpacity="0.45" strokeLinecap="round" />
      </g>
    </svg>
  );
}
