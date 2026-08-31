import { NextResponse } from "next/server";
import { getRuntime } from "@/lib/customs/runtime";
import { runTransaction, confirmPaymentOnce } from "@/lib/customs/engine";
import { Ledger } from "@/lib/customs/ledger/ledger";
import { ATTACK_CORPUS, attackTxInput } from "@/lib/customs/fuzz/corpus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Live corpus run ("attack me"): the same authored attacks `make fuzz` uses,
 *  fired against the running gate and logged into the live ledger. */
export async function POST() {
  const rt = getRuntime();
  const scratch = new Ledger(null); // verdicts measured on a scratch chain
  const scratchDeps = () => ({ ...rt.deps, ledger: scratch });
  const verdicts: {
    attackId: string;
    label: string;
    verdict: string;
    code: string | null;
    expected: string;
    matched: boolean;
    ms: number;
  }[] = [];

  let clock = Date.now() + 10_000;
  for (const attack of ATTACK_CORPUS) {
    const t0 = performance.now();
    clock += 60_000;
    let outcome: string;
    let code: string | null;

    if (attack.replayConfirm) {
      const tx = runTransaction(scratchDeps(), attackTxInput(attack, { orderId: `fuzz_${attack.id}`, nowMs: clock, adapter: "naive", buyerPrefix: "fuzz" }));
      clock += 60_000;
      const replay = tx.payment
        ? confirmPaymentOnce(scratchDeps(), tx.orderId, tx.payment.confirmId, { note: "replay" })
        : { ok: false, code: "REPLAY_DETECTED" as const };
      outcome = replay.ok ? "PASSED" : "BLOCKED";
      code = replay.ok ? null : "REPLAY_DETECTED";
    } else {
      const tx = runTransaction(scratchDeps(), attackTxInput(attack, { orderId: `fuzz_${attack.id}`, nowMs: clock, adapter: "naive", buyerPrefix: "fuzz" }));
      outcome = tx.decision.kind === "ALLOW" ? "PASSED" : "BLOCKED";
      code = tx.decision.code;
    }
    const matched = outcome === "BLOCKED" && code === attack.expect.code;
    verdicts.push({ attackId: attack.id, label: attack.label, verdict: outcome, code, expected: attack.expect.code, matched, ms: Math.max(1, Math.round(performance.now() - t0)) });
    rt.ledger.append("attack.blocked", {
      attackId: attack.id,
      label: attack.label,
      verdict: outcome,
      code,
      expected: attack.expect.code,
      matched,
      live: true,
      corpusRun: true,
    });
  }

  const passed = verdicts.filter((v) => v.matched).length;
  return NextResponse.json({ ok: true, passed, total: verdicts.length, verdicts });
}
