"use client";

/**
 * shell.tsx — the app shell: one route, three surfaces (overview, agent
 * playground, merchant control room), a customs-house top bar, honest
 * status chips, and a footer that says the true things.
 */
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Landing } from "./landing";
import { Playground } from "./playground";
import { ControlRoom } from "./control-room";

type View = "home" | "agent" | "merchant";

const NAV: { id: View; label: string }[] = [
  { id: "home", label: "overview" },
  { id: "agent", label: "agent playground" },
  { id: "merchant", label: "control room" },
];

export function CustomsApp() {
  const [view, setView] = useState<View>("home");

  return (
    <div className="flex min-h-screen flex-col">
      {/* ------------------------------ top bar ------------------------------ */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <button
            onClick={() => setView("home")}
            className="group flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
            aria-label="Customs home"
          >
            <span className="stamp h-9 w-9 rotate-[-5deg] items-center justify-center border-[2.5px] border-ink text-[9px] text-ink transition-transform group-hover:rotate-[0deg]">
              C
            </span>
            <span className="text-left">
              <span className="block font-display text-[19px] font-semibold leading-none tracking-tight text-ink">
                Customs
              </span>
              <span className="block font-mono text-[9px] uppercase tracking-[0.22em] text-inksoft">
                fieldnote supply · desk no. 01
              </span>
            </span>
          </button>

          <nav className="flex items-center gap-1" aria-label="views">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                aria-current={view === n.id ? "page" : undefined}
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
        {view === "home" && <Landing onEnter={setView} />}
        {view === "agent" && <Playground />}
        {view === "merchant" && <ControlRoom />}
      </main>

      {/* ------------------------------ footer ------------------------------ */}
      <footer className="mt-auto border-t border-line bg-paper2/50">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-x-8 gap-y-2 px-4 py-5 sm:px-6">
          <p className="max-w-xl font-mono text-[10px] leading-relaxed text-inksoft">
            Customs · a two-sided agentic checkout for the Razorpay AI Buildathon 2026 (Track 1).
            Test mode only; captures without Razorpay keys are labeled SIMULATED and never mixed
            with real rails. Every number in this repo regenerates — nothing hand-written.
          </p>
          <div className="flex flex-wrap gap-2 font-mono text-[10px] text-inksoft">
            <span className="border border-line px-2 py-1">JUDGE.md</span>
            <span className="border border-line px-2 py-1">make triage</span>
            <span className="border border-line px-2 py-1">CI: verify</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
