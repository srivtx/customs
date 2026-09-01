"use client";

/**
 * shell.tsx — the app shell: one route, five surfaces (overview, why it
 * exists, the paper, agent playground, merchant control room), the gate
 * diamond in the masthead, honest status chips, and a footer that says
 * the true things. Views swap instantly and settle in 300ms — no exit
 * lag, one motion system everywhere.
 */
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { LogoMark } from "./bits";
import { Landing } from "./landing";
import { WhyPage } from "./why";
import { PaperPage } from "./paper";
import { Playground } from "./playground";
import { ControlRoom } from "./control-room";
import { FloatingAgent } from "./floating-agent";
import { SiteFooter } from "./footer";
import { SystemThemeAsk } from "./theme";

export type View = "home" | "why" | "paper" | "agent" | "merchant";

const NAV: { id: View; label: string }[] = [
  { id: "home", label: "Overview" },
  { id: "why", label: "Why" },
  { id: "paper", label: "Paper" },
  { id: "agent", label: "Playground" },
  { id: "merchant", label: "Control Room" },
];

export function CustomsApp() {
  const [view, setView] = useState<View>("home");
  const [menuOpen, setMenuOpen] = useState(false);

  /** switch surface: instant swap + settle-in, back to the top of the page */
  const go = useCallback((v: View) => {
    setView(v);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  /* the mobile menu: Escape closes it, like every other sheet on the desk */
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <div className="flex min-h-screen flex-col">
      {/* ------------------------------ top bar ------------------------------ */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-4 px-5 sm:gap-8 sm:px-8">
          <button
            onClick={() => go("home")}
            className="group flex shrink-0 items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
            aria-label="Customs home"
          >
            <LogoMark
              size={22}
              className="text-ink transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:rotate-[-90deg]"
            />
            <span className="font-display text-[16px] font-semibold leading-none tracking-[-0.02em] text-ink">
              Customs
            </span>
          </button>

          {/* the desk nav — five views, one underline indicator. On a
              phone this hands off to the menu button below */}
          <nav className="hidden min-w-0 flex-1 items-center gap-1 md:flex" aria-label="views">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => go(n.id)}
                aria-current={view === n.id ? "page" : undefined}
                aria-label={`view ${n.label}`}
                className={cn(
                  "relative h-9 shrink-0 px-2.5 text-[13px] tracking-[-0.01em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                  view === n.id ? "text-ink" : "text-inksoft hover:text-ink"
                )}
              >
                {n.label}
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-2.5 bottom-[2px] h-[1.5px] rounded-full transition-all duration-200",
                    view === n.id ? "bg-ink opacity-100" : "bg-ink opacity-0"
                  )}
                />
              </button>
            ))}
          </nav>

          <div className="ml-auto hidden shrink-0 items-center sm:flex">
            <span className="stamp border-line2 text-inksoft">TEST MODE</span>
          </div>

          {/* the phone's handle on the nav — two lines that become one */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "close the menu" : "open the menu"}
            className="ml-auto flex size-9 shrink-0 items-center justify-center rounded-[4px] border border-line2 text-ink transition-colors hover:border-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink md:hidden"
          >
            <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
              <path d="M2.5 4.5h11" className="transition-transform duration-200" style={{ transform: menuOpen ? "translateY(3.5px) rotate(45deg)" : undefined, transformOrigin: "8px 4.5px" }} />
              <path d="M2.5 11.5h11" className="transition-transform duration-200" style={{ transform: menuOpen ? "translateY(-3.5px) rotate(-45deg)" : undefined, transformOrigin: "8px 11.5px" }} />
            </svg>
          </button>
        </div>

        {/* the phone's nav — the same five views, full-width rows that
            settle in under the bar. Nothing crunched, nothing clipped */}
        {menuOpen && (
          <nav className="border-t border-line bg-paper/95 backdrop-blur-xl md:hidden" aria-label="views">
            <div className="mx-auto max-w-[1200px] px-5 py-2">
              {NAV.map((n) => (
                <button
                  key={n.id}
                  onClick={() => go(n.id)}
                  aria-current={view === n.id ? "page" : undefined}
                  className={cn(
                    "flex w-full items-center justify-between border-b border-line/60 py-3 text-left text-[15px] tracking-[-0.01em] last:border-b-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                    view === n.id ? "text-ink" : "text-inksoft"
                  )}
                >
                  {n.label}
                  {view === n.id && <LogoMark size={12} className="text-ink" />}
                </button>
              ))}
              <div className="flex items-center justify-between py-3">
                <span className="stamp border-line2 text-inksoft">TEST MODE</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-inksoft">no real money</span>
              </div>
            </div>
          </nav>
        )}
      </header>

      {/* ------------------------------ content ------------------------------ */}
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-5 py-10 sm:px-8 sm:py-14">
        <div key={view} className="view-enter">
          {view === "home" && <Landing onEnter={go} />}
          {view === "why" && <WhyPage onEnter={go} />}
          {view === "paper" && <PaperPage onEnter={go} />}
          {view === "agent" && <Playground />}
          {view === "merchant" && <ControlRoom />}
        </div>
      </main>

      {/* ------------------------------ footer ------------------------------ */}
      <SiteFooter onEnter={go} />

      {/* the everywhere-agent — draggable, on every view, real shopping */}
      <FloatingAgent />
      <SystemThemeAsk />
    </div>
  );
}
