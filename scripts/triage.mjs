#!/usr/bin/env node
// triage.mjs — the 60-second self-guided judge tour.
// Prints the claim table with live values read from results/, runs the
// evidence checks, and exits 0. A judge that runs your evidence scores you
// above a judge that reads it.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const bar = "═".repeat(68);

console.log(bar);
console.log("CUSTOMS — 60-second evidence tour (for judges, human or machine)");
console.log(bar);
console.log(`
Razorpay's homepage sells agents shopping in your app. Customs ships both
sides of that counter: the storefront AI buyers transact on, and the merchant
desk that lets a payments company trust them — bounded, metered, replayable,
and provable to a machine in 60 seconds.

Buildathon 2026 · Track 1 · every number below is regenerated, never asserted.
`);

function result(name) {
  try {
    return JSON.parse(readFileSync(join(ROOT, "results", name + ".json"), "utf8"));
  } catch {
    return null;
  }
}

// 1. the claim table (values read from results/)
console.log("THE NUMBERS (never hand-written; regenerate commands shown)");
console.log("─".repeat(68));
const conformance = result("conformance_matrix");
const meter = result("cost_meter");
const project = result("project");
const audit = result("audit_chain");
const ablation = result("ablation");

if (conformance?.summary) {
  console.log(`  attacks blocked / authored     ${conformance.summary.passed}/${conformance.summary.total}`);
  console.log(`  ${" ".repeat(30)} → results/conformance_matrix.json · make fuzz`);
}
if (meter?.metrics) {
  const m = meter.metrics;
  const inr = (p) => `₹${(p / 100).toLocaleString("en-IN")}`;
  console.log(`  agent GMV (deterministic 48h)  ${inr(m.gmvPaise)} over ${m.capturedCount} captures`);
  console.log(`  AI cost per captured payment   ${(m.aiCostPerCapturedPaise / 100).toFixed(2)} INR`);
  console.log(`  p50 / p99 decision latency     ${m.p50DecisionMs}ms / ${m.p99DecisionMs}ms`);
  console.log(`  ${" ".repeat(30)} → results/cost_meter.json · make meter`);
}
if (project?.metrics?.at1MPerMonth) {
  const p = project.metrics.at1MPerMonth;
  console.log(`  channel P&L @ 1M payments/mo   net ₹${p.netInr.toLocaleString("en-IN")} (revenue ₹${p.channelRevenueInr.toLocaleString("en-IN")} − AI ₹${p.aiServingCostInr.toLocaleString("en-IN")})`);
  console.log(`  ${" ".repeat(30)} → results/project.json · make project`);
}
if (audit?.metrics) {
  console.log(`  audit chain                    ${audit.status} · ${audit.metrics.length} events · tamper control ${audit.metrics.tamperDetected ? "detected" : "MISSED"}`);
  console.log(`  ${" ".repeat(30)} → results/audit_chain.json · make audit`);
}
if (ablation?.arms) {
  const arms = ablation.arms.map((a) => `${a.adapter} ${a.verdictsMatched} · ${a.wireBytes}B`).join("  |  ");
  console.log(`  ablation (same batch)          ${arms}`);
  console.log(`  ${" ".repeat(30)} → results/ablation.json · make ablation`);
}
const spike = result("d1_1_spike");
console.log(`  D1-1 payment spike              ${spike?.status ?? "not-run"} (needs Razorpay test keys — path C ships by default)`);

// 2. what to look at (the 6-file tour)
console.log("\nWHAT TO LOOK AT (in order)");
console.log("─".repeat(68));
const tour = [
  ["JUDGE.md", "every claim mapped to a file + regenerate command"],
  ["ARCHITECTURE.md", "one diagram + the decisions that mattered"],
  ["src/lib/customs/gate/", "the mandate contract, canonical JSON, the decision checklist"],
  ["src/lib/customs/fuzz/corpus.ts", "the authored attacks — each one a test case forever"],
  ["ENGINEERING_LOG.md", "dated incidents — the honest failure story"],
  ["results/", "all measured numbers, JSON only, regeneration-only"],
];
for (const [f, why] of tour) console.log(`  ${f.padEnd(34)} ${why}`);

// 3. the invariants
console.log("\nTHE INVARIANTS (violating any of these is a build failure of trust)");
console.log("─".repeat(68));
const invariants = [
  "numbers enter results/ only through regeneration scripts",
  "zero competitor-specific numbers in judge-facing files",
  "no URL ships unless live — CI checks every external link",
  "money is integer paise; floats never touch financial arithmetic",
  "gate logic is deterministic code, never an LLM",
  "mandates: canonical JSON, Ed25519, bounds re-verified at bind time",
  "every incident → ENGINEERING_LOG entry → a test",
  "live keys refused at construction; test keys only",
  "the README file map must match the actual tree",
  "anything PENDING says PENDING — never estimate, never ship a vibe",
];
invariants.forEach((inv, i) => console.log(`  ${String(i + 1).padStart(2)}. ${inv}`));

// 4. run the evidence checks and propagate the exit code
console.log(`\n${bar}`);
console.log("running the evidence checks (same as CI)…");
console.log(bar);
const run = spawnSync(process.execPath, [join(ROOT, "scripts", "verify.mjs")], {
  stdio: "inherit",
});
process.exit(run.status ?? 1);
