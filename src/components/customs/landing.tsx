"use client";

/**
 * landing.tsx — the overview: what Customs is, how a transaction clears,
 * the trust ladder, the protocol matrix, and the proof layer commands.
 */
import { useEffect, useState } from "react";
import { SectionLabel, Stamp, GhostButton, ManifestRow, inr, CountUp, Reveal, Ticker, LiveDot } from "./bits";
import { TRUST_TIERS } from "@/lib/customs/gate/types";
import { ADAPTERS, AdapterId } from "@/lib/customs/adapters";

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

export function Landing({ onEnter }: { onEnter: (view: "agent" | "merchant") => void }) {
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
              The checkpoint for
              <br />
              <em className="font-normal">agentic commerce.</em>
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-inksoft">
              AI buyers are about to spend money in your app. Customs ships both sides of that
              counter: a storefront agents transact on, and a merchant desk a payments company can
              trust — every money action <span className="text-ink">bounded, metered, replayable</span>,
              and provable to a machine in sixty seconds.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                onClick={() => onEnter("agent")}
                aria-label="enter the agent playground"
                className="h-11 border border-ink bg-ink px-6 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-paper transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_var(--line-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Enter the agent playground
              </button>
              <button
                onClick={() => onEnter("merchant")}
                aria-label="open the control room"
                className="h-11 border border-line2 bg-transparent px-6 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink transition-colors hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Open the control room
              </button>
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
              d: "The buyer's agent asks; the desk signs an Ed25519 envelope over canonical JSON — amount cap, item list, expiry, trust tier. No mandate, no money.",
              code: "sign(mandate.body)",
            },
            {
              n: "02",
              t: "Bind",
              d: "At bind time the gate re-verifies everything in plain code: signature, tier bounds, live catalog prices, item allowlist. The agent's arithmetic is never trusted.",
              code: "decide(mandate, order)",
            },
            {
              n: "03",
              t: "Settle",
              d: "Capture on the rail (test mode or labeled simulation), manifest issued, every span hash-chained into an audit ledger that can be replayed and tamper-probed.",
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
          <SectionLabel>the trust ladder — identity becomes a spending envelope</SectionLabel>
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
        <SectionLabel>one gate, three protocols — the matrix is the point</SectionLabel>
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
          <GhostButton onClick={() => onEnter("agent")}>try the playground →</GhostButton>
          <GhostButton onClick={() => onEnter("merchant")}>see the control room →</GhostButton>
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
