"use client";

/**
 * shell.tsx — the app shell: one route, five surfaces (overview, why it
 * exists, the paper, agent playground, merchant control room), the gate
 * diamond in the masthead, honest status chips, and a footer that says
 * the true things. Views swap instantly and settle in 300ms — no exit
 * lag, one motion system everywhere.
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
  { id: "home", label: "Overview" },
  { id: "why", label: "Why" },
  { id: "paper", label: "Paper" },
  { id: "agent", label: "Playground" },
  { id: "merchant", label: "Control Room" },
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
      <header className="sticky top-0 z-40 border-b border-line bg-paper/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-8 px-5 sm:px-8">
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

          <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto" aria-label="views">
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
        </div>
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
    </div>
  );
}
