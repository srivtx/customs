/**
 * project.ts — the at-scale channel P&L, from measured averages only.
 * Writes results/project.json. `make project` is the entry.
 */
import { Ledger } from "../src/lib/customs/ledger/ledger";
import { loadKeys } from "../src/lib/customs/gate/keys";
import { EngineDeps } from "../src/lib/customs/engine";
import { seedHistory } from "../src/lib/customs/runtime";
import { meterFromEvents, projectAtScale, ASSUMPTIONS } from "../src/lib/customs/meter";
import { writeFileSync, mkdirSync } from "node:fs";

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
const projection = projectAtScale(meter);

const out = {
  status: "measured",
  measured_at: new Date().toISOString(),
  metrics: {
    avgTicketPaise: projection.avgTicketPaise,
    aiCostPerCapturedPaise: meter.aiCostPerCapturedPaise,
    at1MPerMonth: {
      paymentsPerMonth: projection.paymentsPerMonth,
      channelRevenueInr: projection.revenueInrPerMonth,
      aiServingCostInr: projection.aiCostInrPerMonth,
      netInr: projection.netInrPerMonth,
    },
  },
  formula: projection.formula,
  assumptions: {
    ...ASSUMPTIONS,
    notes: [
      "MDR is Razorpay's public list pricing quoted as an assumption — not a negotiated claim.",
      "Model prices are public list prices for a gpt-4o-mini-class model, quoted as an assumption.",
      "avg ticket and ₹/captured-payment are measured from the deterministic seed ledger (make meter).",
      "Every input to this projection regenerates via `make project`; nothing is hand-written.",
    ],
  },
  regenerate: "make project",
};
mkdirSync("results", { recursive: true });
writeFileSync("results/project.json", JSON.stringify(out, null, 2) + "\n");
console.log(`project @ ${projection.paymentsPerMonth.toLocaleString("en-IN")} payments/mo → net ₹${projection.netInrPerMonth.toLocaleString("en-IN")}/mo (formula: ${projection.formula})`);
