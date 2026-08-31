"use client";

/**
 * footer.tsx — the bottom of the document: what Customs actually is, in plain
 * words, with the whole site and the whole repo reachable from one place.
 * A customs form ends with declarations — so does this page.
 */
import { GhostButton, LogoMark, SectionLabel, Stamp } from "./bits";
import type { View } from "./shell";

const COUNTER_LINKS: { label: string; hint: string; view: View }[] = [
  { label: "why it exists", hint: "the problem, the mandate principle, the architecture diagram", view: "why" },
  { label: "the paper", hint: "how and what we are doing — the working paper, numbers live", view: "paper" },
  { label: "agent playground", hint: "natural-language buying, tool transparency, mandate approval", view: "agent" },
  { label: "control room", hint: "live channel P&L, ≥₹10k approvals, span-by-span replay", view: "merchant" },
];

const EVIDENCE_FILES: [string, string][] = [
  ["JUDGE.md", "claims mapped to criteria, regenerate commands"],
  ["PAPER.md", "the working paper, machine-legible"],
  ["llms.txt", "the whole repo, machine-legible"],
  ["AGENTS.md", "the invariants the code obeys"],
  ["ARCHITECTURE.md", "decisions, diagram, P&L formula"],
  ["ENGINEERING_LOG.md", "dated build log, incidents included"],
  ["docs/FORM_ANSWERS.md", "the submission form, pre-written"],
];

const COMMANDS: [string, string][] = [
  ["make triage", "60-second judge tour"],
  ["make verify", "what CI checks every push"],
  ["make fuzz", "12 authored attacks vs the gate"],
  ["make ablation", "three protocols, overhead measured"],
  ["make meter", "channel P&L from the ledger"],
  ["make project", "the at-1M projection"],
];

export function SiteFooter({ onEnter }: { onEnter: (view: View) => void }) {
  return (
    <footer className="mt-auto border-t border-line bg-paper2/40">
      {/* what it does */}
      <div className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6">
        <SectionLabel>declaration — what this thing is</SectionLabel>
        <div className="mt-4 grid gap-10 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <h3 className="font-display text-xl font-medium leading-snug text-ink">
              Customs is the checkpoint for agentic commerce.
            </h3>
            <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-inksoft">
              An AI buyer walks up to a storefront and spends real (test) money. Before a single
              rupee moves, the desk checks a signed mandate — amount cap, item allowlist, expiry,
              trust tier — re-verifies live prices in plain code, and writes every span to a
              hash-chained ledger. The merchant watches it all clear on the other side of the
              counter, with the channel&rsquo;s P&amp;L ticking live.
            </p>
            <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-inksoft">
              Both sides ship in one repo, run on one gate, and prove themselves to a machine in
              sixty seconds.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <GhostButton onClick={() => onEnter("agent")} active>
                enter the playground
              </GhostButton>
              <GhostButton onClick={() => onEnter("merchant")}>open the control room</GhostButton>
            </div>
          </div>

          <div>
            <div className="label-caps">the counter — both sides</div>
            <ul className="mt-3 space-y-3">
              {COUNTER_LINKS.map((l) => (
                <li key={l.label}>
                  <button
                    onClick={() => onEnter(l.view)}
                    className="group text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  >
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink underline decoration-line2 decoration-dotted underline-offset-4 group-hover:decoration-ink">
                      {l.label} <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-inksoft">{l.hint}</span>
                  </button>
                </li>
              ))}
              <li className="pt-1">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">the trust ladder</span>
                <span className="mt-0.5 block text-[12px] leading-relaxed text-inksoft">
                  walk-in ₹500 · attested ₹5,000 · mandated ₹50,000 — and a human desk over ₹10,000, always.
                </span>
              </li>
            </ul>
          </div>

          <div>
            <div className="label-caps">the evidence — in the repo</div>
            <ul className="mt-3 space-y-2.5">
              {EVIDENCE_FILES.map(([f, d]) => (
                <li key={f}>
                  <a
                    href="https://github.com/srivtx/customs"
                    target="_blank"
                    rel="noreferrer"
                    className="group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  >
                    <span className="font-mono text-[11px] font-semibold text-ink underline decoration-line2 decoration-dotted underline-offset-4 group-hover:decoration-ink">
                      {f}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] leading-relaxed text-inksoft">{d}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="label-caps">the commands — regenerable</div>
            <ul className="mt-3 space-y-2.5">
              {COMMANDS.map(([c, d]) => (
                <li key={c}>
                  <code className="rounded-sm border border-line bg-paper px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-ink">
                    {c}
                  </code>
                  <span className="mt-0.5 block text-[11.5px] leading-relaxed text-inksoft">{d}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* the closing line */}
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-x-8 gap-y-3 px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <LogoMark size={26} className="text-ink" />
            <span className="font-mono text-[10px] leading-relaxed text-inksoft">
              Customs · Fieldnote Supply · desk no. 01 · Razorpay AI Buildathon 2026, Track 1
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Stamp kind="sim" animate={false}>TEST MODE · NO REAL MONEY</Stamp>
            <Stamp kind="ink" animate={false}>EVERY NUMBER REGENERATES</Stamp>
            <a
              href="https://github.com/srivtx/customs"
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-inksoft underline decoration-line2 decoration-dotted underline-offset-4 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              source: github.com/srivtx/customs
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
