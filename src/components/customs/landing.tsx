"use client";

/**
 * landing.tsx — the overview: typography does the work. A huge
 * sentence-case claim, the golden path played live by the page, the
 * live ledger, the trust ladder, the transports, the proof layer.
 * One device — the hairline — and one accent. Captions and notes set
 * in the house sans (the mono voice is for machine strings).
 */
import { useEffect, useRef, useState } from "react";
import { GhostButton, InkButton, inr, CountUp, LiveDot, LiveLedger, Reveal, TickerItem } from "./bits";
import { DemoPlayer } from "./demo-player";
import { HeroBot } from "./hero-bot";
import { HeroFabric } from "./hero-fabric";
import { PitchVideo } from "./video-modal";
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

export function Landing({ onEnter }: { onEnter: (view: View) => void }) {
  const [stats, setStats] = useState<LandingStats | null>(null);
  const [ledgerItems, setLedgerItems] = useState<TickerItem[]>([]);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const seen = useRef<Set<string>>(new Set());

  /* the ledger card is live: poll the desk, flash the rows that just
     landed — the same confirmation the control room's ledger gives */
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/state", { cache: "no-store" });
        const d = (await res.json()) as {
          ok: boolean;
          meter: LandingStats;
          chain: { ok: boolean };
          eventsTotal: number;
          orders: (TickerItem & { createdAtMs: number })[];
        };
        if (!alive || !d.ok) return;
        const orders = d.orders ?? [];
        setStats({
          gmvPaise: d.meter.gmvPaise,
          capturedCount: d.meter.capturedCount,
          attackCount: d.meter.attackCount,
          netPaise: d.meter.netPaise,
          chainOk: d.chain.ok,
          eventsTotal: d.eventsTotal,
        });
        setLedgerItems(orders.slice(0, 14).map((o) => ({
          orderId: o.orderId,
          totalPaise: o.totalPaise,
          status: o.status,
          adapter: o.adapter,
          createdAtMs: o.createdAtMs,
        })));
        const current = new Set(orders.map((o) => o.orderId));
        const fresh = new Set([...current].filter((id) => !seen.current.has(id)));
        if (seen.current.size > 0 && fresh.size > 0) {
          setFlashIds(fresh);
          window.setTimeout(() => setFlashIds(new Set()), 2200);
        }
        seen.current = current;
      } catch {
        /* the desk is unreachable — the page stands without it */
      }
    };
    void load();
    const i = setInterval(() => void load(), 8000);
    return () => {
      alive = false;
      clearInterval(i);
    };
  }, []);

  return (
    <div>
      {/* ------------------------------ hero ------------------------------ */}
      <section aria-label="intro" className="pb-16 pt-6 sm:pt-10">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,29rem)] lg:gap-6">
          <div>
            <p className="label-caps">razorpay ai buildathon 2026 · track 1 · test mode</p>
            <h1 className="mt-6 max-w-[15ch] font-display text-[clamp(44px,7.4vw,92px)] font-semibold leading-[0.98] tracking-[-0.035em] text-ink">
              Agents can finally pay.
              <br />
              <span className="text-inksoft">Safely.</span>
            </h1>
            <p className="mt-7 max-w-[52ch] text-[17px] leading-relaxed text-inksoft">
              Customs is the checkout AI buyers transact on — and the desk merchants
              trust. Every rupee an agent moves is signed, bounded, and provable:
              a mandate in plain code, ten checks at bind time, a hash-chained
              ledger, a human desk over ₹10,000.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <InkButton onClick={() => onEnter("agent")} ariaLabel="enter the agent playground" arrow className="h-11 px-5 text-[14px]">
                Enter the playground
              </InkButton>
              <GhostButton onClick={() => onEnter("merchant")} ariaLabel="open the control room" variant="ink" className="h-11 px-5">
                Open the control room
              </GhostButton>
              <PitchVideo />
            </div>
          </div>
          {/* the customs bot — the desk's little officer, stamping as it
              orbits. The wool mat is a separate backdrop layer: same
              viewBox, stacked behind, never drawn into the bot itself. */}
          <div className="relative mx-auto w-[min(80vw,340px)] lg:w-full">
            <HeroFabric className="absolute inset-0 h-full w-full" />
            <HeroBot className="relative w-full" />
          </div>
        </div>

        {/* live stats — one hairline row, mono numbers */}
        <div className="mt-16 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-line pt-8 sm:mt-20 sm:grid-cols-4">
          <Stat label="agent GMV">
            {stats ? <CountUp value={stats.gmvPaise} format={(n) => inr(Math.round(n))} className="tnum font-display text-[22px] font-semibold tracking-[-0.02em] text-ink" /> : "—"}
          </Stat>
          <Stat label="orders cleared">
            {stats ? <span className="tnum font-display text-[22px] font-semibold tracking-[-0.02em] text-ink">{stats.capturedCount}</span> : "—"}
          </Stat>
          <Stat label="attacks blocked">
            {stats ? <span className="tnum font-display text-[22px] font-semibold tracking-[-0.02em] text-ink">{stats.attackCount}</span> : "—"}
          </Stat>
          <Stat label="chain intact">
            {stats ? (
              <span className={stats.chainOk ? "font-display text-[22px] font-semibold tracking-[-0.02em] text-cleared" : "font-display text-[22px] font-semibold tracking-[-0.02em] text-refused"}>
                {stats.chainOk ? "yes" : "broken"}
              </span>
            ) : (
              "—"
            )}
          </Stat>
        </div>
      </section>

      {/* ------------------------------ the golden path, live ------------------------------ */}
      <Reveal>
        <section aria-label="the golden path, played live" className="border-t border-line py-16">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-[clamp(24px,3vw,34px)] font-semibold tracking-[-0.025em] text-ink">
              Watch it clear.
            </h2>
            <span className="text-[12.5px] text-inksoft">
              rendered live by this page — not a recording · hover holds it
            </span>
          </div>
          <div className="mt-6">
            <DemoPlayer />
          </div>
        </section>
      </Reveal>

      {/* ------------------------------ recently through customs — the live ledger ------------------------------ */}
      {ledgerItems.length > 0 && (
        <section aria-label="recent ledger lines" className="pb-16">
          <div className="doc overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1.5 border-b border-line px-4 py-3 sm:px-5">
              <div className="flex items-center gap-3">
                <LiveDot label="" className="[&>span:last-child]:hidden" />
                <h3 className="text-[13.5px] font-medium text-ink">Recently through customs</h3>
              </div>
              <span className="hidden text-[12.5px] text-inksoft sm:block">the live ledger · hash-chained</span>
            </div>
            <LiveLedger items={ledgerItems} flashIds={flashIds} />
          </div>
        </section>
      )}

      {/* ------------------------------ how it clears ------------------------------ */}
      <section aria-label="how it works" className="border-t border-line py-16">
        <h2 className="font-display text-[clamp(24px,3vw,34px)] font-semibold tracking-[-0.025em] text-ink">
          How a payment clears.
        </h2>
        <div className="mt-8 grid gap-px bg-line md:grid-cols-3">
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
              d: "At checkout the gate re-checks everything in plain code: signature, tier bounds, live catalog prices, allowlist. The agent's arithmetic is never trusted.",
              code: "decide(mandate, order)",
            },
            {
              n: "03",
              t: "Settle",
              d: "Capture on the rail (test mode or labeled simulation), receipt issued, every span hash-chained into a ledger you can replay.",
              code: "capture(orderId)",
            },
          ].map((s, i) => (
            <Reveal key={s.n} delay={i * 80} className="bg-paper">
              <div className="card-lift h-full rounded-[4px] p-5">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-[19px] font-semibold tracking-[-0.02em] text-ink">{s.t}</span>
                  <span className="font-mono text-[11px] text-inksoft">{s.n}</span>
                </div>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-inksoft">{s.d}</p>
                <div className="mt-4 rounded-[4px] bg-ink/[0.05] px-2.5 py-1.5 font-mono text-[11.5px] text-ink">{s.code}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------------------ trust ladder ------------------------------ */}
      <section aria-label="trust tiers" className="border-t border-line py-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-[clamp(24px,3vw,34px)] font-semibold tracking-[-0.025em] text-ink">
            What an agent may spend.
          </h2>
          <span className="text-[12.5px] text-inksoft">a human desk over ₹10,000, always</span>
        </div>
        <div className="mt-8 grid gap-px bg-line md:grid-cols-3">
          {(["UNVERIFIED", "ATTESTED", "MANDATED"] as const).map((tier, i) => {
            const t = TRUST_TIERS[tier];
            return (
              <Reveal key={tier} delay={i * 80} className="bg-paper">
                <div className="card-lift h-full rounded-[4px] p-5">
                  <div className="label-caps">{t.label}</div>
                  <div className="tnum mt-2 font-display text-[30px] font-semibold tracking-[-0.03em] text-ink">
                    {inr(t.maxAmountPaise)}
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-inksoft">{t.blurb}</p>
                  <div className="mt-4 space-y-1.5 border-t border-line pt-3 text-[12px]">
                    <div className="flex justify-between">
                      <span className="text-inksoft">mandate lifetime</span>
                      <span className="tnum font-mono text-ink">{Math.round(t.mandateTtlMs / 60000)} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-inksoft">distinct items</span>
                      <span className="tnum font-mono text-ink">{t.maxItems}</span>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ------------------------------ protocol matrix ------------------------------ */}
      <section aria-label="protocol matrix" className="border-t border-line py-16">
        <h2 className="font-display text-[clamp(24px,3vw,34px)] font-semibold tracking-[-0.025em] text-ink">
          One gate, three transports.
        </h2>
        <div className="mt-8 grid gap-px bg-line md:grid-cols-3">
          {(["naive", "mcp", "acp"] as AdapterId[]).map((a, i) => (
            <Reveal key={a} delay={i * 80} className="bg-paper">
              <div className="card-lift h-full rounded-[4px] p-5">
                <div className="flex items-center justify-between">
                  <span className="font-display text-[17px] font-semibold tracking-[-0.02em] text-ink">{ADAPTERS[a].label}</span>
                  <span className="text-[11.5px] text-inksoft">
                    {a === "naive" ? "baseline" : a === "mcp" ? "json-rpc 2.0" : "envelopes"}
                  </span>
                </div>
                <p className="mt-2.5 text-[13px] leading-relaxed text-inksoft">{ADAPTERS[a].blurb}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-3 text-[12.5px] text-inksoft">
          conformance-fuzzed per adapter · overhead measured in <span className="font-mono">results/ablation.json</span> · x402 pre-declared as a stretch, not a promise
        </p>
      </section>

      {/* ------------------------------ built to be judged ------------------------------ */}
      <Reveal>
        <section className="rounded-[4px] border border-line bg-card px-6 py-8" aria-label="proof layer">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-[clamp(24px,3vw,34px)] font-semibold tracking-[-0.025em] text-ink">
              Built to be judged by a machine.
            </h2>
            <span className="label-caps">the proof layer</span>
          </div>
          <div className="mt-6 grid gap-10 md:grid-cols-2">
            <div className="space-y-2.5">
              {[
                ["make triage", "60-second self-guided judge tour — prints claims, runs checks, exits 0"],
                ["make verify", "the exact evidence checks CI runs on every push (zero deps)"],
                ["make fuzz", "the authored attack corpus vs the production gate — 12/12, reason codes"],
                ["make ablation", "same batch through three protocols, overhead measured"],
                ["make meter", "channel P&L over the deterministic ledger — GMV minus AI cost"],
                ["make project", "the at-1M-payments projection, assumptions declared"],
              ].map(([cmd, d]) => (
                <div key={cmd} className="flex items-baseline gap-3.5">
                  <code className="shrink-0 rounded-[4px] bg-ink/[0.05] px-2 py-0.5 font-mono text-[11.5px] font-medium text-ink">
                    {cmd}
                  </code>
                  <span className="text-[12.5px] leading-relaxed text-inksoft">{d}</span>
                </div>
              ))}
            </div>
            <div className="rounded-[4px] border border-line bg-paper2/40 px-4 py-4">
              <div className="label-caps">the bar, verbatim</div>
              <blockquote className="mt-3 border-l-2 border-cleared/50 pl-4 text-[15px] leading-relaxed text-ink">
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
          <div className="mt-6 flex flex-wrap gap-2">
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
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
