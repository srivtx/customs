/**
 * Mandate issuance and verification.
 *
 * The merchant signs the mandate body (canonical JSON → Ed25519 → base64).
 * The gate re-verifies signature AND bounds at bind time — a valid signature
 * on stale or widened bounds is still refused.
 */
import { createPrivateKey, createPublicKey, sign as edSign, verify as edVerify } from "node:crypto";
import { canonicalJson, CanonicalError } from "./canonical";
import { Mandate, MandateBody, MandateItem, TRUST_TIERS, TrustTier } from "./types";

export interface IssueMandateInput {
  buyerId: string;
  tier: TrustTier;
  items: MandateItem[];
  nowMs: number;
  humanApproved?: boolean;
  /** optional explicit cap below the tier cap; never above it */
  amountCapPaise?: number;
  ttlMs?: number;
}

export function buildMandateBody(input: IssueMandateInput, id: string): MandateBody {
  const tier = TRUST_TIERS[input.tier];
  const ttl = input.ttlMs ?? tier.mandateTtlMs;
  const requested = input.amountCapPaise ?? tier.maxAmountPaise;
  if (!Number.isSafeInteger(requested) || requested <= 0) {
    throw new Error("amountCapPaise must be a positive safe integer");
  }
  // the issued cap can only be tighter than the tier allows, never wider
  const amountCapPaise = Math.min(requested, tier.maxAmountPaise);
  return {
    id,
    buyerId: input.buyerId,
    tier: input.tier,
    amountCapPaise,
    items: input.items.map((it) => ({
      productId: it.productId,
      quantity: it.quantity,
      unitPricePaise: it.unitPricePaise,
    })),
    currency: "INR",
    issuedAtMs: input.nowMs,
    expiresAtMs: input.nowMs + ttl,
    humanApproved: input.humanApproved ?? false,
  };
}

export function signMandate(body: MandateBody, privateKeyPem: string): Mandate {
  const payload = Buffer.from(canonicalJson(body), "utf8");
  const signature = edSign(null, payload, createPrivateKey(privateKeyPem)).toString("base64");
  return { ...body, signature };
}

/**
 * Verify a mandate's signature. Throws CanonicalError on unrepresentable
 * bodies; returns false on any signature mismatch (never throws for that).
 */
export function verifyMandateSignature(
  mandate: Mandate,
  publicKeyPem: string
): boolean {
  try {
    const { signature, ...body } = mandate;
    const payload = Buffer.from(canonicalJson(body), "utf8");
    return edVerify(
      null,
      payload,
      createPublicKey(publicKeyPem),
      Buffer.from(signature, "base64")
    );
  } catch (err) {
    if (err instanceof CanonicalError) throw err;
    return false;
  }
}
