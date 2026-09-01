"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * hero-bot.tsx — the customs bot, v5: the little one, made safe.
 *
 * One smooth egg-shaped body, and a face drawn straight onto it — no
 * visor frame: two big glossy eyes (each with a specular glint, so they
 * read as wet and alive), a whisper of blush beneath them, and a small
 * pleased smile. The eyes blink on their own clock — sometimes twice —
 * glance aside and back, and the glints drift a half-millimetre against
 * the glance, the way real highlights stay with the light, not the eye.
 *
 * The one flourish: an iridescent aurora inside the skin. v4 drifted a
 * wide gradient rect through a clipped group — but the ribbon's opaque
 * core was narrower than the body plus its travel, so at each end of
 * the sweep the ribbon mostly left the egg (the body read empty) and
 * its edge crossed the visible face. v5 animates the GRADIENT instead:
 * the rect is static, exactly the egg's bounds, clipped to the egg's
 * own path, and SMIL translates the gradient's paint through it. The
 * paint cannot leave the rect (a fill never escapes its geometry), the
 * core is sized so the egg is covered at every phase, and no CSS
 * transform layer exists to drop an ancestor clip mid-flight. The
 * aurora is now structurally incapable of leaving the shape.
 *
 * The crown highlight is a blurred ellipse, not a rect — v4's gloss
 * rect read as a small rectangle on the forehead in both themes; a
 * sheen with no boundary cannot read as a shape at all.
 *
 * Structure: the body's volume comes from light, not line-art (lit from
 * above, ambient occlusion at the foot, gloss across the crown, a
 * ground shadow that breathes with the float). Every structural color
 * is a token; motion is transform/opacity on the main thread or SMIL
 * on a paint-only path; reduced motion pauses the SMIL clock and lets
 * the bot rest, quietly on duty. The full contract lives in
 * docs/DESIGN_SYSTEM.md.
 */
export function HeroBot({ className }: { className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  /* SMIL has no CSS media query — pause the clock directly when the
     visitor asks for stillness, resume if they change their mind. */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      if (mq.matches) svg.pauseAnimations();
      else svg.unpauseAnimations();
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return (
    <svg
      ref={svgRef}
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
        {/* the aurora — the rainbow under the skin. userSpaceOnUse so
            the SMIL translate below moves the PAINT through a static
            rect, never the rect itself. The opaque core (offsets
            0.31–0.94) is sized to cover the egg at both ends of the
            ±48px drift, so the body is never empty and no edge of the
            ribbon is ever visible inside it. */}
        <linearGradient
          id="hb-aurora-grad"
          gradientUnits="userSpaceOnUse"
          x1="-60"
          y1="100"
          x2="420"
          y2="300"
        >
          <stop offset="0" stopColor="#a2c0a9" stopOpacity="0" />
          <stop offset="0.31" stopColor="#a2c0a9" stopOpacity="0.85" />
          <stop offset="0.52" stopColor="#9ec8e6" stopOpacity="0.8" />
          <stop offset="0.72" stopColor="#c9b6e4" stopOpacity="0.8" />
          <stop offset="0.94" stopColor="#e7cf9e" stopOpacity="0.7" />
          <stop offset="1" stopColor="#e7cf9e" stopOpacity="0" />
          <animateTransform
            attributeName="gradientTransform"
            type="translate"
            values="-48 0; 48 0; -48 0"
            keyTimes="0; 0.5; 1"
            dur="9s"
            calcMode="spline"
            keySplines="0.45 0 0.55 1; 0.45 0 0.55 1"
            repeatCount="indefinite"
          />
        </linearGradient>
        {/* the clip: the aurora's rect is clipped to the egg's own path —
            static element, static clip, nothing can drift out of alignment */}
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
        {/* the crown sheen's softness — no boundary, so no shape */}
        <filter id="hb-sheen-blur" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="7" />
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

        {/* the aurora — the paint glides; the rect never moves, so the
            light can only ever live inside the body */}
        <rect
          className="hb-aurora"
          x="136"
          y="106"
          width="208"
          height="214"
          clipPath="url(#hb-clip)"
          fill="url(#hb-aurora-grad)"
        />

        {/* the underside shade — ambient occlusion at the foot */}
        <path
          d="M168 262 C188 302 212 318 240 318 C268 318 292 302 312 262 C296 296 270 310 240 310 C210 310 184 296 168 262 Z"
          fill="var(--ink)"
          fillOpacity="0.1"
          filter="url(#hb-blur)"
        />
        {/* the crown sheen — one soft breath of light, blurred past
            having an edge: the desk light caught on the curve */}
        <ellipse cx="240" cy="132" rx="40" ry="7" fill="url(#hb-gloss)" filter="url(#hb-sheen-blur)" />

        {/* ---------------- the face — drawn on the body, no frame ---------------- */}
        <g className="hb-eyes">
          {/* the eyes — big, glossy, alive: ink with a wet glint */}
          <rect className="hb-eye" x="210" y="182" width="13" height="24" rx="6.5" fill="var(--ink)" />
          <rect className="hb-eye" x="257" y="182" width="13" height="24" rx="6.5" fill="var(--ink)" />
        </g>
        {/* the glints — the specular dots that make eyes read as eyes.
            They sit in their own group so they can drift a half-step
            AGAINST the glance: a highlight follows the room's light,
            not the eye — the smallest possible tell of a wet surface */}
        <g className="hb-glints">
          <circle cx="213.5" cy="187.5" r="2.6" fill="var(--paper)" opacity="0.9" />
          <circle cx="260.5" cy="187.5" r="2.6" fill="var(--paper)" opacity="0.9" />
        </g>
        {/* the blush — one soft breath of warmth under each eye */}
        <ellipse className="hb-blush" cx="204" cy="216" rx="10" ry="5.5" fill="#d9a8a8" opacity="0.4" filter="url(#hb-blush-blur)" />
        <ellipse className="hb-blush" cx="276" cy="216" rx="10" ry="5.5" fill="#d9a8a8" opacity="0.4" filter="url(#hb-blush-blur)" />
        {/* the smile — one small, pleased arc */}
        <path d="M228 222 Q240 231 252 222" fill="none" stroke="var(--ink)" strokeWidth="2.6" strokeOpacity="0.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}
