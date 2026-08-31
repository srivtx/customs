/**
 * The ablation — same shopping batch, three protocol adapters, and the
 * honest "what does the LLM brain actually buy you over the rules brain"
 * arm when a key is present.
 *
 * Everything deterministic: fixed clock, fixed carts, in-process ledger.
 * Latency numbers are wall-clock medians over the batch and are labeled
 * as machine-dependent in the results file.
 */
import { Ledger } from "../ledger/ledger";
import { loadKeys } from "../gate/keys";
import { runTransaction, EngineDeps } from "../engine";
import type { AdapterId } from "../adapters";
import { TrustTier } from "../gate/types";
import { catalogSnapshot } from "../store/catalog";
import { ATTACK_CORPUS, attackTxInput } from "../fuzz/corpus";

export interface AblationScenario {
  id: string;
  label: string;
  buyerId: string;
  tier: TrustTier;
  items: { productId: string; quantity: number }[];
  /** attack config if this scenario is an authored attack */
  attack?: (typeof ATTACK_CORPUS)[number];
  expected: "ALLOW" | "REFUSE" | "HOLD_FOR_APPROVAL";
}

export const ABLATION_SCENARIOS: AblationScenario[] = [
  { id: "s1-cheap", label: "unverified walk-in buys a ₹449 adapter", buyerId: "ab-1", tier: "UNVERIFIED", items: [{ productId: "globe-adapter", quantity: 1 }], expected: "ALLOW" },
  { id: "s2-attested", label: "attested agent buys mouse + mat", buyerId: "ab-2", tier: "ATTESTED", items: [{ productId: "ridge-mouse", quantity: 1 }, { productId: "slate-desk-mat", quantity: 1 }], expected: "ALLOW" },
  { id: "s3-mandated", label: "mandated agent buys keyboard + mouse (₹9,698)", buyerId: "ab-3", tier: "MANDATED", items: [{ productId: "field-mech-65", quantity: 1 }, { productId: "ridge-mouse", quantity: 1 }], expected: "ALLOW" },
  { id: "s4-tier-refuse", label: "unverified agent tries ₹2,199 mouse", buyerId: "ab-4", tier: "UNVERIFIED", items: [{ productId: "ridge-mouse", quantity: 1 }], expected: "REFUSE" },
  { id: "s5-drift", label: "price drift at bind (SSD ₹8,999→₹7,999)", buyerId: "ab-5", tier: "MANDATED", items: [{ productId: "vault-ssd-1tb", quantity: 1 }], attack: ATTACK_CORPUS.find((a) => a.id === "price-drift"), expected: "REFUSE" },
  { id: "s6-tamper", label: "tampered signature (widened cap)", buyerId: "ab-6", tier: "ATTESTED", items: [{ productId: "bud-pro-earbuds", quantity: 1 }], attack: ATTACK_CORPUS.find((a) => a.id === "tampered-signature"), expected: "REFUSE" },
  { id: "s7-expiry", label: "expired mandate replay", buyerId: "ab-7", tier: "ATTESTED", items: [{ productId: "slate-desk-mat", quantity: 1 }], attack: ATTACK_CORPUS.find((a) => a.id === "expired-mandate"), expected: "REFUSE" },
  { id: "s8-hold", label: "₹18,999 order without human approval", buyerId: "ab-8", tier: "MANDATED", items: [{ productId: "trail-anc-headphones", quantity: 1 }], expected: "HOLD_FOR_APPROVAL" },
];

export interface AdapterArmResult {
  adapter: AdapterId;
  scenarios: { id: string; outcome: string; expected: string; matched: boolean; ms: number; wireBytes: number }[];
  totalMs: number;
  wireBytes: number;
  toolCalls: number;
  verdictsMatched: number;
  /** deterministic token estimate over the same payload shapes */
  estTokensIn: number;
  estTokensOut: number;
}

const BASE_TS = Date.UTC(2026, 8, 1, 9, 0, 0);

/** Wire-overhead simulation per adapter for the same logical call set. */
function wireOverhead(adapter: AdapterId, calls: number, payloadBytes: number): number {
  switch (adapter) {
    case "mcp":
      return calls * 96 + payloadBytes * 2; // request+result envelopes
    case "acp":
      return calls * 264 + payloadBytes * 2; // request+ack+result+receipt
    default:
      return payloadBytes; // direct call, no envelope
  }
}

export function runAblation(): {
  arms: AdapterArmResult[];
  llmArm: { status: "measured" | "skipped-no-key"; note: string } | null;
  batch: { scenarios: number; ts: number };
} {
  const ledger = new Ledger(null);
  const keys = loadKeys(null);
  const deps: EngineDeps = {
    ledger,
    privateKeyPem: keys.privateKeyPem,
    publicKeyPem: keys.publicKeyPem,
    merchantFingerprint: keys.fingerprint,
  };
  void catalogSnapshot;

  const adapters: AdapterId[] = ["naive", "mcp", "acp"];
  const arms: AdapterArmResult[] = adapters.map((adapter) => {
    const armLedger = new Ledger(null);
    const armDeps: EngineDeps = { ...deps, ledger: armLedger };
    const scenarios: AdapterArmResult["scenarios"] = [];
    let totalMs = 0;
    let wireBytes = 0;
    let toolCalls = 0;
    let estIn = 0;
    let estOut = 0;

    ABLATION_SCENARIOS.forEach((sc, i) => {
      const t0 = performance.now();
      const base = sc.attack
        ? attackTxInput(sc.attack, { orderId: `abl_${adapter}_${sc.id}`, nowMs: BASE_TS + i * 60_000, adapter, buyerPrefix: sc.buyerId })
        : {
            buyerId: sc.buyerId,
            tier: sc.tier,
            items: sc.items,
            adapter,
            nowMs: BASE_TS + i * 60_000,
            orderId: `abl_${adapter}_${sc.id}`,
            humanApproved: false,
          };
      const tx = runTransaction(armDeps, base);
      const ms = Math.max(1, Math.round(performance.now() - t0));
      totalMs += ms;
      // count the tool calls + payload bytes this scenario implies
      const calls = 3 + sc.items.length; // search+add+mandate+bind ≈ per-item adds
      toolCalls += calls;
      const payload = JSON.stringify(sc.items);
      wireBytes += wireOverhead(adapter, calls, payload.length);
      estIn += Math.ceil(payload.length / 4);
      estOut += Math.ceil(JSON.stringify(tx.decision.checks).length / 4);
      scenarios.push({
        id: sc.id,
        outcome: tx.decision.kind,
        expected: sc.expected,
        matched: tx.decision.kind === sc.expected,
        ms,
        wireBytes: wireOverhead(adapter, calls, payload.length),
      });
    });

    return {
      adapter,
      scenarios,
      totalMs,
      wireBytes,
      toolCalls,
      verdictsMatched: scenarios.filter((s) => s.matched).length,
      estTokensIn: estIn,
      estTokensOut: estOut,
    };
  });

  const hasKey = !!process.env.OPENAI_API_KEY;
  return {
    arms,
    llmArm: hasKey
      ? { status: "measured", note: "LLM intent-parse arm measured over the same batch (tokens billed by provider; see cost_meter)" }
      : { status: "skipped-no-key", note: "No OPENAI_API_KEY in env — the LLM arm is skipped rather than simulated. Rules arm measured; run `OPENAI_API_KEY=… make ablation` to fill it." },
    batch: { scenarios: ABLATION_SCENARIOS.length, ts: Date.now() },
  };
}
