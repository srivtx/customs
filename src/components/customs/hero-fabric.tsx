import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * hero-fabric.tsx — the wool mat the bot sits on.
 *
 * A hand-cut felt patch rendered as one static SVG, stacked behind the
 * HeroBot (same 480×400 viewBox, so the two align pixel-for-pixel). The
 * technique is the zero-dependency felt recipe: turbulence-displaced
 * edges read as hand-cut wool, fractal-noise grain and a brushed nap
 * give the fiber, blurred pastel washes (the aurora's own palette) read
 * as dye spots, and a dotted running stitch closes the border. Yarn
 * pompoms — arc-wound spheres with radial shading and one small
 * displacement for the fluff — peek from the mat's edges and bob on
 * transform-only keyframes.
 *
 * Performance law: every filter here is STATIC — filters rasterize once
 * and cache; the only motion is transform/opacity on the pompoms (see
 * .hb-pom in globals.css). Nothing inside a filter graph ever animates.
 * All structural color is a token (paper/ink flip with the theme); the
 * pastels are the bot's own aurora set, so the mat and the bot share
 * one wardrobe.
 */
export function HeroFabric({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 400" aria-hidden="true" className={cn("select-none", className)}>
      <defs>
        {/* the hand-cut edge — low-frequency turbulence displaces the
            mat's border into soft scissor-cut wool (bf 0.01–0.03 reads
            as rolling felt; higher reads as sandpaper) */}
        <filter id="hfx-edge" x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="7" result="w" />
          <feDisplacementMap in="SourceGraphic" in2="w" scale="26" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        {/* the fiber grain — high-frequency fractal noise, desaturated,
            multiplied over the washes (rasterizes once, then tiles) */}
        <filter id="hfx-grain" x="-2%" y="-2%" width="104%" height="104%">
          <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        {/* the nap — a two-value baseFrequency stretches the noise into
            brushed fibers with a direction, like combed wool */}
        <filter id="hfx-nap" x="-2%" y="-2%" width="104%" height="104%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.9" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        {/* the pompom fluff — a small displacement wrags every rim into
            loose yarn hairs */}
        <filter id="hfx-fluff" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="3" seed="4" result="w" />
          <feDisplacementMap in="SourceGraphic" in2="w" scale="9" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="hfx-soft40" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="34" /></filter>
        <filter id="hfx-soft8" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="8" /></filter>
        <filter id="hfx-soft16" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="16" /></filter>
        <clipPath id="hfx-mat">
          <path d="M 240 60 C 330 56 402 88 418 148 C 432 200 430 258 402 302 C 372 346 312 358 240 356 C 168 354 106 342 78 300 C 52 260 50 196 66 144 C 84 90 150 64 240 60 Z" />
        </clipPath>
        {/* yarn-ball shading — highlight up-left, core color, dark rim:
            the sphere tell */}
        <radialGradient id="hfx-yarn-sage" cx="0.36" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#cfdccf" />
          <stop offset="0.5" stopColor="#a2c0a9" />
          <stop offset="1" stopColor="#6f8f79" />
        </radialGradient>
        <radialGradient id="hfx-yarn-butter" cx="0.36" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#f4e6c2" />
          <stop offset="0.5" stopColor="#e7cf9e" />
          <stop offset="1" stopColor="#b99a5e" />
        </radialGradient>
        <radialGradient id="hfx-yarn-lilac" cx="0.36" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#e2d7f2" />
          <stop offset="0.5" stopColor="#c9b6e4" />
          <stop offset="1" stopColor="#9377b8" />
        </radialGradient>
      </defs>

      {/* the felt mat — underlay, then the warped cloth. The underlay
          peeks 11px below: the mat's thickness, the cheapest 3D there
          is. Everything inside the clip warps together, so the stitch
          border follows the cut edge exactly. */}
      <g filter="url(#hfx-edge)">
        <path
          d="M 240 60 C 330 56 402 88 418 148 C 432 200 430 258 402 302 C 372 346 312 358 240 356 C 168 354 106 342 78 300 C 52 260 50 196 66 144 C 84 90 150 64 240 60 Z"
          transform="translate(0 11)"
          fill="var(--ink)"
          opacity="0.13"
        />
        <g clipPath="url(#hfx-mat)">
          <path
            d="M 240 60 C 330 56 402 88 418 148 C 432 200 430 258 402 302 C 372 346 312 358 240 356 C 168 354 106 342 78 300 C 52 260 50 196 66 144 C 84 90 150 64 240 60 Z"
            fill="var(--paper)"
          />
          {/* the dye washes — the aurora palette soaked into the wool */}
          <ellipse cx="150" cy="150" rx="110" ry="84" fill="#a2c0a9" opacity="0.5" filter="url(#hfx-soft40)" className="hfx-wash" />
          <ellipse cx="335" cy="125" rx="100" ry="72" fill="#9ec8e6" opacity="0.42" filter="url(#hfx-soft40)" className="hfx-wash" />
          <ellipse cx="352" cy="292" rx="92" ry="70" fill="#c9b6e4" opacity="0.44" filter="url(#hfx-soft40)" className="hfx-wash" />
          <ellipse cx="118" cy="300" rx="100" ry="66" fill="#e7cf9e" opacity="0.46" filter="url(#hfx-soft40)" className="hfx-wash" />
          {/* cloth folds — soft troughs the light falls into */}
          <ellipse cx="240" cy="222" rx="130" ry="24" fill="var(--ink)" opacity="0.08" filter="url(#hfx-soft16)" transform="rotate(-4 240 222)" />
          <ellipse cx="352" cy="210" rx="70" ry="14" fill="var(--ink)" opacity="0.06" filter="url(#hfx-soft16)" transform="rotate(-7 352 210)" />
          {/* the studio sheen — one breath of light across the wool */}
          <ellipse cx="185" cy="105" rx="130" ry="42" fill="#ffffff" opacity="0.14" filter="url(#hfx-soft40)" />
          {/* the fiber — grain, then the brushed nap */}
          <rect x="44" y="54" width="392" height="308" filter="url(#hfx-grain)" opacity="0.08" style={{ mixBlendMode: "multiply" }} />
          <rect x="44" y="54" width="392" height="308" filter="url(#hfx-nap)" opacity="0.06" style={{ mixBlendMode: "overlay" }} />
          {/* the running stitch — dotted round caps along the cut edge */}
          <path
            d="M 240 60 C 330 56 402 88 418 148 C 432 200 430 258 402 302 C 372 346 312 358 240 356 C 168 354 106 342 78 300 C 52 260 50 196 66 144 C 84 90 150 64 240 60 Z"
            fill="none"
            stroke="var(--ink)"
            strokeOpacity="0.4"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeDasharray="0.5 11"
          />
        </g>
      </g>

      {/* ---------------- the pompoms ---------------- */}
      {/* each ball: contact shadow, shaded sphere, wound arcs in
          alternating light/dark yarn, one loose strand */}
      <g className="hb-pom" style={{ "--tilt": "-7deg" } as CSSProperties} filter="url(#hfx-fluff)">
        <ellipse cx="94" cy="160" rx="22" ry="5" fill="var(--ink)" opacity="0.15" filter="url(#hfx-soft8)" />
        <circle cx="92" cy="128" r="27" fill="url(#hfx-yarn-sage)" />
        <g fill="none" strokeLinecap="round">
          <path d="M 67 117 Q 92 102 117 117" stroke="#6f8f79" strokeWidth="3.4" />
          <path d="M 65 128 Q 92 116 119 128" stroke="#cfdccf" strokeWidth="3.4" />
          <path d="M 67 139 Q 92 128 117 139" stroke="#6f8f79" strokeWidth="3.4" />
          <path d="M 72 149 Q 92 141 112 149" stroke="#cfdccf" strokeWidth="3.4" />
          <path d="M 108 150 q 9 6 5 15" stroke="#6f8f79" strokeWidth="2.6" />
        </g>
      </g>
      <g className="hb-pom hb-pom2" style={{ "--tilt": "6deg" } as CSSProperties} filter="url(#hfx-fluff)">
        <ellipse cx="398" cy="196" rx="18" ry="4.5" fill="var(--ink)" opacity="0.15" filter="url(#hfx-soft8)" />
        <circle cx="396" cy="168" r="23" fill="url(#hfx-yarn-butter)" />
        <g fill="none" strokeLinecap="round">
          <path d="M 375 159 Q 396 146 417 159" stroke="#b99a5e" strokeWidth="3" />
          <path d="M 373 168 Q 396 158 419 168" stroke="#f4e6c2" strokeWidth="3" />
          <path d="M 375 177 Q 396 168 417 177" stroke="#b99a5e" strokeWidth="3" />
          <path d="M 379 186 Q 396 180 413 186" stroke="#f4e6c2" strokeWidth="3" />
        </g>
      </g>
      <g className="hb-pom hb-pom3" style={{ "--tilt": "9deg" } as CSSProperties} filter="url(#hfx-fluff)">
        <ellipse cx="76" cy="322" rx="16" ry="4" fill="var(--ink)" opacity="0.15" filter="url(#hfx-soft8)" />
        <circle cx="74" cy="296" r="21" fill="url(#hfx-yarn-lilac)" />
        <g fill="none" strokeLinecap="round">
          <path d="M 56 288 Q 74 277 92 288" stroke="#9377b8" strokeWidth="2.8" />
          <path d="M 54 296 Q 74 288 94 296" stroke="#e2d7f2" strokeWidth="2.8" />
          <path d="M 56 304 Q 74 297 92 304" stroke="#9377b8" strokeWidth="2.8" />
          <path d="M 59 312 Q 74 307 89 312" stroke="#e2d7f2" strokeWidth="2.8" />
        </g>
      </g>
    </svg>
  );
}
