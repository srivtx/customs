"use client";

/**
 * paper.tsx — "Customs: a signed-mandate checkpoint for agentic payments,"
 * rendered as a working paper. The §5–§6 numbers are read from the live
 * ledger on page load — the paper cites the running system, not a PDF.
 * PAPER.md in the repo is this page's machine-legible twin.
 */
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { GhostButton, InkButton, Reveal, SectionLabel, Stamp, inr } from "./bits";
import type { View } from "./shell";

interface PaperStats {
  gmvPaise: number;
  capturedCount: number;
  refusedCount: number;
  attackCount: number;
  netPaise: number;
  aiCostPaise: number;
  eventsTotal: number;
  chain: { ok: boolean; length: number };
}

export function PaperPage({ onEnter }: { onEnter: (v: View) => void }) {
  const [stats, setStats] = useState<PaperStats | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/state", { cache: "no-store" });
        const d = (await res.json()) as PaperStats & { ok: boolean; meter: PaperStats };
        if (d.ok) {
          setStats({
            gmvPaise: d.meter.gmvPaise,
            capturedCount: d.meter.capturedCount,
            refusedCount: d.meter.refusedCount,
            attackCount: d.meter.attackCount,
            netPaise: d.meter.netPaise,
            aiCostPaise: d.meter.aiCostPaise,
            eventsTotal: d.eventsTotal,
            chain: d.chain,
          });
        }
      } catch {
        /* the paper stands without live numbers */
      }
    })();
  }, []);

  return (
    <article className="mx-auto max-w-[780px] space-y-10">
      {/* ------------------------------ masthead ------------------------------ */}
      <header className="border-b-2 border-ink pb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="label-caps">working paper · v1 · razorpay ai buildathon 2026</span>
          <span className="font-mono text-[10px] text-inksoft">companion: PAPER.md (repo) · make triage (60s)</span>
        </div>
        <h1 className="mt-4 font-display text-[clamp(30px,4.4vw,44px)] font-medium leading-[1.08] tracking-tight text-ink">
          Customs: a signed-mandate checkpoint for agentic payments
        </h1>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-inksoft">
          srivtx · fieldnote supply desk no. 01 · test mode only
        </p>
      </header>

      {/* ------------------------------ abstract ------------------------------ */}
      <section aria-label="abstract">
        <SectionLabel>abstract</SectionLabel>
        <p className="mt-4 first-letter:float-left first-letter:mr-2.5 first-letter:font-display first-letter:text-[46px] first-letter:font-semibold first-letter:leading-[0.85] first-letter:text-ink">
          Payments infrastructure authenticates humans: PINs, OTPs, faces. AI buying
          agents — the channel every commerce platform is now preparing for — cannot
          present any of these. We present <span className="font-semibold text-ink">Customs</span>,
          a two-sided agentic checkout in which an agent holds no payment credential at
          all. Instead, the buyer&apos;s principal issues a signed <em>mandate</em> — an
          Ed25519 envelope over canonical JSON bounding amount, items, expiry, and a
          trust tier — and a deterministic gate re-verifies every bound at bind time in
          plain code. Verdicts are explainable reason codes; every event appends to a
          hash-chained ledger that doubles as the system of record; a human desk holds
          every order at or above ₹10,000. We measure the protocol&apos;s overhead
          across three transport shapes, evaluate it against an authored attack corpus,
          and derive the channel&apos;s unit economics — agent GMV minus AI serving
          cost — live from the ledger. The result is a checkout an AI agent can
          complete end-to-end that a payments company can still audit, bound, and
          trust.
        </p>
      </section>

      {/* ------------------------------ §1 problem ------------------------------ */}
      <PaperSection n="1" title="The problem">
        <p>
          Every mainstream payment rail answers the same question before moving
          money: <em>is the payer authorized?</em> Card networks answer with a CVV and
          a 3-D Secure challenge; UPI answers with a PIN on a device the account
          holder physically holds; wallets answer with a biometric. Each mechanism
          assumes the payer is a human with a body and a phone. That assumption is
          precisely what an autonomous buying agent violates: it is fast, literate,
          and tireless, and it has no thumb, no SIM, and no legal personhood to
          vouch for.
        </p>
        <p>
          The emerging answer — machine payment protocols and rails opening to
          non-human payers — changes who can initiate a payment but not how a merchant
          or payments platform can <em>bound</em> one. An agent with a raw payment
          capability is an unbounded spending function with a natural-language
          interface; the failure modes (prompt injection, price manipulation, runaway
          quantity, replayed authorizations) are all authorization failures. The
          missing primitive is not a new rail. It is a portable, verifiable statement
          of <em>what this specific agent is allowed to spend, on what, until when</em> —
          enforced at the moment of settlement, not at login.
        </p>
      </PaperSection>

      {/* ------------------------------ §2 approach ------------------------------ */}
      <PaperSection n="2" title="Approach: mandates, not credentials">
        <p>
          Customs gives the agent neither a card token nor keys to a wallet. The
          interaction of interest is a three-party handshake: a <strong>principal</strong>{" "}
          (the human buyer), an <strong>agent</strong> (acting on the principal&apos;s
          intent), and a <strong>desk</strong> (the merchant-side gate plus ledger).
          When the agent has assembled a cart and requests checkout, the desk drafts a
          mandate sized to the cart&apos;s total, the principal reviews and approves
          it, and the desk signs it. From that moment the mandate — not the agent, not
          the session, not a conversation — is the only thing that can move money.
        </p>
        <p>
          Two design commitments follow. First, the gate is deterministic and
          boring: ten checks in straight-line code, no model in the decision path, so
          a refusal can always be explained by a reason code and reproduced by a
          test. Second, the audit trail is the database: every proposal, approval,
          refusal, and capture appends to one hash-chained JSONL ledger, which means
          the artifact a judge or auditor wants is not generated by the system — it{" "}
          <em>is</em> the system. An optional LLM brain may drive the conversation,
          but it sits strictly before the money path and is measured, never trusted.
        </p>
      </PaperSection>

      {/* ------------------------------ §3 protocol ------------------------------ */}
      <PaperSection n="3" title="The mandate protocol">
        <p>
          A mandate is a JSON object over a canonical serialization — recursively
          sorted keys, no insignificant whitespace, integers only (all money is
          integer paise; floats are refused as malformed) — signed with Ed25519. The
          canonical form is pinned by construction: any deviation fails verification
          rather than degrading to a heuristic. An illustrative envelope:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-sm border border-line bg-paper2/60 p-3.5 font-mono text-[11.5px] leading-relaxed text-ink"><code>{`{
  "spec": "customs/mandate/1",
  "buyerId": "buyer_7f3k",
  "tier": "ATTESTED",
  "amountCapPaise": 349900,          // integer paise, never a float
  "items": [
    { "productId": "bud-pro-earbuds", "maxQty": 2, "unitPricePaise": 349900 }
  ],
  "issuedAtMs": 1756684800000,
  "expiresAtMs": 1756688400000       // short-lived by policy
}
-- signature (Ed25519 over the canonical serialization) --
"z3Fq…9cA" (detached; verified at every bind)`}</code></pre>
        <p className="mt-3 font-mono text-[10px] text-inksoft">
          illustrative shape — the schema and reason codes are the contract in src/lib/customs/gate/types.ts
        </p>
        <p className="mt-4">
          Identity enters as a <strong>trust tier</strong> that converts verification
          effort into a spending envelope, rather than into a yes/no gate. The
          envelope is enforced at bind time against live catalog prices, so a
          tier escalation cannot be spent retroactively and a mandate cannot outlive
          its clock.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-ink">
                {["tier", "per-order bound", "mandate lifetime", "distinct items"].map((h) => (
                  <th key={h} className="label-caps py-2 pr-4 font-mono">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono text-[12px]">
              {[
                ["UNVERIFIED", "≤ ₹500", "10 minutes", "≤ 3"],
                ["ATTESTED", "≤ ₹5,000", "30 minutes", "≤ 5"],
                ["MANDATED", "≤ ₹50,000", "60 minutes", "≤ 8"],
              ].map((r) => (
                <tr key={r[0]} className="border-b border-line/70">
                  {r.map((c, i) => (
                    <td key={i} className={cn("py-2 pr-4", i === 0 ? "font-semibold text-ink" : "tnum text-inksoft")}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3">
          Orthogonal to tier, a hard rule stands: any order at or above ₹10,000 holds
          for a named human decision, at every tier, with the hold visible in the
          ledger. The corpus in §6 includes an attempt to sneak past that threshold.
        </p>
      </PaperSection>

      {/* ------------------------------ §4 pipeline ------------------------------ */}
      <PaperSection n="4" title="The decision pipeline">
        <p>
          Every payment bind passes the same ten checks, in order, with the first
          failure winning and its code recorded on the order row and in the ledger.
          Order matters and is pinned by fuzz: structural validity precedes
          signature, signature precede policy, policy precedes price — cheap checks
          refuse garbage before expensive checks run, and no verdict depends on
          ordering side effects.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-ink">
                {["#", "check", "refusal code"].map((h) => (
                  <th key={h} className="label-caps py-2 pr-4 font-mono">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono text-[11.5px]">
              {[
                ["01", "currency is INR, amounts are integer paise", "CURRENCY_UNSUPPORTED · MALFORMED_MANDATE"],
                ["02", "mandate signature verifies (Ed25519, canonical)", "SIGNATURE_INVALID"],
                ["03", "mandate is unexpired", "MANDATE_EXPIRED"],
                ["04", "every cart item is in the mandate allowlist", "ITEM_NOT_IN_MANDATE"],
                ["05", "quantities within mandate bounds", "QUANTITY_OVER_MANDATE"],
                ["06", "unit prices match the live catalog at bind time", "PRICE_CHANGED_AT_BIND"],
                ["07", "total within the tier envelope", "AMOUNT_OVER_TIER · ITEM_COUNT_OVER_TIER"],
                ["08", "total within the mandate cap", "AMOUNT_OVER_CAP"],
                ["09", "order below ₹10,000, or a human has approved", "OVER_HUMAN_THRESHOLD_UNAPPROVED → hold"],
                ["10", "payment confirmation is not a replay", "REPLAY_DETECTED"],
              ].map((r) => (
                <tr key={r[0]} className="border-b border-line/70">
                  <td className="tnum py-1.5 pr-4 text-inksoft">{r[0]}</td>
                  <td className="py-1.5 pr-4 text-ink">{r[1]}</td>
                  <td className="py-1.5 pr-4 text-inksoft">{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3">
          The check that does the quiet heavy lifting is 06: the agent&apos;s
          arithmetic is never trusted. Whatever totals the agent computed while
          shopping, the gate re-prices the cart against the live catalog at bind
          time — the documented defense against price-drift and substitution attacks.
        </p>
      </PaperSection>

      {/* ------------------------------ §5 economics ------------------------------ */}
      <PaperSection n="5" title="Economics: the channel P&L">
        <p>
          A growth channel is adopted on unit economics, not novelty. Customs
          therefore treats the agent channel as a P&amp;L: agent GMV converted at an
          assumed MDR minus the AI serving cost of the brain that drove the
          transaction, with token counts estimated from the wire shapes actually
          sent. Both terms are measured from the same ledger that records the
          gate&apos;s verdicts; the projection scales the measured unit numbers to
          one million payments per month with every assumption declared in{" "}
          <code className="rounded-sm border border-line bg-paper2/60 px-1 py-0.5 font-mono text-[10.5px]">results/project.json</code>.
        </p>
        <div className="doc mt-4 grid gap-px bg-line sm:grid-cols-3">
          <LiveStat
            label="agent GMV — this ledger"
            value={stats ? inr(stats.gmvPaise) : "—"}
            hint={stats ? `${stats.capturedCount} captured · ${stats.refusedCount} refused` : "reading the ledger…"}
          />
          <LiveStat
            label="AI serving cost — this ledger"
            value={stats ? inr(stats.aiCostPaise, { decimals: true }) : "—"}
            hint="rules brain: deterministic, replayable"
          />
          <LiveStat
            label="channel net — this ledger"
            value={stats ? inr(stats.netPaise, { decimals: true }) : "—"}
            hint={stats ? `${stats.eventsTotal} ledger events · chain ${stats.chain.ok ? "intact" : "broken"}` : ""}
          />
        </div>
        <p className="mt-3 font-mono text-[10px] text-inksoft">
          the numbers above are read from the running ledger at page load — they are the live demo&apos;s numbers, not a table frozen for print (make meter, make project)
        </p>
      </PaperSection>

      {/* ------------------------------ §6 evaluation ------------------------------ */}
      <PaperSection n="6" title="Evaluation">
        <p>
          Three harnesses pin the claims. <strong>Conformance fuzzing:</strong> an
          authored corpus of twelve attacks — forged signatures, expired mandates,
          tier overshoot, cap overshoot, price drift, item substitution, quantity
          overrun, currency swaps, float amounts, over-₹50k attempts, replayed
          confirmations, and a sub-₹10k attempt to dodge the human desk — each with
          its expected reason code; the run passes only when every attack lands its
          expected refusal. <strong>Protocol ablation:</strong> the same deterministic
          batch of sessions is driven through three transport shapes (naive JSON,
          an MCP-style JSON-RPC 2.0 form, an ACP-style envelope+receipt form),
          measuring wire bytes, tool-call counts, and latency while asserting that
          verdicts do not change across arms — the gate is protocol-agnostic and the
          overhead is measured, not asserted. <strong>Chain audit:</strong> a full
          hash walk of the ledger plus a tamper control that flips one byte in a
          copy and requires the walk to fail at exactly that sequence number.
        </p>
        <p>
          One incident from the build is kept deliberately visible: during a live
          session the dev server hot-reloaded, a second runtime instance appended to
          the same ledger file with a stale head, and the chain forked — duplicate
          sequence numbers, verdict FAIL. The fix makes every append and read path
          re-read the file when another writer has touched it, so concurrent
          instances converge instead of forking, and a seven-check regression
          harness pins the property. The incident, root cause, and test are logged
          in ENGINEERING_LOG.md as D5-1 — evidence that the audit trail catches real
          failures, not just authored ones.
        </p>
      </PaperSection>

      {/* ------------------------------ §7 limitations ------------------------------ */}
      <PaperSection n="7" title="Limitations and future work">
        <p>
          The rail is a loudly-labeled simulation until Razorpay test-mode keys are
          configured; the Orders-plus-Checkout-plus-webhook path is implemented and
          the D1-1 spike script verifies it the moment keys exist, but live-key
          operation is out of scope by rule (live keys are refused at construction).
          The buyer agent is in-house — no third-party agent has yet paid through
          the gate — and the MCP/ACP arms are protocol-shaped transports, honestly
          labeled, rather than certified implementations. The store is a single
          merchant with no tenancy or merchant auth. Refunds and cancellations were
          cut for scope; mandate expiry and refusal handling carry the
          failure-handling story, and the cut is recorded. Finally, the ledger is a
          local JSONL file: correct, auditable, and append-only, but a
          productionization would move it to a volume-backed store — the deploy
          runbook already prescribes one.
        </p>
      </PaperSection>

      {/* ------------------------------ references ------------------------------ */}
      <Reveal>
        <section aria-label="references" className="border-t border-line pt-6">
          <SectionLabel>references</SectionLabel>
          <ul className="mt-3 space-y-1.5 font-mono text-[10.5px] leading-relaxed text-inksoft">
            <li>[1] Razorpay AI Buildathon 2026 — brief and evaluation criteria. https://razorpay.com/buildathon/</li>
            <li>[2] Customs, JUDGE.md — every claim mapped to a file and a regeneration command. (this repo)</li>
            <li>[3] Customs, ARCHITECTURE.md — the decision table and the P&amp;L formula. (this repo)</li>
            <li>[4] Customs, ENGINEERING_LOG.md — dated incidents, including D5-1. (this repo)</li>
            <li>[5] Customs, results/ — measured artifacts: conformance_matrix, ablation, cost_meter, project, audit_chain. (this repo)</li>
          </ul>
        </section>
      </Reveal>

      {/* ------------------------------ what to do next ------------------------------ */}
      <Reveal>
        <section className="flex flex-wrap items-center gap-3 border-t border-line pt-6 pb-4" aria-label="continue">
          <InkButton onClick={() => onEnter("agent")} arrow>
            see the protocol run live
          </InkButton>
          <GhostButton onClick={() => onEnter("why")} variant="ink">
            why it exists
          </GhostButton>
        </section>
      </Reveal>
    </article>
  );
}

function PaperSection({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-label={`section ${n} ${title}`} className="border-t border-line pt-7">
      <Reveal>
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[11px] font-semibold text-inksoft">§{n}</span>
          <h2 className="font-display text-[22px] font-medium tracking-tight text-ink">{title}</h2>
        </div>
      </Reveal>
      <div className="mt-3 space-y-3.5 text-[14.5px] leading-[1.75] text-inksoft">{children}</div>
    </section>
  );
}

function LiveStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="bg-card px-4 py-3">
      <div className="label-caps">{label}</div>
      <div className="tnum mt-1 font-display text-[22px] font-medium text-ink">{value}</div>
      {hint && <div className="mt-0.5 font-mono text-[9.5px] text-inksoft">{hint}</div>}
    </div>
  );
}
