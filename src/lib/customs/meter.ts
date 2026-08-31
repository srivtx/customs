/**
 * The channel P&L meter — agent GMV minus AI serving cost.
 *
 * Reframe (locked in the plan of record): this is not a vanity counter, it is
 * a pricing-strategy proposal to the sponsor. "If agents drive N payments a
 * month through this channel, the channel's revenue is X and its AI bill is Y."
 *
 * Every constant below is an explicit, labeled assumption that ships inside
 * results/cost_meter.json and results/project.json. No number is hand-written
 * into a doc; the harness regenerates it (AGENTS.md invariant 1).
 */
import type { LedgerEvent } from "./ledger/chain";

export interface Assumptions {
  /** Razorpay standard list pricing, quoted as an assumption, not a claim:
   *  https://razorpay.com/docs/payments/dashboard/pricing/ */
  mdrPct: number;
  /** public list prices, USD per 1M tokens — labeled assumption */
  model: { name: string; inputUsdPer1M: number; outputUsdPer1M: number };
  /** labeled assumption for the INR conversion of AI cost */
  usdToInr: number;
  projectionPaymentsPerMonth: number;
}

export const ASSUMPTIONS: Assumptions = {
  mdrPct: 2.0,
  model: { name: "gpt-4o-mini-class (assumed)", inputUsdPer1M: 0.15, outputUsdPer1M: 0.6 },
  usdToInr: 83,
  projectionPaymentsPerMonth: 1_000_000,
};

export interface MeterSnapshot {
  gmvPaise: number;
  capturedCount: number;
  refusedCount: number;
  attackCount: number;
  refusalRate: number;
  /** measured token totals across all agent turns (LLM on) or their
   *  deterministic estimate (rules brain: message bytes / 4) */
  tokensIn: number;
  tokensOut: number;
  aiCostPaise: number;
  channelRevenuePaise: number;
  netPaise: number;
  aiCostPerCapturedPaise: number;
  assumptions: Assumptions;
}

export function meterFromEvents(events: readonly LedgerEvent[]): MeterSnapshot {
  let gmvPaise = 0;
  let capturedCount = 0;
  let refusedCount = 0;
  let attackCount = 0;
  let tokensIn = 0;
  let tokensOut = 0;

  for (const e of events) {
    const d = e.data as Record<string, any>;
    if (e.type === "payment.captured") {
      gmvPaise += d.totalPaise ?? 0;
      capturedCount += 1;
    } else if (e.type === "gate.decision" && d.kind === "REFUSE") {
      // authored attacks tell their story via attack.blocked entries; they are
      // excluded from the policy refusal rate (which reflects shopping traffic)
      const buyer = String(d.buyerId ?? "");
      const isAttack = buyer.startsWith("attacker") || buyer.startsWith("fuzz-");
      if (!isAttack) refusedCount += 1;
    } else if (e.type === "attack.blocked") {
      attackCount += 1;
    } else if (e.type === "span") {
      tokensIn += d.attrs?.tokensIn ?? 0;
      tokensOut += d.attrs?.tokensOut ?? 0;
    }
  }

  const { mdrPct, model, usdToInr } = ASSUMPTIONS;
  // integer-safe: USD micro-units → paise at the very end
  const aiCostUsd =
    (tokensIn / 1_000_000) * model.inputUsdPer1M + (tokensOut / 1_000_000) * model.outputUsdPer1M;
  const aiCostPaise = Math.round(aiCostUsd * usdToInr * 100);
  const channelRevenuePaise = Math.round((gmvPaise * mdrPct) / 100);
  const netPaise = channelRevenuePaise - aiCostPaise;
  const decisions = capturedCount + refusedCount;
  return {
    gmvPaise,
    capturedCount,
    refusedCount,
    attackCount,
    refusalRate: decisions === 0 ? 0 : refusedCount / decisions,
    tokensIn,
    tokensOut,
    aiCostPaise,
    channelRevenuePaise,
    netPaise,
    aiCostPerCapturedPaise: capturedCount === 0 ? 0 : Math.round(aiCostPaise / capturedCount),
    assumptions: ASSUMPTIONS,
  };
}

export interface Projection {
  paymentsPerMonth: number;
  avgTicketPaise: number;
  revenueInrPerMonth: number;
  aiCostInrPerMonth: number;
  netInrPerMonth: number;
  formula: string;
  assumptions: Assumptions;
}

/** At-scale projection from *measured* averages + labeled assumptions. */
export function projectAtScale(snapshot: MeterSnapshot): Projection {
  const n = ASSUMPTIONS.projectionPaymentsPerMonth;
  const avgTicketPaise =
    snapshot.capturedCount === 0 ? 0 : Math.round(snapshot.gmvPaise / snapshot.capturedCount);
  const costPerPayment = snapshot.aiCostPerCapturedPaise;
  const revenueInrPerMonth = Math.round(((avgTicketPaise * n * ASSUMPTIONS.mdrPct) / 100) / 100);
  const aiCostInrPerMonth = Math.round((costPerPayment * n) / 100);
  return {
    paymentsPerMonth: n,
    avgTicketPaise,
    revenueInrPerMonth,
    aiCostInrPerMonth,
    netInrPerMonth: revenueInrPerMonth - aiCostInrPerMonth,
    formula:
      "revenue = avgTicket × N × MDR% ; aiCost = measured ₹/captured-payment × N ; net = revenue − aiCost",
    assumptions: ASSUMPTIONS,
  };
}
