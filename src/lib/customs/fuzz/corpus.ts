/**
 * The attack corpus — authored attacks, expected verdicts.
 *
 * One corpus, three consumers: `make fuzz` (conformance matrix in results/),
 * the Playground's red-team panel (fires live into the running gate), and
 * the gate test suite (every authored attack is a test case forever).
 *
 * Every case must be refused (or held) with a specific reason code — this is
 * the "gated" half of the track bar, and the audit trail is the receipt.
 *
 * Corpus design rule: attacks that exploit a *legitimately issued* mandate
 * (tight cap, wrong items, short qty) use issuance-time inputs — the
 * signature stays valid so the intended bound is what fires. Only true
 * tampering cases (tampered-signature) mutate bytes after signing.
 */
import { Mandate, TrustTier } from "../gate/types";
import type { TxInput } from "../engine";

export type ExpectedVerdict =
  | { kind: "REFUSE"; code: string }
  | { kind: "HOLD_FOR_APPROVAL"; code: string };

export interface AttackCase {
  id: string;
  label: string;
  blurb: string;
  /** tier the attacking session pretends to hold */
  tier: TrustTier;
  /** what the mandate legitimately covers (defaults to the order) */
  mandateItems?: { productId: string; quantity: number }[];
  /** a legitimately issued tight cap (below the tier cap) */
  issueCapPaise?: number;
  /** what the attack tries to bind */
  order?: { productId: string; quantity: number }[];
  /** mutate a valid mandate after signing — breaks the signature */
  forge?: (m: Mandate) => Mandate;
  /** price drift injection: mutate catalog price for a product before bind */
  priceDrift?: { productId: string; toPaise: number };
  /** negative TTL so the mandate is born expired */
  expired?: boolean;
  /** attempt to replay a captured payment confirmation */
  replayConfirm?: boolean;
  expect: ExpectedVerdict;
}

export const ATTACK_CORPUS: AttackCase[] = [
  {
    id: "overspend-tier",
    label: "Overspend the tier",
    blurb: "An unverified walk-in orders the Ridge Mouse (₹2,199) — the tier caps it at ₹500.",
    tier: "UNVERIFIED",
    order: [{ productId: "ridge-mouse", quantity: 1 }],
    expect: { kind: "REFUSE", code: "AMOUNT_OVER_TIER" },
  },
  {
    id: "overspend-cap",
    label: "Overspend the mandate cap",
    blurb: "A mandate legitimately signed for ₹2,000; the order totals ₹2,999 (Cell Power Bank).",
    tier: "ATTESTED",
    order: [{ productId: "cell-powerbank-20k", quantity: 1 }],
    issueCapPaise: 200_000,
    expect: { kind: "REFUSE", code: "AMOUNT_OVER_CAP" },
  },
  {
    id: "expired-mandate",
    label: "Replay an expired mandate",
    blurb: "A valid 10-minute mandate is presented 11 minutes later.",
    tier: "ATTESTED",
    order: [{ productId: "slate-desk-mat", quantity: 1 }],
    expired: true,
    expect: { kind: "REFUSE", code: "MANDATE_EXPIRED" },
  },
  {
    id: "tampered-signature",
    label: "Tamper the signature",
    blurb: "The mandate's cap and prices are widened after signing; the signature no longer covers the body.",
    tier: "ATTESTED",
    order: [{ productId: "bud-pro-earbuds", quantity: 1 }],
    forge: (m) => ({
      ...m,
      amountCapPaise: 5_000_000,
      items: m.items.map((it) => ({ ...it, unitPricePaise: 1 })),
    }),
    expect: { kind: "REFUSE", code: "SIGNATURE_INVALID" },
  },
  {
    id: "price-drift",
    label: "Price drift at bind",
    blurb: "Mandate snapshots the SSD at ₹8,999; the catalog price moves before binding.",
    tier: "MANDATED",
    order: [{ productId: "vault-ssd-1tb", quantity: 1 }],
    priceDrift: { productId: "vault-ssd-1tb", toPaise: 799_900 },
    expect: { kind: "REFUSE", code: "PRICE_CHANGED_AT_BIND" },
  },
  {
    id: "item-substitution",
    label: "Substitute the item",
    blurb: "Mandate legitimately covers the Bud Pro earbuds; the order swaps in the Ridge Mouse.",
    tier: "ATTESTED",
    mandateItems: [{ productId: "bud-pro-earbuds", quantity: 1 }],
    order: [{ productId: "ridge-mouse", quantity: 1 }],
    expect: { kind: "REFUSE", code: "ITEM_NOT_IN_MANDATE" },
  },
  {
    id: "quantity-overrun",
    label: "Overrun the quantity",
    blurb: "Mandate allows 1 desk mat; the order asks for 3.",
    tier: "ATTESTED",
    mandateItems: [{ productId: "slate-desk-mat", quantity: 1 }],
    order: [{ productId: "slate-desk-mat", quantity: 3 }],
    expect: { kind: "REFUSE", code: "QUANTITY_OVER_MANDATE" },
  },
  {
    id: "currency-swap",
    label: "Swap the currency",
    blurb: "A mandate that claims to be denominated in USD.",
    tier: "MANDATED",
    order: [{ productId: "ridge-mouse", quantity: 1 }],
    forge: (m) => ({ ...m, currency: "USD" as unknown as "INR" }),
    expect: { kind: "REFUSE", code: "CURRENCY_UNSUPPORTED" },
  },
  {
    id: "float-amount",
    label: "Float in the paise field",
    blurb: "amountCapPaise arrives as 500.5 — floats never touch money.",
    tier: "ATTESTED",
    order: [{ productId: "slate-desk-mat", quantity: 1 }],
    forge: (m) => ({ ...m, amountCapPaise: 500.5 }),
    expect: { kind: "REFUSE", code: "MALFORMED_MANDATE" },
  },
  {
    id: "over-50k",
    label: "Break the ₹50,000 ceiling",
    blurb: "A fully mandated agent tries the Summit Drone (₹54,999) in one transaction.",
    tier: "MANDATED",
    order: [{ productId: "summit-drone-4k", quantity: 1 }],
    expect: { kind: "REFUSE", code: "AMOUNT_OVER_TIER" },
  },
  {
    id: "replay-payment",
    label: "Replay the payment confirmation",
    blurb: "A captured payment's confirmation is re-submitted to double-charge the merchant.",
    tier: "ATTESTED",
    order: [{ productId: "arc-light-bar", quantity: 1 }],
    replayConfirm: true,
    expect: { kind: "REFUSE", code: "REPLAY_DETECTED" },
  },
  {
    id: "human-threshold",
    label: "Sneak past the ₹10,000 desk",
    blurb: "₹18,999 headphones ordered without human approval — held, not charged.",
    tier: "MANDATED",
    order: [{ productId: "trail-anc-headphones", quantity: 1 }],
    expect: { kind: "HOLD_FOR_APPROVAL", code: "OVER_HUMAN_THRESHOLD_UNAPPROVED" },
  },
];

/** Build the engine input for an attack case (shared by fuzz, seed, live UI). */
export function attackTxInput(
  attack: AttackCase,
  opts: { orderId: string; nowMs: number; adapter?: TxInput["adapter"]; buyerPrefix?: string }
): TxInput {
  const items = attack.order ?? [{ productId: "slate-desk-mat", quantity: 1 }];
  return {
    buyerId: `${opts.buyerPrefix ?? "attacker"}-${attack.id}`,
    tier: attack.tier,
    items,
    mandateItems: attack.mandateItems ?? items,
    adapter: opts.adapter ?? "acp",
    nowMs: opts.nowMs,
    orderId: opts.orderId,
    amountCapPaise: attack.issueCapPaise,
    priceOverrides: attack.priceDrift ? { [attack.priceDrift.productId]: attack.priceDrift.toPaise } : undefined,
    forge: attack.forge,
    expired: attack.expired,
    humanApproved: false,
  };
}
