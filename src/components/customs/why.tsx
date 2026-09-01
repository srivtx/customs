"use client";

/**
 * why.tsx — "why it exists": the problem in plain words, the principle
 * (machines get mandates, not cards), the architecture drawn as the
 * site's own cards (not a fixed-width picture — it reflows, it never
 * scrolls sideways), and the honest scope ledger. Written to be read:
 * a centered opening claim, one narrow measure, one accent, hairlines
 * between thoughts.
 */
import { cn } from "@/lib/utils";
import { GhostButton, InkButton, Reveal, TierChip, SectionLabel, Stamp, LogoMark } from "./bits";
import type { View } from "./shell";
import { TRUST_TIERS } from "@/lib/customs/gate/types";

export function WhyPage({ onEnter }: { onEnter: (v: View) => void }) {
  return (
    <div>
      {/* ------------------------------ the claim ------------------------------ */}
      <section aria-label="why customs exists" className="pb-16 pt-4 text-center sm:pt-8">
        <p className="label-caps">why customs exists</p>
        <h1 className="mx-auto mt-7 max-w-[24ch] text-balance font-display text-[clamp(32px,4.8vw,56px)] font-semibold leading-[1.08] tracking-[-0.03em] text-ink">
          Every checkout assumes a human is paying.
        </h1>
        <div className="mx-auto mt-9 max-w-[60ch] space-y-5 text-left text-[16px] leading-[1.75] text-inksoft">
          <p>
            Cards have CVV prompts and OTP screens. Wallets want a face or a
            fingerprint. UPI wants a PIN pushed to a phone a person is holding.
            Every one of these friction points exists to answer one question —{" "}
            <em className="text-ink not-italic underline decoration-cleared/40 decoration-1 underline-offset-4">
              are you really the person authorized to spend this?
            </em>{" "}
            — and every one of them answers it by assuming the payer has hands,
            eyes, and a phone.
          </p>
          <p>
            AI agents break that assumption. An agent shopping for its
            principal is fast, tireless, and literate — and cannot type a PIN,
            press a thumb, or vouch for itself. So today the agent does the
            easy part — find the product, compare, decide — and stops dead at
            the money. A human finishes the transaction. The checkout is the
            wall.
          </p>
          <p>
            The industry answer on the horizon — agent payment protocols, rails
            opening to non-human payers — moves the wall, it does not remove
            it. If an agent can pay, the question stops being{" "}
            <em className="text-ink not-italic">is the payer human?</em> and
            becomes{" "}
            <em className="text-ink not-italic">is this payment authorized,
            bounded, and provable?</em> That question has an old, solved shape.
            It is the question a customs house answers a thousand times a day.
          </p>
        </div>
      </section>

      {/* ------------------------------ the principle ------------------------------ */}
      <Reveal>
        <section className="rounded-[4px] border border-line bg-card px-6 py-8 sm:px-8 sm:py-9" aria-label="the principle">
          <SectionLabel>the principle — machines get mandates, not cards</SectionLabel>
          <p className="mt-4 max-w-[62ch] text-[15px] leading-[1.8] text-inksoft">
            A customs house never asks the cargo whether it is honest. It asks
            for the manifest, checks it against the rules, stamps what passes,
            and refuses what does not — every decision written down. Customs
            applies exactly that protocol to machine spending: the agent does
            not get a payment credential. It gets a{" "}
            <span className="font-semibold text-ink">mandate</span> — a signed
            envelope that says how much, for which items, until when, at which
            trust level — and every rupee the agent moves is checked against
            that envelope in plain, auditable code.
          </p>
          <div className="mt-6 grid gap-px bg-line md:grid-cols-3">
            {[
              {
                t: "authorized",
                d: "The buyer's principal signs the mandate. Nothing spends without a signature the desk can verify.",
              },
              {
                t: "bounded",
                d: "Amount caps, item allowlists, quantities, expiry. The agent's arithmetic is never trusted — prices are re-checked at bind time.",
              },
              {
                t: "provable",
                d: "Every check, refusal, and capture lands in a hash-chained ledger. Replay any order span by span. Tamper with a byte and the walk fails.",
              },
            ].map((p) => (
              <div key={p.t} className="bg-card px-4 py-4">
                <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-cleared">{p.t}</div>
                <p className="mt-2 text-[13px] leading-relaxed text-inksoft">{p.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-inksoft">the trust ladder:</span>
            {(["UNVERIFIED", "ATTESTED", "MANDATED"] as const).map((t) => (
              <TierChip key={t} tier={t} />
            ))}
            <span className="text-[12.5px] text-inksoft">
              {`walk-in ≤ ${TRUST_TIERS.UNVERIFIED.maxAmountPaise / 100} · attested ≤ ${TRUST_TIERS.ATTESTED.maxAmountPaise / 100} · mandated ≤ ${TRUST_TIERS.MANDATED.maxAmountPaise / 100} · a human decides ≥ 10,000, always`}
            </span>
          </div>
        </section>
      </Reveal>

      {/* ------------------------------ the architecture ------------------------------ */}
      <Reveal>
        <section aria-label="architecture" className="py-20">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-[clamp(24px,3vw,34px)] font-semibold tracking-[-0.025em] text-ink">
              One gate, two counters.
            </h2>
            <span className="text-[12.5px] text-inksoft">
              the full decision table lives in ARCHITECTURE.md · every box is code you can open
            </span>
          </div>

          {/* the flow, drawn with the site's own cards — it reflows on a
              phone, never scrolls sideways, and re-inks with the theme */}
          <ArchFlow />

          {/* the four moves, in order */}
          <div className="mt-3 grid gap-px bg-line md:grid-cols-4">
            {[
              ["01", "the agent asks", "Natural-language intent in. The rules brain (or an optional LLM brain) turns it into catalog actions — search, add, checkout. Every tool call is shown to the buyer."],
              ["02", "the desk signs", "A mandate is drafted — cap, items, expiry, tier — and signed with Ed25519 over canonical JSON. The principal approves it. No mandate, no money."],
              ["03", "the gate decides", "Ten checks in plain code at bind time: signature, tier bounds, cap, allowlist, quantities, live prices, expiry, replay, threshold. Verdicts are reason codes, not vibes."],
              ["04", "the ledger remembers", "Capture on the rail (test mode or labeled simulation), a manifest receipt out, every span hash-chained. The merchant desk replays any of it."],
            ].map(([n, t, d]) => (
              <div key={n} className="card-lift rounded-[4px] bg-card px-4 py-3.5">
                <div className="flex items-baseline gap-2.5">
                  <span className="font-mono text-[10px] text-inksoft">{n}</span>
                  <span className="text-[14px] font-medium text-ink">{t}</span>
                </div>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-inksoft">{d}</p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* ------------------------------ the honest scope ledger ------------------------------ */}
      <Reveal>
        <section aria-label="what exists and what does not" className="pb-20">
          <h2 className="font-display text-[clamp(24px,3vw,34px)] font-semibold tracking-[-0.025em] text-ink">
            What exists — the whole truth.
          </h2>
          <p className="mt-4 max-w-[62ch] text-[15px] leading-[1.8] text-inksoft">
            We hold ourselves to the brief's own bar — every money action
            explainable, bounded and gated — and to a rule set in AGENTS.md:
            nothing ships unlabeled. If a number is in this product, it
            regenerates from a command. If a path is simulated, it says so on
            the screen. Here is the whole truth of what exists.
          </p>
          <div className="mt-6 grid gap-px bg-line lg:grid-cols-3">
            <div className="bg-card px-5 py-5">
              <Stamp kind="cleared" animate={false}>shipped · testable</Stamp>
              <ul className="mt-4 space-y-2.5 text-[12.5px] leading-relaxed text-inksoft">
                {[
                  "Both sides of the counter: agent storefront + merchant control room, one shared gate",
                  "Ed25519-signed mandates over canonical JSON; 10-check bind-time decision pipeline with reason codes",
                  "Trust tiers (₹500 / ₹5,000 / ₹50,000) and a human desk for every order ≥ ₹10,000",
                  "Hash-chained JSONL ledger — the audit trail is the database; tamper probe detects mutation",
                  "Authored attack corpus: every attack refused with its expected code (make fuzz)",
                  "Protocol ablation across naive / MCP-style / ACP-style transports, wire overhead measured",
                  "Channel P&L meter (agent GMV − AI serving cost) with the at-1M projection, assumptions declared",
                  "A 60-second machine-legible judge tour (make triage) and zero-dep evidence checks in CI (make verify)",
                ].map((s) => (
                  <li key={s} className="flex gap-2.5">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-cleared" aria-hidden />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-card px-5 py-5">
              <Stamp kind="held" animate={false}>simulated · labeled · code-ready</Stamp>
              <ul className="mt-4 space-y-2.5 text-[12.5px] leading-relaxed text-inksoft">
                {[
                  "The payment rail — a loudly-labeled simulation until Razorpay TEST keys are set. The real path (Orders + Checkout + HMAC-verified webhook, replay-deduped) is implemented; the spike script proves it the moment keys exist (make spike-d1-1). Live keys are refused at construction.",
                  "The LLM brain — optional by design. The deterministic rules brain runs everything by default so every demo replays bit-for-bit; any OpenAI-compatible key (Groq and Gemini have free tiers) turns the LLM arm on and the ablation measures it.",
                  "MCP / ACP transports — protocol-shaped adapters, honestly labeled. They demonstrate the gate's protocol-agnostic core, not certified spec implementations.",
                ].map((s) => (
                  <li key={s} className="flex gap-2.5">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-held" aria-hidden />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-card px-5 py-5">
              <Stamp kind="refused" animate={false}>not yet · honest gaps</Stamp>
              <ul className="mt-4 space-y-2.5 text-[12.5px] leading-relaxed text-inksoft">
                {[
                  "Live at customs.srivtx.xyz — real Razorpay test-mode rails (D1-1 spike executed; see results/d1_1_spike.json). Simulation stays the volume/no-keys fallback",
                  "Real third-party agent interop — the buyer agent is in-house; no external agent has paid through the gate yet",
                  "Multi-merchant tenancy and merchant auth — one demo desk, one catalog (Fieldnote Supply)",
                  "Refunds and cancellations — deliberately cut; mandate expiry and refusal handling carry the failure story, and the cut is logged in ENGINEERING_LOG.md",
                  "A persistent production ledger — serverless hosts reset state; the runbook prescribes a volume-backed host for the JSONL ledger",
                  "The 5:00 pitch video and the submission form — scripts are written (VIDEO_TRANSCRIPT.md, docs/FORM_ANSWERS.md), recording and pasting remain",
                ].map((s) => (
                  <li key={s} className="flex gap-2.5">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-refused" aria-hidden />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ------------------------------ where to go ------------------------------ */}
      <Reveal>
        <section className="flex flex-wrap items-center gap-3 border-t border-line pt-8" aria-label="continue">
          <InkButton onClick={() => onEnter("agent")} arrow>
            watch an agent pay
          </InkButton>
          <GhostButton onClick={() => onEnter("paper")} variant="ink">
            read the paper
          </GhostButton>
          <GhostButton onClick={() => onEnter("merchant")}>
            sit at the merchant desk
          </GhostButton>
        </section>
      </Reveal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* the architecture, drawn as the site's own cards. Not a fixed-width */
/* picture: the flow reflows (phone → one column), never scrolls      */
/* sideways, and re-inks with the theme. The same information the     */
/* old SVG carried: buyer side, the gate's checks, the rail, the      */
/* merchant side, and the ledger beneath everything.                  */
/* ------------------------------------------------------------------ */

function ArchFlow() {
  return (
    <div className="doc mt-6">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="label-caps">the flow — one payment, end to end</span>
        <span className="hidden text-[11.5px] text-inksoft sm:block">hover any box · every one is code you can open</span>
      </div>
      <div className="space-y-3 p-4">
        {/* the counters */}
        <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch lg:gap-2.5">
          <FlowCard title="buyer side" flex="lg:flex-[1.05]">
            <FlowRow left="principal" right="human · owns the money, signs" />
            <FlowRow left="agent" right="intent → tools → cart" />
            <FlowRow left="adapter" right="naive · mcp · acp" />
            <div className="mt-2.5 rounded-[4px] border border-cleared/35 bg-cleared/10 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-cleared">
              mandate approval — human in the loop
            </div>
          </FlowCard>
          <FlowArrow />
          <FlowCard title="the gate" flex="lg:flex-[1.25]" accent>
            <div className="flex items-center gap-2.5 pb-2">
              <LogoMark size={14} className="text-ink" />
              <span className="font-mono text-[10.5px] text-inksoft">decide() — 10 checks, plain code</span>
            </div>
            {[
              "signature verifies",
              "tier bounds · mandate cap",
              "item allowlist · quantities",
              "live catalog prices",
              "expiry · replay dedupe",
              "≥ ₹10,000 → human desk",
            ].map((s) => (
              <div key={s} className="flex items-center gap-2.5 rounded-[3px] bg-ink/[0.04] px-2.5 py-1.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cleared" aria-hidden />
                <span className="text-[12px] text-ink">{s}</span>
              </div>
            ))}
          </FlowCard>
          <FlowArrow />
          <FlowCard title="the rail" flex="lg:flex-[0.55]">
            <FlowRow left="capture" right="test mode" />
            <FlowRow left="or" right="labeled simulation" />
            <p className="mt-2 text-[11.5px] leading-relaxed text-inksoft">the only place money moves</p>
          </FlowCard>
          <FlowArrow />
          <FlowCard title="merchant side" flex="lg:flex-[1]">
            <FlowRow left="control room" right="P&L · approvals" />
            <FlowRow left="span replay" right="click any row" />
            <FlowRow left="red-team log" right="12 · all blocked" />
          </FlowCard>
        </div>

        {/* the ledger beneath everything */}
        <div className="rounded-[4px] border border-line bg-paper2/40 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink">
              hash-chained ledger — the audit trail is the database
            </span>
            <span className="text-[11.5px] text-inksoft">every verdict, every span, every refusal</span>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {Array.from({ length: 12 }, (_, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className="rounded-[3px] border border-line bg-card px-1.5 py-0.5 font-mono text-[9.5px] text-inksoft">
                  #{i + 1}
                </span>
                {i < 11 && <span className="text-[10px] text-inksoft/60">→</span>}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11.5px] text-inksoft">
            approvals, refusals, every span · tamper with a byte and the walk fails · replay span-by-span from the control room
          </p>
        </div>
      </div>
    </div>
  );
}

/** one counter in the flow — a quiet card with a caps header */
function FlowCard({
  title,
  children,
  flex,
  accent,
}: {
  title: string;
  children: React.ReactNode;
  flex?: string;
  accent?: boolean;
}) {
  return (
    <div className={cn("card-lift rounded-[4px] border bg-card px-3.5 py-3", accent ? "border-ink/25" : "border-line", flex)}>
      <div className="label-caps mb-2.5">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

/** a row inside a flow card — quiet mono left, soft sans right */
function FlowRow({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 rounded-[3px] bg-ink/[0.04] px-2.5 py-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink">{left}</span>
      <span className="text-right text-[11.5px] text-inksoft">{right}</span>
    </div>
  );
}

/** the arrow between counters — points down when stacked, right when wide */
function FlowArrow() {
  return (
    <div className="flex items-center justify-center py-0.5 lg:py-0" aria-hidden>
      <span className="font-mono text-[13px] text-inksoft/60 lg:hidden">↓</span>
      <span className="hidden font-mono text-[13px] text-inksoft/60 lg:inline">→</span>
    </div>
  );
}
