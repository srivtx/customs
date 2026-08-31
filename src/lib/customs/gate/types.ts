/**
 * The mandate contract — the gate's core. Everything else defends this.
 *
 * Invariants (AGENTS.md):
 *  - money is integer paise; floats never touch financial arithmetic
 *  - mandates are canonical JSON (sorted keys, no whitespace) before signing
 *  - bounds are re-verified server-side at bind time, in plain code — never an LLM
 */

export type TrustTier = "UNVERIFIED" | "ATTESTED" | "MANDATED";

/** Hard caps per trust tier. UPI-Circle-style delegated limits. */
export const TRUST_TIERS: Record<
  TrustTier,
  { maxAmountPaise: number; maxItems: number; mandateTtlMs: number; label: string; blurb: string }
> = {
  UNVERIFIED: {
    maxAmountPaise: 50_000,
    maxItems: 1,
    mandateTtlMs: 10 * 60_000,
    label: "unverified walk-in",
    blurb: "No identity on file. One item, up to ₹500, ten minutes.",
  },
  ATTESTED: {
    maxAmountPaise: 500_000,
    maxItems: 3,
    mandateTtlMs: 30 * 60_000,
    label: "attested agent",
    blurb: "Attested identity (OTP-bound). Three items, up to ₹5,000, half an hour.",
  },
  MANDATED: {
    maxAmountPaise: 5_000_000,
    maxItems: 10,
    mandateTtlMs: 24 * 3_600_000,
    label: "mandated agent",
    blurb: "Signed standing mandate. Ten items, up to ₹50,000, twenty-four hours.",
  },
};

/** Above this, a human approves regardless of tier. */
export const HUMAN_APPROVAL_THRESHOLD_PAISE = 1_000_000; // ₹10,000

export interface MandateItem {
  productId: string;
  quantity: number;
  /** price snapshot at mandate time; re-verified at bind time */
  unitPricePaise: number;
}

export interface MandateBody {
  id: string;
  buyerId: string;
  tier: TrustTier;
  /** every field below is covered by the merchant's Ed25519 signature */
  amountCapPaise: number;
  items: MandateItem[];
  currency: "INR";
  issuedAtMs: number;
  expiresAtMs: number;
  /** true when a human explicitly approved (required over threshold) */
  humanApproved: boolean;
}

export interface Mandate extends MandateBody {
  /** Ed25519 signature over canonical JSON of MandateBody, base64 */
  signature: string;
}

export type MandateStatus =
  | "PENDING_APPROVAL"
  | "ACTIVE"
  | "CONSUMED"
  | "EXPIRED"
  | "REFUSED";

/** Refusal reason codes — the Blocks panel's one-liners. */
export const REFUSAL_REASONS = {
  AMOUNT_OVER_CAP: "amount exceeds mandate cap",
  AMOUNT_OVER_TIER: "amount exceeds trust-tier cap",
  ITEM_COUNT_OVER_TIER: "item count exceeds trust-tier cap",
  MANDATE_EXPIRED: "mandate expired",
  PRICE_CHANGED_AT_BIND: "price changed since mandate — re-approval required",
  SIGNATURE_INVALID: "mandate signature verification failed",
  OVER_HUMAN_THRESHOLD_UNAPPROVED: "over ₹10,000 without human approval",
  MALFORMED_MANDATE: "mandate failed canonical parsing",
  CURRENCY_UNSUPPORTED: "mandate currency is not INR",
  ITEM_NOT_IN_MANDATE: "item is not covered by the mandate",
  QUANTITY_OVER_MANDATE: "quantity exceeds mandated quantity",
  REPLAY_DETECTED: "payment confirmation already seen — replay refused",
  UNKNOWN: "unclassified refusal",
} as const;

export type RefusalReason = keyof typeof REFUSAL_REASONS;

/** The gate's explainable verdict: a checklist, not an oracle. */
export type GateDecisionKind = "ALLOW" | "HOLD_FOR_APPROVAL" | "REFUSE";

export interface GateCheck {
  id: string;
  label: string;
  pass: boolean | null; // null = informational
  detail: string;
}

export interface GateDecision {
  kind: GateDecisionKind;
  code: RefusalReason | null;
  reason: string;
  checks: GateCheck[];
  decidedAtMs: number;
  /** server-computed total from the live catalog — the agent's arithmetic is never trusted */
  totalPaise: number;
}
