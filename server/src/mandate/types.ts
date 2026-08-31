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
export const TRUST_TIERS: Record<TrustTier, {
  maxAmountPaise: number;
  maxItems: number;
  mandateTtlMs: number;
  label: string;
}> = {
  UNVERIFIED: { maxAmountPaise: 50_000,    maxItems: 1,  mandateTtlMs: 10 * 60_000,     label: "unverified walk-in" },
  ATTESTED:   { maxAmountPaise: 500_000,   maxItems: 3,  mandateTtlMs: 30 * 60_000,     label: "attested agent" },
  MANDATED:   { maxAmountPaise: 5_000_000, maxItems: 10, mandateTtlMs: 24 * 3_600_000,  label: "mandated agent" },
};

/** Above this, a human approves regardless of tier. */
export const HUMAN_APPROVAL_THRESHOLD_PAISE = 1_000_000; // ₹10,000

export interface MandateItem {
  productId: string;
  quantity: number;
  /** price snapshot at mandate time; re-verified at bind time */
  unitPricePaise: number;
}

export interface Mandate {
  id: string;
  buyerId: string;
  tier: TrustTier;
  amountCapPaise: number;
  items: MandateItem[];
  issuedAtMs: number;
  expiresAtMs: number;
  /** true when a human explicitly approved (required over threshold) */
  humanApproved: boolean;
  /** Ed25519 signature over canonical JSON of all fields above, base64 */
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
  UNKNOWN: "unclassified refusal",
} as const;

export type RefusalReason = keyof typeof REFUSAL_REASONS;

/** Canonical JSON for signing: sorted keys, no whitespace, integers only. */
export function canonicalMandateJson(m: Omit<Mandate, "signature">): string {
  const sorted = Object.fromEntries(
    Object.entries(m).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  );
  return JSON.stringify(sorted);
}
