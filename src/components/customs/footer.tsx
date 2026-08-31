"use client";

/**
 * footer.tsx — the bottom of the desk, rebuilt on x.ai's footer pattern:
 * a left column (mark, one copyright line, the theme toggle and the
 * source pill at its foot) and quiet link columns on the right —
 * 13px links at half opacity that only reach full ink on approach.
 * No paragraphs, no stamps, no second bar. A footer says where things
 * are; it does not repeat the site.
 */
import { LogoMark } from "./bits";
import { ThemeToggle } from "./theme";
import type { View } from "./shell";

const GITHUB = "https://github.com/srivtx/customs";

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
    <footer className="mt-auto border-t border-line">
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
                © 2026 Customs · Razorpay AI Buildathon 2026, Track 1
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
