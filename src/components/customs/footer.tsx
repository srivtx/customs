"use client";

/**
 * footer.tsx — the bottom of the desk, rebuilt on x.ai's footer pattern:
 * a left column (mark, one copyright line, the theme toggle and the
 * source pill at its foot) and quiet link columns on the right —
 * 13px links at half opacity that only reach full ink on approach.
 * A footer says where things are; it does not repeat the site.
 *
 * The one decoration: the wool world runs under the footer — a thin
 * felt band whose top edge is hand-cut (the hero mat's same recipe,
 * condensed to a strip), two pompoms tucked into its corners, and a
 * quiet colophon row of verdict stamps that thump in once, in view.
 * All of it static paint + transform/opacity, all of it token-colored.
 */
import type { CSSProperties } from "react";
import { LogoMark } from "./bits";
import { ThemeToggle } from "./theme";
import type { View } from "./shell";

const GITHUB = "https://github.com/srivtx/customs";

/* the hand-cut top edge of the felt band — one irregular line, drawn
   once, stretched by the layout (preserveAspectRatio none). The wobble
   amplitude already varies, so the stretch reads as more hand. */
const BAND_EDGE =
  "M 0 14 C 60 8 120 16 190 12 C 260 8 320 18 400 13 C 470 9 540 17 620 12 C 700 7 770 18 850 13 C 920 9 990 16 1070 11 C 1150 7 1220 18 1300 13 C 1370 9 1450 17 1520 12 C 1560 9 1580 13 1600 11";

/**
 * YarnPom — a mini yarn ball tucked on the band's edge. Same
 * construction as the hero pompoms at pocket scale: shaded sphere,
 * wound arcs, one fluff displacement, bobbing on .hb-pom.
 */
function YarnPom({
  id,
  light,
  base,
  dark,
  className,
  tilt,
}: {
  id: string;
  light: string;
  base: string;
  dark: string;
  className?: string;
  tilt: number;
}) {
  return (
    <svg
      viewBox="0 0 26 26"
      aria-hidden="true"
      className={`absolute h-[22px] w-[22px] ${className ?? ""}`}
    >
      <defs>
        <radialGradient id={id} cx="0.36" cy="0.3" r="0.9">
          <stop offset="0" stopColor={light} />
          <stop offset="0.5" stopColor={base} />
          <stop offset="1" stopColor={dark} />
        </radialGradient>
        <filter id={`${id}-fluff`} x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.14" numOctaves="3" seed="4" result="w" />
          <feDisplacementMap in="SourceGraphic" in2="w" scale="4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <g className="hb-pom" style={{ "--tilt": `${tilt}deg` } as CSSProperties} filter={`url(#${id}-fluff)`}>
        <circle cx="13" cy="13" r="10.5" fill={`url(#${id})`} />
        <g fill="none" strokeLinecap="round">
          <path d="M 4.5 9.5 Q 13 5 21.5 9.5" stroke={dark} strokeWidth="1.5" />
          <path d="M 3.8 13 Q 13 9.6 22.2 13" stroke={light} strokeWidth="1.5" />
          <path d="M 4.5 16.5 Q 13 13.6 21.5 16.5" stroke={dark} strokeWidth="1.5" />
          <path d="M 6.5 20 Q 13 17.8 19.5 20" stroke={light} strokeWidth="1.5" />
        </g>
      </g>
    </svg>
  );
}

/**
 * FeltBand — the footer's rug edge. A 1600×30 strip: hand-cut top
 * edge, pastel washes, grain, running stitch. The pompoms live outside
 * the stretched svg so they stay round.
 */
function FeltBand() {
  return (
    <div className="relative" aria-hidden="true">
      <svg viewBox="0 0 1600 30" preserveAspectRatio="none" className="block h-[26px] w-full sm:h-[30px]">
        <defs>
          <clipPath id="ft-band">
            <path d={`${BAND_EDGE} L 1600 30 L 0 30 Z`} />
          </clipPath>
          <filter id="ft-grain" x="-2%" y="-2%" width="104%" height="104%">
            <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <filter id="ft-soft" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="11" />
          </filter>
        </defs>
        <g clipPath="url(#ft-band)">
          <path d={`${BAND_EDGE} L 1600 30 L 0 30 Z`} fill="var(--paper)" />
          {/* the aurora palette soaked along the band */}
          <ellipse cx="240" cy="26" rx="230" ry="20" fill="#a2c0a9" opacity="0.45" filter="url(#ft-soft)" />
          <ellipse cx="640" cy="28" rx="220" ry="18" fill="#9ec8e6" opacity="0.4" filter="url(#ft-soft)" />
          <ellipse cx="1010" cy="27" rx="210" ry="18" fill="#c9b6e4" opacity="0.4" filter="url(#ft-soft)" />
          <ellipse cx="1400" cy="28" rx="230" ry="19" fill="#e7cf9e" opacity="0.42" filter="url(#ft-soft)" />
          <rect x="0" y="0" width="1600" height="30" filter="url(#ft-grain)" opacity="0.08" style={{ mixBlendMode: "multiply" }} />
          <path
            d={BAND_EDGE}
            fill="none"
            stroke="var(--ink)"
            strokeOpacity="0.35"
            strokeWidth="2"
            strokeDasharray="0.5 10"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </svg>
      <YarnPom id="ft-pom-sage" light="#cfdccf" base="#a2c0a9" dark="#6f8f79" tilt={-8} className="left-6 top-[-9px] sm:left-12" />
      <YarnPom id="ft-pom-butter" light="#f4e6c2" base="#e7cf9e" dark="#b99a5e" tilt={7} className="right-8 top-[-7px] sm:right-16" />
    </div>
  );
}

const SITE: { label: string; view: View }[] = [
  { label: "Overview", view: "home" },
  { label: "Why it exists", view: "why" },
  { label: "The paper", view: "paper" },
  { label: "Playground", view: "agent" },
  { label: "Control room", view: "merchant" },
];

const EVIDENCE: [string, string][] = [
  ["JUDGE.md", `${GITHUB}/blob/main/JUDGE.md`],
  ["PAPER.md", `${GITHUB}/blob/main/PAPER.md`],
  ["llms.txt", `${GITHUB}/blob/main/llms.txt`],
  ["ENGINEERING_LOG.md", `${GITHUB}/blob/main/ENGINEERING_LOG.md`],
];

const COMMANDS: [string, string][] = [
  ["make triage", `${GITHUB}#triage`],
  ["make verify", `${GITHUB}#verify`],
  ["make fuzz", `${GITHUB}#fuzz`],
];

export function SiteFooter({ onEnter }: { onEnter: (view: View) => void }) {
  return (
    <footer>
      <FeltBand />
      <div className="mx-auto w-full max-w-[1200px] px-5 pb-12 pt-10 sm:px-8">
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
          {/* ---------------- the left column: mark, ©, lamp, source ---------------- */}
          <div className="flex shrink-0 flex-col lg:w-[260px]">
            <div>
              <button
                onClick={() => onEnter("home")}
                className="group flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
                aria-label="Customs home"
              >
                <LogoMark
                  size={18}
                  className="text-ink/40 transition-colors group-hover:text-ink/70"
                />
                <span className="font-display text-[15px] font-semibold leading-none tracking-[-0.02em] text-ink/60 transition-colors group-hover:text-ink">
                  Customs
                </span>
              </button>
              <p className="mt-5 text-[10px] leading-relaxed text-inksoft">
                © 2026 Customs · Razorpay AI Buildathon 2026
                <br />
                Test mode only — no real money moves.
              </p>
            </div>

            <div className="mt-auto flex items-center gap-3 pt-8">
              <ThemeToggle />
              <a
                href={GITHUB}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-ink/[0.08] py-1.5 pl-2.5 pr-3 text-[10px] font-medium text-ink/50 transition-colors hover:border-ink/[0.16] hover:text-ink/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <svg aria-hidden className="size-3.5" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
                </svg>
                srivtx/customs
              </a>
            </div>
          </div>

          {/* ---------------- quiet link columns ---------------- */}
          <nav className="flex flex-1 flex-wrap gap-x-14 gap-y-8" aria-label="footer">
            <div className="flex flex-col">
              <span className="mb-1.5 text-[13px] font-medium text-ink/70">Site</span>
              <div className="flex flex-col gap-1">
                {SITE.map((l) => (
                  <button
                    key={l.label}
                    onClick={() => onEnter(l.view)}
                    className="w-fit text-left text-[13px] leading-relaxed text-inksoft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col">
              <span className="mb-1.5 text-[13px] font-medium text-ink/70">Evidence</span>
              <div className="flex flex-col gap-1">
                {EVIDENCE.map(([label, href]) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="w-fit font-mono text-[11.5px] leading-relaxed text-inksoft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>

            <div className="flex flex-col">
              <span className="mb-1.5 text-[13px] font-medium text-ink/70">Verify</span>
              <div className="flex flex-col gap-1">
                {COMMANDS.map(([label, href]) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="w-fit font-mono text-[11.5px] leading-relaxed text-inksoft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </nav>
        </div>
      </div>
    </footer>
  );
}
