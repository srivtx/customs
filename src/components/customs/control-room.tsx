"use client";

/**
 * control-room.tsx — the merchant side: the desk a payments company needs
 * before it lets agents spend. Live channel P&L (GMV − AI serving cost) with
 * the at-1M projection, the human-approval queue, order ledger, span-by-span
 * replay, the ablation matrix and the red-team log.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  CountUp,
  GhostButton,
  InkButton,
  LiveDot,
  ManifestRow,
  MeterBar,
  SectionLabel,
  Stamp,
  StatusChip,
  TierChip,
  inr,
  monoId,
} from "./bits";
import type { OrderView } from "@/lib/customs/ledger/ledger";

type LedgerFilter = "ALL" | "CAPTURED" | "HELD" | "REFUSED" | "PROPOSED";
const LEDGER_FILTERS: LedgerFilter[] = ["ALL", "CAPTURED", "HELD", "REFUSED", "PROPOSED"];

interface StateResponse {
  ok: boolean;
  rail: { id: string; label: string; simulated: boolean };
  brain: string;
  ephemeral: boolean;
  fingerprint: string;
  merchant: { name: string; products: number };
  meter: {
    gmvPaise: number;
    capturedCount: number;
    refusedCount: number;
    attackCount: number;
    refusalRate: number;
    tokensIn: number;
    tokensOut: number;
    aiCostPaise: number;
    channelRevenuePaise: number;
    netPaise: number;
    aiCostPerCapturedPaise: number;
    assumptions: {
      mdrPct: number;
      model: { name: string };
      usdToInr: number;
      projectionPaymentsPerMonth: number;
    };
  };
  projection: {
    paymentsPerMonth: number;
    avgTicketPaise: number;
    revenueInrPerMonth: number;
    aiCostInrPerMonth: number;
    netInrPerMonth: number;
    formula: string;
  };
  orders: OrderView[];
  approvals: { orderId: string; buyerId: string; totalPaise: number; items: { name: string; quantity: number }[]; createdAtMs: number }[];
  attacks: { ts: number; attackId: string; label: string; verdict: string; code: string | null; matched: boolean; expected: string }[];
  chain: { ok: boolean; length: number; headHash: string };
  eventsTotal: number;
  ablation: {
    status: string;
    arms?: { adapter: string; verdictsMatched: string; totalMs: number; wireBytes: number; toolCalls: number; estTokensIn: number; estTokensOut: number }[];
    llmArm?: { status: string; note: string } | null;
  } | null;
  conformance: { status: string; summary?: { passed: number; total: number } } | null;
  generatedAt: number;
}

interface TraceResponse {
  ok: boolean;
  traceId: string;
  spans: { spanId: string; name: string; ms: number; adapter?: string; attrs?: Record<string, number | string | boolean>; orderId?: string }[];
  events: { seq: number; ts: number; type: string; data: Record<string, unknown> }[];
}

export function ControlRoom() {
  const [state, setState] = useState<StateResponse | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [traceFor, setTraceFor] = useState<string | null>(null);
  const [trace, setTrace] = useState<TraceResponse | null>(null);
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>("ALL");
  const prevGmv = useRef(0);
  const seenIds = useRef<Set<string>>(new Set());
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      const data = (await res.json()) as StateResponse;
      if (data.ok) {
        prevGmv.current = state?.meter.gmvPaise ?? 0;
        setState(data);
      }
    } catch {
      /* next poll retries */
    }
  }, [state]);

  /* new rows since the last poll flash once — the ledger visibly ticks */
  useEffect(() => {
    if (!state) return;
    const current = new Set(state.orders.map((o) => o.orderId));
    const fresh = new Set([...current].filter((id) => !seenIds.current.has(id)));
    if (seenIds.current.size > 0 && fresh.size > 0) {
      setFlashIds(fresh);
      window.setTimeout(() => setFlashIds(new Set()), 2200);
    }
    seenIds.current = current;
  }, [state]);

  useEffect(() => {
    void refresh();
    const i = setInterval(() => void refresh(), 6000);
    return () => clearInterval(i);
  }, [refresh]);

  const decide = async (orderId: string, approve: boolean) => {
    setBusy(orderId);
    try {
      await fetch("/api/decision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId, approve }),
      });
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  const openTrace = async (orderId: string) => {
    setTraceFor(orderId);
    setTrace(null);
    try {
      const res = await fetch(`/api/trace/${encodeURIComponent(orderId)}`, { cache: "no-store" });
      setTrace((await res.json()) as TraceResponse);
    } catch {
      setTrace({ ok: false, traceId: "", spans: [], events: [] });
    }
  };

  const closeTrace = useCallback(() => {
    setTraceFor(null);
    setTrace(null);
  }, []);

  /* Escape closes the replay dialog — a dialog that traps the keyboard is a bug */
  useEffect(() => {
    if (!traceFor) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeTrace();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [traceFor, closeTrace]);

  if (!state) {
    return (
      <div className="doc flex min-h-[480px] items-center justify-center">
        <span className="text-[13px] text-inksoft">opening the ledger…</span>
      </div>
    );
  }

  const m = state.meter;
  const gmvDelta = m.gmvPaise - prevGmv.current;
  const maxWire = Math.max(...(state.ablation?.arms ?? []).map((a) => a.wireBytes), 1);
  const ledgerRows =
    ledgerFilter === "ALL"
      ? state.orders
      : state.orders.filter(
          (o) => o.status === ledgerFilter || (ledgerFilter === "HELD" && o.status === "AWAITING_APPROVAL")
        );

  return (
    <div className="space-y-7">
      {/* ------------------------------ header ------------------------------ */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <div className="label-caps">fieldnote supply · merchant desk</div>
          <h2 className="mt-1.5 font-display text-2xl font-medium tracking-[-0.02em]">Control Room</h2>
          <p className="mt-2 max-w-[52ch] text-[14px] leading-relaxed text-inksoft">
            The desk a payments company needs before it lets agents spend — live P&amp;L,
            the human approval queue, and every order replayable span by span.
          </p>
        </div>
        {/* the desk's state — one quiet strip: human words in the house
            sans, machine values (the fingerprint, the brain id) in mono */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px]">
          <span className="text-inksoft">
            rail <span className="font-medium text-ink">{state.rail.simulated ? "simulated" : "razorpay test"}</span>
          </span>
          <span className="text-inksoft">
            brain <span className="font-mono text-[11.5px] font-medium text-ink">{state.brain}</span>
          </span>
          <span className={cn("inline-flex items-center gap-1.5 font-medium", state.chain.ok ? "text-cleared" : "text-refused")}>
            <span className={cn("h-1.5 w-1.5 rounded-full", state.chain.ok ? "bg-cleared" : "bg-refused")} aria-hidden />
            chain {state.chain.ok ? "ok" : "broken"} · <span className="tnum font-mono text-[11.5px]">{state.chain.length}</span>
          </span>
          {state.ephemeral && <span className="font-medium text-held">ephemeral state</span>}
          <GhostButton
            onClick={async () => {
              setBusy("reset");
              await fetch("/api/reset", { method: "POST" });
              await refresh();
              setBusy(null);
            }}
            disabled={busy === "reset"}
          >
            {busy === "reset" ? "reseeding…" : "reset demo"}
          </GhostButton>
        </div>
      </div>

      {/* ------------------------------ meter ------------------------------ */}
      <section className="doc overflow-hidden" aria-label="channel P&L meter">
        <div className="grid gap-px bg-line md:grid-cols-[1.25fr_1fr_1fr_1fr]">
          <div className="bg-card px-5 py-5 md:col-span-1">
            <div className="label-caps">agent GMV — cleared &amp; captured</div>
            <div className="mt-1.5 flex items-baseline gap-2.5">
              <CountUp value={m.gmvPaise} format={(n) => inr(Math.round(n), { decimals: false })} className="font-display text-[38px] font-medium leading-none tracking-[-0.02em] text-ink" />
              {gmvDelta > 0 && <span className="text-[12px] font-medium text-cleared">+{inr(gmvDelta)} live</span>}
            </div>
            <div className="mt-2.5 text-[12px] text-inksoft">
              {m.capturedCount} captured · {m.refusedCount} refused · {m.attackCount} attacks blocked
            </div>
          </div>
          <div className="bg-card px-5 py-5">
            <div className="label-caps">channel revenue (MDR {m.assumptions.mdrPct}%)</div>
            <CountUp value={m.channelRevenuePaise} format={(n) => inr(Math.round(n))} className="font-display text-[26px] font-medium tracking-[-0.02em] text-ink" />
            <div className="mt-1.5 text-[12px] text-inksoft">assumed list price</div>
          </div>
          <div className="bg-card px-5 py-5">
            <div className="label-caps">AI serving cost</div>
            <CountUp value={m.aiCostPaise} format={(n) => inr(Math.round(n), { decimals: true })} className="font-display text-[26px] font-medium tracking-[-0.02em] text-ink" />
            <div className="mt-1.5 text-[12px] text-inksoft">
              <span className="tnum font-mono">{m.tokensIn + m.tokensOut}</span> tokens · {m.assumptions.model.name}
            </div>
          </div>
          <div className="bg-card px-5 py-5">
            <div className="label-caps">channel P&amp;L — net</div>
            <CountUp value={m.netPaise} format={(n) => inr(Math.round(n), { decimals: true })} className={cn("font-display text-[26px] font-medium tracking-[-0.02em]", m.netPaise >= 0 ? "text-cleared" : "text-refused")} />
            <div className="mt-1.5 text-[12px] text-inksoft">
              <span className="tnum font-mono">₹{(m.aiCostPerCapturedPaise / 100).toFixed(2)}</span> AI / captured payment
            </div>
          </div>
        </div>
        {/* at-scale projection — one quiet row, the numbers carried inline;
            padded like its own summary layer, not a footer bolted on */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2.5 border-t border-line bg-paper2/50 px-5 py-4">
          <span className="text-[12.5px] text-inksoft">
            at <span className="font-medium text-ink">1M payments / month</span> — every input declared, regenerates with <span className="font-mono text-[11.5px] text-ink">make project</span>
          </span>
          <span className="ml-auto flex flex-wrap items-baseline gap-x-8 gap-y-1.5">
            <span className="flex items-baseline gap-2">
              <span className="text-[12px] text-inksoft">revenue</span>
              <span className="tnum font-display text-[17px] font-medium text-ink">₹{state.projection.revenueInrPerMonth.toLocaleString("en-IN")}</span>
            </span>
            <span className="flex items-baseline gap-2">
              <span className="text-[12px] text-inksoft">AI cost</span>
              <span className="tnum font-display text-[17px] font-medium text-ink">₹{state.projection.aiCostInrPerMonth.toLocaleString("en-IN")}</span>
            </span>
            <span className="flex items-baseline gap-2">
              <span className="text-[12px] text-inksoft">net</span>
              <span className="tnum font-display text-[17px] font-medium text-cleared">₹{state.projection.netInrPerMonth.toLocaleString("en-IN")}</span>
            </span>
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-2.5 text-[11px] text-inksoft">
          <span>
            avg ticket <span className="tnum font-mono">{inr(state.projection.avgTicketPaise)}</span> · measured from the live ledger · assumptions in <span className="font-mono">results/project.json</span>
          </span>
          <span className="font-mono">desk fingerprint {state.fingerprint}</span>
        </div>
      </section>

      <div className="grid gap-7 xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <div className="space-y-7">
          {/* ------------------------------ approvals ------------------------------ */}
          <section className="doc px-5 py-5" aria-label="approval queue">
            <SectionLabel>human desk — orders over ₹10,000 waiting</SectionLabel>
            {state.approvals.length === 0 ? (
              <p className="mt-3.5 text-[13px] leading-relaxed text-inksoft">
                Queue clear. Orders at or above ₹10,000 hold here until a human decides — the gate
                never lets a mandate spend it silently.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {state.approvals.map((a) => (
                  <li key={a.orderId} className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-line2 bg-paper2/50 px-3.5 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="tnum font-mono text-[11px] font-semibold text-ink">{inr(a.totalPaise)}</span>
                        <span className="font-mono text-[10px] text-inksoft">{monoId(a.orderId, 22)} · {a.buyerId}</span>
                      </div>
                      <div className="mt-0.5 truncate text-[12px] text-inksoft">
                        {a.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <InkButton onClick={() => decide(a.orderId, true)} disabled={busy === a.orderId} variant="cleared" className="h-9">
                        {busy === a.orderId ? "…" : "Approve"}
                      </InkButton>
                      <GhostButton onClick={() => decide(a.orderId, false)} disabled={busy === a.orderId} variant="danger" className="h-9">
                        Reject
                      </GhostButton>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ------------------------------ orders ------------------------------ */}
          <section className="doc overflow-hidden px-5 py-5" aria-label="order ledger">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <SectionLabel>order ledger — live</SectionLabel>
                <LiveDot label="ticking" />
              </div>
              <span className="text-[12px] text-inksoft">
                auto-refresh 6s · click a row to replay its spans
              </span>
            </div>
            {/* status filters — the desk clerk's tabs, in the house sans */}
            <div className="mt-3.5 flex flex-wrap items-center gap-1.5" role="tablist" aria-label="filter orders by status">
              {LEDGER_FILTERS.map((f) => {
                const n =
                  f === "ALL"
                    ? state.orders.length
                    : state.orders.filter((o) => o.status === f || (f === "HELD" && o.status === "AWAITING_APPROVAL")).length;
                return (
                  <button
                    key={f}
                    role="tab"
                    aria-selected={ledgerFilter === f}
                    onClick={() => setLedgerFilter(f)}
                    className={cn(
                      "btn-ghost h-7 rounded-[4px] border px-2.5 text-[12px] font-medium capitalize",
                      ledgerFilter === f
                        ? "border-transparent bg-ink text-paper"
                        : "border-line2 bg-transparent text-inksoft hover:border-ink/30 hover:text-ink"
                    )}
                  >
                    {f === "ALL" ? "all" : f.toLowerCase()} <span className="tnum font-mono text-[11px] opacity-70">{n}</span>
                  </button>
                );
              })}
            </div>
            {/* the ledger itself — a contained, styled, sticky-headed terminal */}
            <div className="ledger-scroll mt-3 max-h-[440px] overflow-auto">
              <table className="w-full min-w-[780px] table-fixed border-collapse text-left">
                <colgroup>
                  <col style={{ width: 62 }} />
                  <col style={{ width: 118 }} />
                  <col style={{ width: 148 }} />
                  <col />
                  <col style={{ width: 96 }} />
                  <col style={{ width: 76 }} />
                  <col style={{ width: 132 }} />
                  <col style={{ width: 52 }} />
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-line2 bg-card/95 backdrop-blur-sm">
                    {["time", "order", "buyer · tier", "items", "total", "rail", "status", ""].map((h, i) => (
                      <th key={h || i} className={cn("label-caps py-2 pr-3 font-mono", (h === "total" || i === 7) && "text-right")}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ledgerRows.map((o) => {
                    const fresh = flashIds.has(o.orderId);
                    return (
                      <tr
                        key={o.orderId}
                        tabIndex={0}
                        role="button"
                        aria-label={`replay order ${o.orderId}, ${inr(o.totalPaise)}, ${o.status}`}
                        className={cn(
                          "cursor-pointer border-b border-line/70 outline-none transition-colors",
                          "hover:bg-paper2/60 focus-visible:bg-paper2/60",
                          fresh && "row-fresh"
                        )}
                        onClick={() => openTrace(o.orderId)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openTrace(o.orderId);
                          }
                        }}
                      >
                        <td className="tnum py-3 pr-3 font-mono text-[10px] text-inksoft">
                          {new Date(o.createdAtMs).toLocaleTimeString("en-IN", { hour12: false })}
                        </td>
                        <td className="py-3 pr-3 font-mono text-[11px] text-inksoft">{monoId(o.orderId, 18)}</td>
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <span className="truncate font-mono text-[10px] text-inksoft">{o.buyerId}</span>
                            <TierChip tier={o.tier} />
                          </div>
                        </td>
                        <td className="truncate py-3 pr-3 text-[12px] text-inksoft">
                          {o.items.map((i: { name: string; quantity: number }) => `${i.name} ×${i.quantity}`).join(", ")}
                        </td>
                        <td className="tnum py-3 pr-3 text-right font-mono text-[12px] font-semibold text-ink">
                          {inr(o.totalPaise)}
                        </td>
                        <td className="py-3 pr-3 font-mono text-[9.5px] uppercase text-inksoft">{o.adapter}</td>
                        <td className="py-3 pr-3">
                          <StatusChip status={o.status} />
                          {o.code && o.status === "REFUSED" && (
                            <div className="mt-0.5 font-mono text-[9px] text-refused">{o.code}</div>
                          )}
                          {o.rail === "simulation" && o.status === "CAPTURED" && (
                            <div className="mt-0.5 text-[10.5px] text-inksoft">simulated</div>
                          )}
                        </td>
                        <td className="py-3 pr-3 text-right">
                          <span className="text-[11.5px] font-medium text-inksoft underline decoration-dotted underline-offset-2">replay</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {ledgerRows.length === 0 && (
                <p className="py-6 text-center text-[13px] text-inksoft">
                  no orders with status {ledgerFilter.toLowerCase()} — fire a chat or the corpus and the ledger ticks
                </p>
              )}
            </div>
            {/* the ledger's own footer — a summary rule, like a real book */}
            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-x-6 gap-y-1.5 border-t border-line pt-3 text-[12px] text-inksoft">
              <span>
                {ledgerRows.length} of {state.orders.length} rows · {state.meter.capturedCount} captured · {state.meter.refusedCount} refused · {state.meter.attackCount} attacks blocked
              </span>
              <span className="tnum">Σ shown {inr(ledgerRows.reduce((s, o) => s + o.totalPaise, 0))} · chain {state.chain.ok ? "intact" : "BROKEN"} · <span className="font-mono">{state.eventsTotal}</span> events</span>
            </div>
          </section>
        </div>

        <div className="space-y-7">
          {/* ------------------------------ conformance ------------------------------ */}
          <section className="doc px-5 py-5" aria-label="conformance">
            <SectionLabel>conformance — attack me</SectionLabel>
            <div className="mt-3.5 flex items-center justify-between">
              {state.conformance?.summary ? (
                <span className="tnum font-display text-[22px] font-medium tracking-[-0.02em] text-cleared">
                  {state.conformance.summary.passed}/{state.conformance.summary.total}
                </span>
              ) : (
                <span className="text-[13px] text-inksoft">run <span className="font-mono text-[12px]">make fuzz</span></span>
              )}
              <span className="text-[12px] text-inksoft">
                {state.conformance?.status === "pass" ? "authored attacks, expected codes" : <span className="font-mono text-[11px]">results/conformance_matrix.json</span>}
              </span>
            </div>
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-inksoft">
              Fire the same corpus against the running gate — each attempt is refused (or held)
              with a reason code and logged to the chain.
            </p>
            <InkButton
              className="mt-4"
              disabled={busy === "fuzz"}
              onClick={async () => {
                setBusy("fuzz");
                try {
                  await fetch("/api/fuzz", { method: "POST" });
                  await refresh();
                } finally {
                  setBusy(null);
                }
              }}
            >
              {busy === "fuzz" ? "firing corpus…" : "Run the corpus live"}
            </InkButton>
          </section>

          {/* ------------------------------ ablation ------------------------------ */}
          <section className="doc px-5 py-5" aria-label="ablation matrix">
            <SectionLabel>ablation — protocol overhead, measured</SectionLabel>
            {state.ablation?.arms ? (
              <>
                <div className="mt-3">
                  {state.ablation.arms.map((a) => (
                    <MeterBar
                      key={a.adapter}
                      label={a.adapter}
                      value={a.wireBytes}
                      max={maxWire}
                      kind={a.adapter === "acp" ? "cleared" : a.adapter === "mcp" ? "held" : "ink"}
                      right={`${a.wireBytes.toLocaleString()}B`}
                    />
                  ))}
                </div>
                <div className="mt-2">
                  {state.ablation.arms.map((a) => (
                    <ManifestRow
                      key={a.adapter}
                      left={`${a.adapter} — verdicts`}
                      right={a.verdictsMatched}
                      mono
                    />
                  ))}
                  <ManifestRow left="est tokens (same shapes)" right={`${(state.ablation.arms[0]?.estTokensIn ?? 0) + (state.ablation.arms[0]?.estTokensOut ?? 0)}`} mono />
                </div>
                <p className="mt-2.5 text-[11.5px] leading-relaxed text-inksoft">
                  {state.ablation.llmArm?.status === "skipped-no-key"
                    ? "LLM arm: skipped, never simulated — no LLM key present. See results/ablation.json."
                    : state.ablation.llmArm?.note}
                </p>
              </>
            ) : (
              <p className="mt-3.5 text-[13px] text-inksoft">run <span className="font-mono text-[12px]">make ablation</span></p>
            )}
          </section>

          {/* ------------------------------ attack log ------------------------------ */}
          <section className="doc px-5 py-5" aria-label="attack log">
            <SectionLabel>blocks — red-team log</SectionLabel>
            <div className="chat-scroll mt-3.5 max-h-[300px] space-y-2.5 overflow-y-auto">
              {state.attacks.map((a, i) => (
                <div key={i} className="animate-rise flex items-center justify-between gap-2 border-b border-line/60 pb-2.5 last:border-b-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="truncate text-[12.5px] font-medium text-ink">{a.label}</div>
                    <div className="mt-0.5 font-mono text-[10px] text-inksoft">
                      {a.code} · expected {a.expected}
                    </div>
                  </div>
                  <Stamp kind={a.verdict === "BLOCKED" ? "cleared" : "refused"} animate={false}>
                    {a.verdict}
                  </Stamp>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* ------------------------------ trace dialog ------------------------------ */}
      {traceFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-paper/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="trace replay"
          onClick={() => {
            closeTrace();
          }}
        >
          <div className="doc animate-rise max-h-[86vh] w-full max-w-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <div>
                <div className="label-caps">trace replay</div>
                <div className="mt-1 font-mono text-[12px] text-ink">{traceFor}</div>
              </div>
              <GhostButton onClick={closeTrace}>close</GhostButton>
            </div>
            <div className="chat-scroll max-h-[70vh] overflow-y-auto px-5 py-4">
              {!trace && <p className="text-[13px] text-inksoft">loading spans…</p>}
              {trace && trace.spans.length === 0 && (
                <p className="text-[13px] leading-relaxed text-inksoft">
                  No spans recorded for this order (historical seed entries carry the ledger line; live
                  turns carry spans).
                </p>
              )}
              {trace?.spans.map((s, i) => (
                <div key={s.spanId} className="animate-rise border-b border-line/60 py-2" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-mono text-[12px] font-semibold text-ink">
                      <span className="mr-2 text-inksoft">{String(i + 1).padStart(2, "0")}</span>
                      {s.name}
                    </span>
                    <span className="tnum font-mono text-[10px] text-inksoft">{s.ms}ms</span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 font-mono text-[9px] text-inksoft">
                    {s.adapter && <span>adapter: {s.adapter}</span>}
                    {Object.entries(s.attrs ?? {})
                      .filter(([k]) => k !== "startSeq")
                      .map(([k, v]) => (
                        <span key={k}>
                          {k}: <span className="text-ink">{String(v)}</span>
                        </span>
                      ))}
                  </div>
                </div>
              ))}
              {trace && trace.events.length > 0 && (
                <div className="mt-3">
                  <SectionLabel>ledger events</SectionLabel>
                  <div className="mt-2 space-y-1">
                    {trace.events.map((e) => (
                      <div key={e.seq} className="flex items-baseline gap-2 font-mono text-[10px] text-inksoft">
                        <span className="w-8 shrink-0 text-right">{e.seq}</span>
                        <span className="font-semibold text-ink">{e.type}</span>
                        <span className="truncate">{JSON.stringify(e.data).slice(0, 110)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
