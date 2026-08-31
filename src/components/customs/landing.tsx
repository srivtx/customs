"use client";

/**
 * landing.tsx — the overview: what Customs is, how a transaction clears,
 * the trust ladder, the protocol matrix, and the proof layer commands.
 */
import { useEffect, useState } from "react";
import { SectionLabel, Stamp, GhostButton, InkButton, ManifestRow, inr, CountUp, Reveal, Ticker, LiveDot } from "./bits";
import { TRUST_TIERS } from "@/lib/customs/gate/types";
import { ADAPTERS, AdapterId } from "@/lib/customs/adapters";
import type { View } from "./shell";

interface LandingStats {
  gmvPaise: number;
  capturedCount: number;
  attackCount: number;
  netPaise: number;
  chainOk: boolean;
  eventsTotal: number;
}

interface TickerOrder {
  orderId: string;
  totalPaise: number;
  status: string;
  adapter: string;
}

export function Landing({ onEnter }: { onEnter: (view: View) => void }) {
  const [stats, setStats] = useState<LandingStats | null>(null);
  const [tickerItems, setTickerItems] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/state", { cache: "no-store" });
        const d = (await res.json()) as {
          ok: boolean;
          meter: LandingStats;
          chain: { ok: boolean };
          eventsTotal: number;
          orders: TickerOrder[];
        };
        if (d.ok) {
          setStats({
            gmvPaise: d.meter.gmvPaise,
            capturedCount: d.meter.capturedCount,
            attackCount: d.meter.attackCount,
            netPaise: d.meter.netPaise,
            chainOk: d.chain.ok,
            eventsTotal: d.eventsTotal,
          });
          setTickerItems(
            (d.orders ?? []).slice(0, 14).map(
              (o) =>
                `${o.orderId.slice(0, 12)} · ${inr(o.totalPaise)} · ${o.status.replace(/_/g, " ").toLowerCase()} · ${o.adapter}`
            )
          );
        }
      } catch {
        /* stats strip is optional garnish */
      }
    };
    void load();
  }, []);

  return (
    <div className="space-y-14">
      {/* ------------------------------ hero ------------------------------ */}
      <section className="relative overflow-hidden border-b border-line" aria-label="intro">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
          <div className="px-1 py-8 lg:pr-10 lg:py-12">
            <div className="label-caps">razorpay ai buildathon 2026 · track 1 · test mode only</div>
            <h1 className="mt-4 font-display text-[clamp(38px,6vw,64px)] font-medium leading-[1.02] tracking-tight text-ink">
              AI agents can
              <br />
              finally pay. <em className="font-normal">Safely.</em>
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-inksoft">
              Customs is the checkout AI buyers transact on — and the desk merchants
              trust. Every rupee an agent moves is <span className="text-ink">signed, bounded,
              and provable</span>: a mandate in plain code, a hash-chained ledger, a
              human desk over ₹10,000.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <InkButton
                onClick={() => onEnter("agent")}
                ariaLabel="enter the agent playground"
                arrow
                className="h-11 px-6"
              >
                Enter the playground
              </InkButton>
              <GhostButton
                onClick={() => onEnter("merchant")}
                ariaLabel="open the control room"
                variant="ink"
                className="h-11 px-6"
              >
                Open the control room
              </GhostButton>
            </div>
            {/* live stats strip */}
            <div className="mt-9 grid max-w-xl grid-cols-2 gap-x-8 gap-y-3 border-t border-line pt-5 sm:grid-cols-4">
              <Stat label="agent GMV">
                {stats ? <CountUp value={stats.gmvPaise} format={(n) => inr(Math.round(n))} className="tnum text-[15px] font-semibold text-ink" /> : "—"}
              </Stat>
              <Stat label="orders cleared">
                {stats ? <span className="tnum text-[15px] font-semibold text-ink">{stats.capturedCount}</span> : "—"}
              </Stat>
              <Stat label="attacks blocked">
                {stats ? <span className="tnum text-[15px] font-semibold text-ink">{stats.attackCount}</span> : "—"}
              </Stat>
              <Stat label="chain intact">
                {stats ? <span className={stats.chainOk ? "text-[15px] font-semibold text-cleared" : "text-[15px] font-semibold text-refused"}>{stats.chainOk ? "✓ yes" : "✕ broken"}</span> : "—"}
              </Stat>
            </div>
          </div>

          {/* hero image — customs house motif, duotone-treated */}
          <div className="relative min-h-[300px] border-l border-line">
            {/* hero photo — plain img: local file, fixed render size */}
            <img
              src="/hero-customs.jpg"
              alt="Stacked shipping containers at a cargo port — the customs checkpoint"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ filter: "grayscale(1) contrast(1.05) brightness(1.02)" }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(160deg, rgba(246,243,236,0.86) 0%, rgba(246,243,236,0.28) 42%, rgba(27,24,15,0.38) 100%)",
                mixBlendMode: "multiply",
              }}
            />
            <div className="absolute inset-0" style={{ background: "linear-gradient(20deg, rgba(27,24,15,0.25), transparent 55%)" }} />
            <div className="absolute bottom-5 right-5 rotate-[-3deg]">
              <Stamp kind="cleared" animate={false}>MANIFEST FN-MA-000001</Stamp>
            </div>
            <div className="absolute left-5 top-5 rotate-[2deg]">
              <Stamp kind="ink" animate={false}>BOUNDED · GATED · SIGNED</Stamp>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------ the demo, recorded ------------------------------ */}
      <Reveal>
        <section aria-label="recorded demo">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <SectionLabel>watch it clear — the golden path, recorded</SectionLabel>
            <span className="font-mono text-[10px] text-inksoft">26 seconds · no cuts · driven by scripts/make-demo-gif.sh</span>
          </div>
          <div className="doc mt-5 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-inksoft">
                one agent, one mandate, one receipt — end to end
              </span>
              <Stamp kind="sim" animate={false}>REPLAY OF A REAL RUN</Stamp>
            </div>
            <img
              src="/demo.gif"
              alt="Screen recording of the Customs golden path: the agent searches for headphones, adds them to the cart, is refused for exceeding its trust tier, attests, requests a mandate, the principal approves, the gate runs its checks, the payment is captured, and the merchant control room shows the live P&L and ledger."
              className="block w-full"
              loading="lazy"
            />
            <div className="border-t border-line px-4 py-2 font-mono text-[10px] leading-relaxed text-inksoft">
              intent → search → cart → tier refusal → attest → mandate → bind-time checks → capture → receipt → the merchant&apos;s live P&amp;L
            </div>
          </div>
        </section>
      </Reveal>

      {/* ------------------------------ live manifest ticker ------------------------------ */}
      {tickerItems.length > 0 && (
        <section aria-label="recent ledger lines">
          <div className="mb-2 flex items-center justify-between">
            <LiveDot label="recently through customs — live ledger lines" />
            <span className="font-mono text-[10px] text-inksoft">same lines the control room shows · hash-chained</span>
          </div>
          <Ticker items={tickerItems} />
        </section>
      )}

      {/* ------------------------------ how it clears ------------------------------ */}
      <section aria-label="how it works">
        <SectionLabel>how a transaction clears customs</SectionLabel>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            {
              n: "01",
              t: "Mandate",
              d: "The buyer signs a mandate: amount cap, item list, expiry, trust tier. Ed25519 over canonical JSON. No mandate, no money.",
              code: "sign(mandate.body)",
            },
            {
              n: "02",
              t: "Bind",
              d: "At checkout the gate re-checks everything in plain code: signature, tier bounds, live catalog prices, item allowlist. The agent's arithmetic is never trusted.",
              code: "decide(mandate, order)",
            },
            {
              n: "03",
              t: "Settle",
              d: "Capture on the rail (test mode or labeled simulation), manifest receipt issued, every span hash-chained into an audit ledger you can replay.",
              code: "capture(orderId)",
            },
          ].map((s, i) => (
            <Reveal key={s.n} delay={i * 90}>
              <article className="doc card-lift h-full border-line px-4 py-4">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-2xl font-medium text-ink">{s.t}</span>
                  <span className="font-mono text-[10px] text-inksoft">{s.n}</span>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-inksoft">{s.d}</p>
                <div className="mt-3 rounded-sm border border-line bg-paper2/60 px-2.5 py-1.5 font-mono text-[10.5px] text-ink">{s.code}</div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------------------ trust ladder ------------------------------ */}
      <section aria-label="trust tiers">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionLabel>how much an agent may spend — the trust ladder</SectionLabel>
          <span className="font-mono text-[10px] text-inksoft">+ a human desk over ₹10,000, always</span>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {(["UNVERIFIED", "ATTESTED", "MANDATED"] as const).map((tier, i) => {
            const t = TRUST_TIERS[tier];
            return (
              <Reveal key={tier} delay={i * 90}>
                <article className="doc card-lift h-full border-line px-4 py-4">
                  <div className="flex items-center justify-between">
                    <span className="label-caps">{t.label}</span>
                    <span className="tnum font-display text-2xl font-medium text-ink">{inr(t.maxAmountPaise)}</span>
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-inksoft">{t.blurb}</p>
                  <div className="mt-3">
                    <ManifestRow left="mandate lifetime" right={`${Math.round(t.mandateTtlMs / 60000)} min`} />
                    <ManifestRow left="distinct items" right={String(t.maxItems)} />
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ------------------------------ protocol matrix ------------------------------ */}
      <section aria-label="protocol matrix">
        <SectionLabel>speaks your protocol — one gate, three transports</SectionLabel>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {(["naive", "mcp", "acp"] as AdapterId[]).map((a, i) => (
            <Reveal key={a} delay={i * 90}>
              <article className="doc card-lift h-full border-line px-4 py-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[12px] font-semibold uppercase tracking-wider text-ink">{ADAPTERS[a].label}</span>
                  <Stamp kind="ink" animate={false}>{a === "naive" ? "BASELINE" : a === "mcp" ? "JSON-RPC 2.0" : "ENVELOPES + RECEIPT"}</Stamp>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-inksoft">{ADAPTERS[a].blurb}</p>
              </article>
            </Reveal>
          ))}
        </div>
        <p className="mt-3 font-mono text-[10px] text-inksoft">
          conformance-fuzzed per adapter · overhead measured in results/ablation.json · x402 pre-declared as a stretch, not a promise
        </p>
      </section>

      {/* ------------------------------ built to be judged ------------------------------ */}
      <Reveal>
        <section className="doc border-line2 px-5 py-5" aria-label="proof layer">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-xl font-medium text-ink">Built to be judged by a machine.</h3>
          <span className="label-caps">the proof layer</span>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            {[
              ["make triage", "60-second self-guided judge tour — prints claims, runs checks, exits 0"],
              ["make verify", "the exact evidence checks CI runs on every push (zero deps)"],
              ["make fuzz", "the authored attack corpus vs the production gate — 12/12, reason codes"],
              ["make ablation", "same batch through three protocols, overhead measured"],
              ["make meter", "channel P&L over the deterministic ledger — GMV minus AI cost"],
              ["make project", "the at-1M-payments projection, assumptions declared"],
            ].map(([cmd, d]) => (
              <div key={cmd} className="flex items-baseline gap-3">
                <code className="shrink-0 rounded-sm border border-line bg-paper2 px-2 py-0.5 font-mono text-[11px] font-semibold text-ink">
                  {cmd}
                </code>
                <span className="text-[12.5px] leading-relaxed text-inksoft">{d}</span>
              </div>
            ))}
          </div>
          <div className="doc border-line px-4 py-3">
            <div className="label-caps">the bar, verbatim</div>
            <blockquote className="mt-2 border-l-2 border-ink pl-3 font-display text-[15px] italic leading-relaxed text-ink">
              “Every money action explainable, bounded and gated. Show the audit trail and one
              failure handled gracefully.”
            </blockquote>
            <p className="mt-3 text-[12.5px] leading-relaxed text-inksoft">
              Explainable: the gate's verdict is a checklist, not an oracle. Bounded: tier caps,
              mandate caps, item allowlists, price re-verification. Gated: authored attacks refused
              with reason codes, hash-chained evidence, human desk over ₹10,000.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <GhostButton onClick={() => onEnter("agent")}>try the playground</GhostButton>
          <GhostButton onClick={() => onEnter("merchant")}>see the control room</GhostButton>
          <GhostButton onClick={() => onEnter("why")} variant="ink">why it exists</GhostButton>
          <GhostButton onClick={() => onEnter("paper")} variant="ink">read the paper</GhostButton>
        </div>
        </section>
      </Reveal>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label-caps">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}
