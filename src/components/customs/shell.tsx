"use client";

/**
 * shell.tsx — the app shell: one route, five surfaces (overview, why it
 * exists, the paper, agent playground, merchant control room), the gate
 * diamond in the masthead, honest status chips, and a footer that says
 * the true things. Views swap instantly and settle in — no exit lag.
 */
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { LogoMark } from "./bits";
import { Landing } from "./landing";
import { WhyPage } from "./why";
import { PaperPage } from "./paper";
import { Playground } from "./playground";
import { ControlRoom } from "./control-room";
import { SiteFooter } from "./footer";

export type View = "home" | "why" | "paper" | "agent" | "merchant";

const NAV: { id: View; label: string }[] = [
  { id: "home", label: "overview" },
  { id: "why", label: "why" },
  { id: "paper", label: "paper" },
  { id: "agent", label: "playground" },
  { id: "merchant", label: "control room" },
];

export function CustomsApp() {
  const [view, setView] = useState<View>("home");

  /** switch surface: instant swap + settle-in, back to the top of the page */
  const go = useCallback((v: View) => {
    setView(v);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      {/* ------------------------------ top bar ------------------------------ */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <button
            onClick={() => go("home")}
            className="group flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
            aria-label="Customs home"
          >
            <LogoMark
              size={30}
              className="text-ink transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-[-8deg]"
            />
            <span className="text-left">
              <span className="block font-display text-[19px] font-semibold leading-none tracking-tight text-ink">
                Customs
              </span>
              <span className="block font-mono text-[9px] uppercase tracking-[0.22em] text-inksoft">
                the checkpoint for agentic commerce
              </span>
            </span>
          </button>

          <nav className="flex flex-wrap items-center gap-1" aria-label="views">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => go(n.id)}
                aria-current={view === n.id ? "page" : undefined}
                aria-label={`view ${n.label}`}
                className={cn(
                  "h-9 px-3 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                  view === n.id ? "border-b-2 border-ink text-ink" : "text-inksoft hover:text-ink"
                )}
              >
                {n.label}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <span className="stamp border-line2 text-inksoft" style={{ rotate: "0deg" }}>
              TEST MODE · NO REAL MONEY
            </span>
          </div>
        </div>
      </header>

      {/* ------------------------------ content ------------------------------ */}
      <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
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
    </div>
  );
}
