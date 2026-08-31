"use client";

/**
 * why.tsx — "why it exists": the problem in plain words, the principle
 * (machines get mandates, not cards), the architecture on one diagram,
 * and the honest scope ledger. Written to be read: one narrow measure,
 * one accent, hairlines between thoughts.
 */
import { GhostButton, InkButton, Reveal, TierChip, SectionLabel, Stamp } from "./bits";
import type { View } from "./shell";
import { TRUST_TIERS } from "@/lib/customs/gate/types";

export function WhyPage({ onEnter }: { onEnter: (v: View) => void }) {
  return (
    <div>
      {/* ------------------------------ the claim ------------------------------ */}
      <section aria-label="why customs exists" className="pb-16 pt-6 sm:pt-10">
        <p className="label-caps">why customs exists</p>
        <h1 className="mt-6 max-w-[22ch] font-display text-[clamp(34px,5.4vw,64px)] font-semibold leading-[1.04] tracking-[-0.03em] text-ink">
          Every checkout assumes a human is paying.
        </h1>
        <div className="mt-8 max-w-[62ch] space-y-5 text-[16px] leading-[1.75] text-inksoft">
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
        <section className="rounded-[4px] border border-line bg-card px-6 py-7" aria-label="the principle">
          <SectionLabel>the principle — machines get mandates, not cards</SectionLabel>
          <p className="mt-4 max-w-[62ch] text-[15px] leading-[1.75] text-inksoft">
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
            <span className="font-mono text-[11px] text-inksoft">
              {`walk-in ≤ ${TRUST_TIERS.UNVERIFIED.maxAmountPaise / 100} · attested ≤ ${TRUST_TIERS.ATTESTED.maxAmountPaise / 100} · mandated ≤ ${TRUST_TIERS.MANDATED.maxAmountPaise / 100} · a human decides ≥ 10,000, always`}
            </span>
          </div>
        </section>
      </Reveal>

      {/* ------------------------------ the architecture ------------------------------ */}
      <Reveal>
        <section aria-label="architecture" className="py-16">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-[clamp(24px,3vw,34px)] font-semibold tracking-[-0.025em] text-ink">
              One gate, two counters.
            </h2>
            <span className="font-mono text-[11px] text-inksoft">
              the full decision table lives in ARCHITECTURE.md · every box is code you can open
            </span>
          </div>
          <div className="doc mt-6 overflow-hidden">
            <div className="ledger-scroll overflow-x-auto">
              <ArchDiagram />
            </div>
            <div className="grid gap-px border-t border-line bg-line md:grid-cols-4">
              {[
                ["01", "the agent asks", "Natural-language intent in. The rules brain (or an optional LLM brain) turns it into catalog actions — search, add, checkout. Every tool call is shown to the buyer."],
                ["02", "the desk signs", "A mandate is drafted — cap, items, expiry, tier — and signed with Ed25519 over canonical JSON. The principal approves it. No mandate, no money."],
                ["03", "the gate decides", "Ten checks in plain code at bind time: signature, tier bounds, cap, allowlist, quantities, live prices, expiry, replay, threshold. Verdicts are reason codes, not vibes."],
                ["04", "the ledger remembers", "Capture on the rail (test mode or labeled simulation), a manifest receipt out, every span hash-chained. The merchant desk replays any of it."],
              ].map(([n, t, d]) => (
                <div key={n} className="bg-card px-4 py-3.5">
                  <div className="flex items-baseline gap-2.5">
                    <span className="font-mono text-[10px] text-inksoft">{n}</span>
                    <span className="text-[14px] font-medium text-ink">{t}</span>
                  </div>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-inksoft">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      {/* ------------------------------ the honest scope ledger ------------------------------ */}
      <Reveal>
        <section aria-label="what exists and what does not" className="pb-16">
          <h2 className="font-display text-[clamp(24px,3vw,34px)] font-semibold tracking-[-0.025em] text-ink">
            What exists — the whole truth.
          </h2>
          <p className="mt-4 max-w-[62ch] text-[15px] leading-[1.75] text-inksoft">
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
                  "A public deployment URL — DEPLOY.md is the 10-minute runbook (Vercel free tier); not yet deployed at submission-time of this build",
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
/* the architecture diagram — drawn, not screenshotted (dark)          */
/* ------------------------------------------------------------------ */

function ArchDiagram() {
  const ink = "#f4f4f0";
  const soft = "rgba(244,244,240,0.55)";
  const line = "rgba(244,244,240,0.28)";
  const hair = "rgba(244,244,240,0.14)";
  const sage = "#a2c0a9";
  const monoF = { fontFamily: "var(--font-geist-mono), monospace" };
  const boxStyle = { fill: "rgba(255,255,255,0.03)", stroke: line, strokeWidth: 1 };
  const gateStyle = { fill: "rgba(255,255,255,0.03)", stroke: ink, strokeWidth: 1.5 };
  const caps = (x: number, y: number, s: string, size = 10, fill = soft, ls = 1.4) => (
    <text x={x} y={y} fontSize={size} fill={fill} letterSpacing={ls} style={monoF} textAnchor="middle">
      {s}
    </text>
  );
  return (
    <svg
      viewBox="0 0 1060 470"
      className="block h-auto w-full min-w-[840px]"
      role="img"
      aria-label="Customs architecture: buyer side, the gate, the rail, merchant side, and the hash-chained ledger beneath all of it"
    >
      <title>Customs architecture diagram</title>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 1 L 9 5 L 0 9 z" fill={line} />
        </marker>
        <marker id="arrowInk" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 1 L 9 5 L 0 9 z" fill={ink} />
        </marker>
        <marker id="arrowSage" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 1 L 9 5 L 0 9 z" fill={sage} />
        </marker>
      </defs>

      {/* column captions */}
      {caps(150, 28, "BUYER SIDE")}
      {caps(530, 28, "THE GATE")}
      {caps(910, 28, "MERCHANT SIDE")}

      {/* buyer box */}
      <rect x={30} y={44} width={240} height={252} rx={4} style={{ fill: "none", stroke: hair, strokeDasharray: "3 4", strokeWidth: 1 }} />
      <rect x={54} y={66} width={192} height={54} rx={3} style={boxStyle} />
      {caps(150, 88, "PRINCIPAL · HUMAN")}
      {caps(150, 104, "owns the money, signs", 9)}
      <rect x={54} y={140} width={192} height={54} rx={3} style={boxStyle} />
      {caps(150, 162, "AGENT · AI BUYER")}
      {caps(150, 178, "intent → tools → cart", 9)}
      <rect x={54} y={214} width={192} height={54} rx={3} style={boxStyle} />
      {caps(150, 236, "ADAPTER")}
      {caps(150, 252, "naive / mcp / acp", 9)}
      <path d="M150 120 L150 140" stroke={line} strokeWidth={1} markerEnd="url(#arrow)" />
      <path d="M150 194 L150 214" stroke={line} strokeWidth={1} markerEnd="url(#arrow)" />

      {/* mandate approval loop (human in the loop) */}
      <path d="M246 93 C 300 93 310 120 356 120" fill="none" stroke={sage} strokeWidth={1} markerEnd="url(#arrowSage)" strokeDasharray="5 3" opacity={0.8} />
      {caps(300, 63, "mandate approval", 9, sage, 1.2)}

      {/* gate box */}
      <rect x={360} y={44} width={340} height={286} rx={4} style={gateStyle} />
      {/* the diamond mark, top-left of the gate header */}
      <path transform="translate(376, 50) scale(0.42)" d="M30 6 L54 30 L30 54 L6 30 Z M24 17 A6 6 0 0 1 36 17 L36 39 A6 6 0 0 1 24 39 Z" fillRule="evenodd" fill={ink} />
      {caps(536, 66, "CUSTOMS GATE")}
      {caps(536, 81, "decide() — 10 checks, plain code", 9)}
      {[
        "signature verifies",
        "tier bounds · mandate cap",
        "item allowlist · quantities",
        "live catalog prices",
        "expiry · replay dedupe",
        "≥ ₹10,000 → human desk",
      ].map((s, i) => (
        <g key={s}>
          <rect x={386} y={96 + i * 30} width={288} height={24} rx={2} fill="rgba(255,255,255,0.045)" />
          <circle cx={400} cy={108 + i * 30} r={3} fill={sage} />
          <text x={414} y={112 + i * 30} fontSize={10.5} fill={ink} style={monoF} letterSpacing={0.4}>
            {s}
          </text>
        </g>
      ))}
      <path d="M246 241 C 300 241 310 190 360 186" fill="none" stroke={ink} strokeWidth={1.5} markerEnd="url(#arrowInk)" />
      {caps(300, 332, "every tool call crosses here", 8.5)}

      {/* rail */}
      <rect x={742} y={130} width={116} height={84} rx={3} style={boxStyle} />
      {caps(800, 160, "THE RAIL")}
      {caps(800, 176, "razorpay test", 9)}
      {caps(800, 190, "or labeled sim", 9)}
      <path d="M700 172 L742 172" stroke={ink} strokeWidth={1.5} markerEnd="url(#arrowInk)" />

      {/* merchant box */}
      <rect x={890} y={44} width={140} height={252} rx={4} style={{ fill: "none", stroke: hair, strokeDasharray: "3 4", strokeWidth: 1 }} />
      <rect x={906} y={66} width={108} height={54} rx={3} style={boxStyle} />
      {caps(960, 88, "CONTROL ROOM", 10, soft, 0.8)}
      {caps(960, 104, "P&L · approvals", 9, soft, 0.5)}
      <rect x={906} y={140} width={108} height={54} rx={3} style={boxStyle} />
      {caps(960, 162, "SPAN REPLAY", 10, soft, 0.8)}
      {caps(960, 178, "click any row", 9, soft, 0.5)}
      <rect x={906} y={214} width={108} height={54} rx={3} style={boxStyle} />
      {caps(960, 236, "RED-TEAM LOG", 10, soft, 0.8)}
      {caps(960, 252, "12 · all blocked", 9, soft, 0.5)}
      <path d="M858 172 L890 172" stroke={ink} strokeWidth={1.5} markerEnd="url(#arrowInk)" />

      {/* ledger bar — spans everything */}
      <rect x={30} y={368} width={1000} height={76} rx={4} fill="rgba(255,255,255,0.03)" stroke={hair} strokeWidth={1} />
      {caps(530, 396, "HASH-CHAINED LEDGER — THE AUDIT TRAIL IS THE DATABASE", 11, ink, 2)}
      {/* chain links */}
      {Array.from({ length: 12 }, (_, i) => {
        const x = 110 + i * 76;
        return (
          <g key={i}>
            <rect x={x} y={414} width={26} height={22} rx={2} fill="rgba(255,255,255,0.05)" stroke={line} strokeWidth={0.8} />
            <text x={x + 13} y={429} fontSize={8.5} fill={soft} style={monoF} textAnchor="middle">
              {`#${i + 1}`}
            </text>
            {i < 11 && <path d={`M${x + 26} 425 L${x + 76} 425`} stroke={hair} strokeWidth={1} />}
          </g>
        );
      })}
      {/* arrows into the ledger */}
      <path d="M150 296 L150 368" stroke={line} strokeWidth={1} markerEnd="url(#arrow)" />
      <path d="M530 330 L530 368" stroke={ink} strokeWidth={1.5} markerEnd="url(#arrowInk)" />
      <path d="M960 296 L960 368" stroke={line} strokeWidth={1} markerEnd="url(#arrow)" />
      {caps(196, 348, "approvals, refusals, every span", 9)}
      {caps(560, 348, "every verdict, hash-chained", 9)}
      {caps(922, 348, "replay + tamper probe", 9)}
    </svg>
  );
}
