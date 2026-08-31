/**
 * ablation.ts — same batch, three protocol adapters (+ optional LLM arm).
 * Writes results/ablation.json. `make ablation` is the entry.
 */
import { runAblation, ABLATION_SCENARIOS } from "../src/lib/customs/ablation/scenarios";
import { writeFileSync, mkdirSync } from "node:fs";

const run = runAblation();
const out = {
  status: "measured",
  measured_at: new Date().toISOString(),
  arms: run.arms.map((arm) => ({
    adapter: arm.adapter,
    verdictsMatched: `${arm.verdictsMatched}/${arm.scenarios.length}`,
    totalMs: arm.totalMs,
    toolCalls: arm.toolCalls,
    wireBytes: arm.wireBytes,
    estTokensIn: arm.estTokensIn,
    estTokensOut: arm.estTokensOut,
    scenarios: arm.scenarios,
  })),
  llmArm: run.llmArm,
  batch: run.batch,
  notes:
    "Same shopping batch through naive / MCP-style / ACP-style transports over identical tool implementations. Wire bytes are deterministic envelope sizes; latency is machine-dependent; token counts are deterministic estimates (chars/4) over identical payload shapes. The LLM arm requires OPENAI_API_KEY — it is skipped, never simulated, when absent.",
  regenerate: "make ablation",
};
mkdirSync("results", { recursive: true });
writeFileSync("results/ablation.json", JSON.stringify(out, null, 2) + "\n");
for (const arm of out.arms) {
  console.log(`${arm.adapter.padEnd(6)} verdicts ${arm.verdictsMatched}  wire ${arm.wireBytes}B  estTokens ${arm.estTokensIn + arm.estTokensOut}`);
}
const failed = run.arms.some((a) => a.verdictsMatched !== a.scenarios.length) || run.arms.some((a) => a.scenarios.some((s) => !s.matched));
void ABLATION_SCENARIOS;
process.exit(failed ? 1 : 0);
