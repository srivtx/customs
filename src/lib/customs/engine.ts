/**
 * The transaction engine — one code path for every transaction, everywhere.
 *
 * The Playground chat, the seeded demo history, the ablation scenarios and
 * the fuzz corpus all run through THIS function. There is no "demo mode"
 * fork of the money logic: if the gate refuses an attack in results/, it
 * refuses it in the live UI for the same reason, because it is the same
 * code with the same inputs.
 */
import { randomUUID } from "node:crypto";
import { Ledger, TraceSpan } from "./ledger/ledger";
import { buildMandateBody, signMandate } from "./gate/mandate";
import { decideOrder, OrderRequest } from "./gate/decide";
import { Mandate, TrustTier, GateDecision, TRUST_TIERS } from "./gate/types";
import { CATALOG, catalogSnapshot, Product } from "./store/catalog";
import { simulatedCapture, simulatedOrder, PaymentCapture, railInfo } from "./payments";
import type { AdapterId } from "./adapters";

export interface EngineDeps {
  ledger: Ledger;
  privateKeyPem: string;
  publicKeyPem: string;
  merchantFingerprint: string;
}

export interface TxInput {
  buyerId: string;
  tier: TrustTier;
  items: { productId: string; quantity: number }[];
  /** what the mandate legitimately covers (defaults to the order items) */
  mandateItems?: { productId: string; quantity: number }[];
  adapter: AdapterId;
  nowMs: number;
  /** optional catalog price drift (attacks / scenarios) */
  priceOverrides?: Record<string, number>;
  /** mandate forgery applied after honest issuance (attacks) */
  forge?: (m: Mandate) => Mandate;
  /** negative TTL: born-expired mandate */
  expired?: boolean;
  /** merchant-desk approval on file */
  humanApproved?: boolean;
  /** explicit id for deterministic harnesses */
  orderId?: string;
  /** explicit tight cap for legitimately-issued mandates (attacks) */
  amountCapPaise?: number;
  buyerPrefix?: string;
}

export interface TxOutcome {
  orderId: string;
  traceId: string;
  mandate: Mandate;
  decision: GateDecision;
  payment: PaymentCapture | null;
  railOrderId: string | null;
}

let spanCounter = 0;

export function newSpan(
  deps: EngineDeps,
  traceId: string,
  orderId: string,
  name: string,
  ms: number,
  adapter: AdapterId,
  attrs?: Record<string, number | string | boolean>,
  parentSpanId: string | null = null,
  atMs?: number
): TraceSpan {
  const span: TraceSpan = {
    traceId,
    orderId,
    spanId: `sp_${(spanCounter += 1).toString(36).padStart(4, "0")}`,
    parentSpanId,
    name,
    ms,
    adapter,
    attrs: { startSeq: deps.ledger.all().length + 1, ...(attrs ?? {}) },
  };
  deps.ledger.appendAt("span", { ...span }, atMs ?? Date.now());
  return span;
}

function snapshotWithDrift(
  deps: EngineDeps,
  overrides?: Record<string, number>
): { byId: Map<string, Product>; all: Product[]; merchantPublicKeyPem: string; merchantFingerprint: string } {
  if (!overrides) {
    return catalogSnapshot(deps.publicKeyPem, deps.merchantFingerprint);
  }
  const all = CATALOG.map((p) =>
    overrides[p.id] ? { ...p, pricePaise: overrides[p.id] } : p
  );
  return {
    all,
    byId: new Map(all.map((p) => [p.id, p])),
    merchantPublicKeyPem: deps.publicKeyPem,
    merchantFingerprint: deps.merchantFingerprint,
  };
}

/** Run one full agent transaction through the gate, honestly recorded. */
export function runTransaction(deps: EngineDeps, input: TxInput): TxOutcome {
  const orderId = input.orderId ?? `ord_${randomUUID().slice(0, 10)}`;
  const traceId = `tr_${orderId}`;
  const t0 = input.nowMs;

  newSpan(deps, traceId, orderId, "agent.session", 0, input.adapter, { buyerId: input.buyerId }, null, t0);

  // 1. mandate request (the agent asks; the desk signs)
  const catalog0 = snapshotWithDrift(deps);
  const mandateItems = (input.mandateItems ?? input.items).map((it) => {
    const p = catalog0.byId.get(it.productId);
    if (!p) throw new Error(`unknown product ${it.productId}`);
    return { productId: it.productId, quantity: it.quantity, unitPricePaise: p.pricePaise };
  });
  const cartTotal = mandateItems.reduce((s, it) => s + it.unitPricePaise * it.quantity, 0);
  let mandate: Mandate = signMandate(
    buildMandateBody(
      {
        buyerId: input.buyerId,
        tier: input.tier,
        items: mandateItems,
        nowMs: t0,
        humanApproved: input.humanApproved ?? false,
        amountCapPaise: input.amountCapPaise ?? Math.min(cartTotal, catalogTierCap(input.tier)),
        ttlMs: input.expired ? -60_000 : undefined,
      },
      `man_${randomUUID().slice(0, 8)}`
    ),
    deps.privateKeyPem
  );
  if (input.forge) mandate = input.forge(mandate);
  newSpan(deps, traceId, orderId, "mandate.request", 1, input.adapter, { tier: input.tier, capPaise: mandate.amountCapPaise }, null, t0 + 1);
  deps.ledger.appendAt("mandate.issued", { mandateId: mandate.id, buyerId: input.buyerId, tier: mandate.tier, amountCapPaise: mandate.amountCapPaise, orderId, traceId }, t0 + 2);

  // 2. order proposal — the ledger's total is always the gate's total
  const lines = input.items.map((it) => {
    const p = catalog0.byId.get(it.productId)!;
    return { productId: it.productId, name: p.name, quantity: it.quantity, unitPricePaise: p.pricePaise };
  });
  const claimedTotal = lines.reduce((s, l) => s + l.unitPricePaise * l.quantity, 0);
  deps.ledger.appendAt(
    "order.proposed",
    { orderId, buyerId: input.buyerId, tier: input.tier, adapter: input.adapter, items: lines, totalPaise: claimedTotal, traceId, claimedTotalPaise: claimedTotal },
    t0 + 3
  );

  // 3. bind: the gate decides on the drifted catalog (this is where attacks die)
  const catalog = snapshotWithDrift(deps, input.priceOverrides);
  const order: OrderRequest = { orderId, items: input.items, claimedTotalPaise: claimedTotal };
  const decision = decideOrder(mandate, order, catalog, t0 + 5);
  const turnTokensIn = Math.ceil(JSON.stringify({ items: input.items, tier: input.tier }).length / 4);
  const turnTokensOut = Math.ceil(JSON.stringify(decision.checks).length / 4);
  newSpan(deps, traceId, orderId, "gate.decide", decision.decidedAtMs - t0 || 2, input.adapter, { kind: decision.kind, code: decision.code ?? "ok", tokensIn: turnTokensIn, tokensOut: turnTokensOut }, null, t0 + 5);
  deps.ledger.appendAt(
    "gate.decision",
    { orderId, buyerId: input.buyerId, kind: decision.kind, code: decision.code, reason: decision.reason, totalPaise: decision.totalPaise, checks: decision.checks.length, traceId },
    t0 + 6
  );

  if (decision.kind === "REFUSE") {
    deps.ledger.appendAt("order.refused", { orderId, code: decision.code, reason: decision.reason, traceId }, t0 + 7);
    return { orderId, traceId, mandate, decision, payment: null, railOrderId: null };
  }

  if (decision.kind === "HOLD_FOR_APPROVAL") {
    deps.ledger.appendAt("approval.requested", { orderId, amountPaise: decision.totalPaise, reason: "over ₹10,000 without human approval", traceId }, t0 + 7);
    return { orderId, traceId, mandate, decision, payment: null, railOrderId: null };
  }

  // 4. pay on the rail (simulation for corpus; razorpay order for live demo)
  const payment = simulatedCapture(decision.totalPaise);
  const rail = railInfo();
  const railOrder = simulatedOrder(decision.totalPaise, orderId);
  newSpan(deps, traceId, orderId, "payment.create", 3, input.adapter, { rail: payment.rail }, null, t0 + 8);
  deps.ledger.appendAt(
    "payment.captured",
    { orderId, rail: payment.rail, simulated: payment.simulated, paymentId: payment.paymentId, confirmId: payment.confirmId, totalPaise: decision.totalPaise, railOrderId: railOrder.railOrderId, railLabel: rail.label, traceId },
    t0 + 9
  );
  void railOrder;
  return { orderId, traceId, mandate, decision, payment, railOrderId: railOrder.railOrderId };
}

function catalogTierCap(tier: TrustTier): number {
  return TRUST_TIERS[tier].maxAmountPaise;
}

/** Confirm a payment with replay protection. Returns the refusal code on replay. */
export function confirmPaymentOnce(
  deps: EngineDeps,
  orderId: string,
  confirmId: string,
  payload: Record<string, unknown>
): { ok: true } | { ok: false; code: "REPLAY_DETECTED" } {
  for (const e of deps.ledger.all()) {
    if (e.type === "payment.captured" || e.type === "payment.confirmed") {
      const d = e.data as Record<string, any>;
      if (d.confirmId === confirmId) {
        deps.ledger.append("replay.detected", { orderId, confirmId, code: "REPLAY_DETECTED" });
        return { ok: false, code: "REPLAY_DETECTED" };
      }
    }
  }
  deps.ledger.append("payment.confirmed", { orderId, confirmId, ...payload });
  return { ok: true };
}
