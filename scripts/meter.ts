/**
 * meter.ts — the cost meter over a deterministic 48h batch.
 * Writes results/cost_meter.json. `make meter` is the entry.
 */
import { Ledger } from "../src/lib/customs/ledger/ledger";
import { loadKeys } from "../src/lib/customs/gate/keys";
import { EngineDeps } from "../src/lib/customs/engine";
import { seedHistory } from "../src/lib/customs/runtime";
import { meterFromEvents, projectAtScale } from "../src/lib/customs/meter";
import { runAblation } from "../src/lib/customs/ablation/scenarios";
import { writeFileSync, mkdirSync } from "node:fs";

// 1. deterministic 48h ledger (the same one the app seeds on boot)
const ledger = new Ledger(null);
const keys = loadKeys(null);
const deps: EngineDeps = {
  ledger,
  privateKeyPem: keys.privateKeyPem,
  publicKeyPem: keys.publicKeyPem,
  merchantFingerprint: keys.fingerprint,
};
seedHistory(deps);
const meter = meterFromEvents(ledger.all());

// 2. gate decision latency over the ablation batch (fresh run, spans measured)
const abl = runAblation();
const decisionMs = abl.arms
  .flatMap((a) => a.scenarios.map((s) => s.ms))
  .sort((x, y) => x - y);
const pick = (q: number) => decisionMs[Math.min(decisionMs.length - 1, Math.floor(q * decisionMs.length))] ?? 0;

const projection = projectAtScale(meter);
const out = {
  status: "measured",
  measured_at: new Date().toISOString(),
  metrics: {
    gmvPaise: meter.gmvPaise,
    capturedCount: meter.capturedCount,
    refusedCount: meter.refusedCount,
    attackCount: meter.attackCount,
    refusalRate: Number(meter.refusalRate.toFixed(4)),
    tokensIn: meter.tokensIn,
    tokensOut: meter.tokensOut,
    aiCostPaise: meter.aiCostPaise,
    aiCostPerCapturedPaise: meter.aiCostPerCapturedPaise,
    channelRevenuePaise: meter.channelRevenuePaise,
    netPaise: meter.netPaise,
    p50DecisionMs: pick(0.5),
    p99DecisionMs: pick(0.99),
  },
  assumptions: meter.assumptions,
  projection: {
    paymentsPerMonth: projection.paymentsPerMonth,
    avgTicketPaise: projection.avgTicketPaise,
    revenueInrPerMonth: projection.revenueInrPerMonth,
    aiCostInrPerMonth: projection.aiCostInrPerMonth,
    netInrPerMonth: projection.netInrPerMonth,
    formula: projection.formula,
  },
  notes:
    "Meter over the deterministic 48h seed ledger (the same history the live app boots with). Token counts are deterministic estimates for the rules brain (chars/4); with AGENT_BRAIN=llm the live app meters real provider tokens instead. Latency is machine-dependent. MDR and model prices are labeled assumptions, not claims.",
  regenerate: "make meter",
};
mkdirSync("results", { recursive: true });
writeFileSync("results/cost_meter.json", JSON.stringify(out, null, 2) + "\n");
console.log(`meter: GMV ₹${(meter.gmvPaise / 100).toLocaleString("en-IN")} · captured ${meter.capturedCount} · refused ${meter.refusedCount} · AI cost ₹${(meter.aiCostPaise / 100).toFixed(2)} · net ₹${(meter.netPaise / 100).toFixed(2)}`);
console.log(`projection @1M/mo: revenue ₹${projection.revenueInrPerMonth.toLocaleString("en-IN")} · AI ₹${projection.aiCostInrPerMonth.toLocaleString("en-IN")} · net ₹${projection.netInrPerMonth.toLocaleString("en-IN")}`);
