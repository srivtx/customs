/**
 * The decision pipeline — bind-time re-verification of every bound.
 *
 * Design rules:
 *  - Deterministic code only. An LLM never decides money (AGENTS.md invariant 5).
 *  - The order total is recomputed server-side from the live catalog; the
 *    agent's arithmetic is never trusted.
 *  - Every check is recorded with a pass/fail and a human-readable detail —
 *    the verdict is a checklist, not an oracle. This is the "explainable"
 *    half of the track bar; the caps are the "bounded" half.
 */
import { verifyMandateSignature } from "./mandate";
import {
  GateCheck,
  GateDecision,
  HUMAN_APPROVAL_THRESHOLD_PAISE,
  Mandate,
  REFUSAL_REASONS,
  RefusalReason,
  TRUST_TIERS,
} from "./types";
import { canonicalJson, CanonicalError } from "./canonical";
import type { CatalogSnapshot } from "../store/catalog";

export interface OrderRequest {
  orderId: string;
  items: { productId: string; quantity: number }[];
  /** claimed by the agent — displayed, never trusted for money */
  claimedTotalPaise?: number;
}

const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export function decideOrder(
  mandate: Mandate,
  order: OrderRequest,
  catalog: CatalogSnapshot,
  nowMs: number
): GateDecision {
  const checks: GateCheck[] = [];
  const fail = (code: RefusalReason, extra?: string): GateDecision => ({
    kind: "REFUSE",
    code,
    reason: REFUSAL_REASONS[code] + (extra ? ` (${extra})` : ""),
    checks,
    decidedAtMs: nowMs,
    totalPaise: 0,
  });
  const push = (id: string, label: string, pass: boolean | null, detail: string) =>
    checks.push({ id, label, pass, detail });

  // 1. canonical shape — floats and unrepresentable values are refused before signing material
  try {
    const { signature: _dropped, ...body } = mandate;
    canonicalJson(body);
    push("parse", "mandate parses canonically", true, "sorted keys, integers only");
  } catch (err) {
    if (err instanceof CanonicalError) return fail("MALFORMED_MANDATE", err.message);
    throw err;
  }

  // 2. currency
  if (mandate.currency !== "INR") {
    push("currency", "mandate currency is INR", false, `got ${String(mandate.currency)}`);
    return fail("CURRENCY_UNSUPPORTED");
  }
  push("currency", "mandate currency is INR", true, "INR");

  // 3. signature
  const sigOk = verifyMandateSignature(mandate, catalog.merchantPublicKeyPem);
  push(
    "signature",
    "merchant Ed25519 signature verifies",
    sigOk,
    sigOk ? "fingerprint " + catalog.merchantFingerprint : "tampered or wrong desk"
  );
  if (!sigOk) return fail("SIGNATURE_INVALID");

  // 4. expiry
  const live = nowMs < mandate.expiresAtMs;
  push(
    "expiry",
    "mandate is unexpired",
    live,
    live
      ? `expires in ${Math.max(0, Math.round((mandate.expiresAtMs - nowMs) / 1000))}s`
      : `expired ${Math.round((nowMs - mandate.expiresAtMs) / 1000)}s ago`
  );
  if (!live) return fail("MANDATE_EXPIRED");

  // 5. items resolve against the mandate allowlist (item + quantity)
  for (const line of order.items) {
    const mandated = mandate.items.find((mi) => mi.productId === line.productId);
    if (!mandated) {
      push(
        "allowlist",
        "order items are inside the mandate",
        false,
        `${line.productId} is not in the mandate`
      );
      return fail("ITEM_NOT_IN_MANDATE");
    }
    if (line.quantity > mandated.quantity) {
      push(
        "allowlist",
        "order items are inside the mandate",
        false,
        `${line.productId}: ${line.quantity} > mandated ${mandated.quantity}`
      );
      return fail("QUANTITY_OVER_MANDATE");
    }
  }
  push(
    "allowlist",
    "order items are inside the mandate",
    true,
    `${order.items.length} line(s) covered`
  );

  // 6. price re-verification: mandate snapshots vs live catalog
  for (const mi of mandate.items) {
    const liveProduct = catalog.byId.get(mi.productId);
    if (!liveProduct) {
      push(
        "price",
        "prices re-verified at bind",
        false,
        `${mi.productId} no longer stocked`
      );
      return fail("PRICE_CHANGED_AT_BIND", "delisted");
    }
    if (liveProduct.pricePaise !== mi.unitPricePaise) {
      push(
        "price",
        "prices re-verified at bind",
        false,
        `${mi.productId}: mandated ${rupees(mi.unitPricePaise)}, now ${rupees(liveProduct.pricePaise)}`
      );
      return fail("PRICE_CHANGED_AT_BIND");
    }
  }
  push("price", "prices re-verified at bind", true, "catalog matches mandate snapshots");

  // 7. server-side total — the agent's arithmetic is never the ledger's
  let totalPaise = 0;
  for (const line of order.items) {
    const product = catalog.byId.get(line.productId);
    if (!product) return fail("PRICE_CHANGED_AT_BIND", "delisted at total");
    totalPaise += product.pricePaise * line.quantity;
  }
  push(
    "total",
    "total recomputed server-side",
    true,
    `${rupees(totalPaise)}${order.claimedTotalPaise && order.claimedTotalPaise !== totalPaise ? ` — agent claimed ${rupees(order.claimedTotalPaise)}, corrected` : ""}`
  );

  // 8. trust-tier bounds — the policy ceiling, checked before the mandate's
  //    own cap: a signed cap can never be wider than the tier allows
  const tier = TRUST_TIERS[mandate.tier];
  if (totalPaise > tier.maxAmountPaise) {
    push("tier", "total within trust-tier bound", false, `${rupees(tier.maxAmountPaise)} cap for ${tier.label}`);
    return fail("AMOUNT_OVER_TIER");
  }
  const distinct = order.items.length;
  if (distinct > tier.maxItems) {
    push("tier", "distinct items within trust-tier bound", false, `${distinct} > ${tier.maxItems}`);
    return fail("ITEM_COUNT_OVER_TIER");
  }
  push(
    "tier",
    "trust-tier bounds hold",
    true,
    `${rupees(tier.maxAmountPaise)} / ${tier.maxItems} items for ${tier.label}`
  );

  // 9. mandate cap — the envelope this specific mandate signed
  const underCap = totalPaise <= mandate.amountCapPaise;
  push(
    "cap",
    "total is under the mandate cap",
    underCap,
    `${rupees(totalPaise)} of ${rupees(mandate.amountCapPaise)}`
  );
  if (!underCap) return fail("AMOUNT_OVER_CAP");

  // 10. human threshold — hold, not refuse: the money waits for a person
  if (totalPaise >= HUMAN_APPROVAL_THRESHOLD_PAISE && !mandate.humanApproved) {
    push(
      "human",
      "under the ₹10,000 human-approval threshold",
      false,
      `${rupees(totalPaise)} needs a human at the desk`
    );
    return {
      kind: "HOLD_FOR_APPROVAL",
      code: "OVER_HUMAN_THRESHOLD_UNAPPROVED",
      reason: REFUSAL_REASONS.OVER_HUMAN_THRESHOLD_UNAPPROVED,
      checks,
      decidedAtMs: nowMs,
      totalPaise,
    };
  }
  push(
    "human",
    "human-approval threshold",
    totalPaise >= HUMAN_APPROVAL_THRESHOLD_PAISE ? null : true,
    totalPaise >= HUMAN_APPROVAL_THRESHOLD_PAISE
      ? "over threshold — human approval on file"
      : `under ${rupees(HUMAN_APPROVAL_THRESHOLD_PAISE)}`
  );

  return {
    kind: "ALLOW",
    code: null,
    reason: "cleared — all bounds verified",
    checks,
    decidedAtMs: nowMs,
    totalPaise,
  };
}
