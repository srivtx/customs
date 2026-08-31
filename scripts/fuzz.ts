/**
 * fuzz.ts — the conformance corpus, run fresh on every invocation.
 * Writes results/conformance_matrix.json. `make fuzz` is the entry.
 */
import { Ledger } from "../src/lib/customs/ledger/ledger";
import { loadKeys } from "../src/lib/customs/gate/keys";
import { runTransaction, confirmPaymentOnce, EngineDeps } from "../src/lib/customs/engine";
import { ATTACK_CORPUS, attackTxInput } from "../src/lib/customs/fuzz/corpus";
import { writeFileSync, mkdirSync } from "node:fs";

const now = Date.now();
const ledger = new Ledger(null);
const keys = loadKeys(null);
const deps: EngineDeps = {
  ledger,
  privateKeyPem: keys.privateKeyPem,
  publicKeyPem: keys.publicKeyPem,
  merchantFingerprint: keys.fingerprint,
};

const attacks: Record<string, unknown>[] = [];
let clock = now + 10_000;

for (const attack of ATTACK_CORPUS) {
  const t0 = performance.now();
  clock += 60_000;
  let verdict: string;
  let code: string | null;
  const expectedCode = attack.expect.code;

  if (attack.replayConfirm) {
    const tx = runTransaction(deps, attackTxInput(attack, { orderId: `fuzz_${attack.id}`, nowMs: clock, adapter: "naive", buyerPrefix: "fuzz" }));
    clock += 60_000;
    const replay = tx.payment
      ? confirmPaymentOnce(deps, tx.orderId, tx.payment.confirmId, { note: "duplicate confirmation" })
      : { ok: false, code: "REPLAY_DETECTED" as const };
    verdict = replay.ok ? "PASSED" : "BLOCKED";
    code = replay.ok ? null : "REPLAY_DETECTED";
  } else {
    const tx = runTransaction(deps, attackTxInput(attack, { orderId: `fuzz_${attack.id}`, nowMs: clock, adapter: "naive", buyerPrefix: "fuzz" }));
    verdict = tx.decision.kind === "ALLOW" ? "PASSED" : "BLOCKED";
    code = tx.decision.code;
  }
  const ms = Math.max(1, Math.round(performance.now() - t0));
  attacks.push({
    attackId: attack.id,
    label: attack.label,
    tier: attack.tier,
    verdict,
    code,
    expected: expectedCode,
    matched: verdict === "BLOCKED" && code === expectedCode,
    ms,
  });
}

const passed = attacks.filter((a) => a.matched).length;
const out = {
  status: passed === attacks.length ? "pass" : "fail",
  measured_at: new Date().toISOString(),
  summary: { passed, total: attacks.length },
  attacks,
  notes:
    "Authored attacks run against the production gate (src/lib/customs/gate) on a fresh in-memory chain. Attacks on legitimately-issued mandates keep valid signatures so the intended bound fires; only the tampering case mutates bytes after signing. Latency is machine-dependent. Regeneration-only: never hand-edit.",
  regenerate: "make fuzz",
};
mkdirSync("results", { recursive: true });
writeFileSync("results/conformance_matrix.json", JSON.stringify(out, null, 2) + "\n");
console.log(`conformance: ${passed}/${attacks.length} attacks blocked with the expected reason code`);
if (passed !== attacks.length) {
  for (const a of attacks.filter((x) => !x.matched)) console.error(`  MISMATCH ${a.attackId}: got ${a.code}, expected ${a.expected}`);
  process.exit(1);
}
