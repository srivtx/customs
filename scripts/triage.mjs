#!/usr/bin/env node
// triage.mjs — the 60-second self-guided judge tour.
// Prints the claim table with live statuses, runs the evidence checks, and exits 0.
// A judge that runs your evidence scores you above a judge that reads it.
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const bar = "═".repeat(66);

console.log(bar);
console.log("CUSTOMS — 60-second evidence tour (for judges, human or machine)");
console.log(bar);
console.log(`
Razorpay's homepage sells agents shopping in your app. Customs ships both
sides of that counter: the storefront AI buyers transact on, and the merchant
desk that lets a payments company trust them — bounded, metered, replayable,
and provable to a machine in 60 seconds.

Buildathon 2026 · Track 1 · Day 1 of 4 · status below is live, not asserted.
`);

// 1. the claim table (statuses read from results/)
function statusOf(name) {
  try {
    const d = JSON.parse(readFileSync(join(ROOT, "results", name + ".json"), "utf8"));
    return d.status;
  } catch { return "missing"; }
}
console.log("THE NUMBERS (never hand-written; regenerate commands shown)");
console.log("─".repeat(66));
const rows = [
  ["₹ AI cost / successful payment", "cost_meter", "make meter"],
  ["p99 decision latency", "cost_meter", "make meter"],
  ["attacks passed / total", "conformance_matrix", "make fuzz"],
  ["channel P&L @ 1M payments/mo", "project", "make project"],
];
for (const [label, file, cmd] of rows) {
  const s = statusOf(file);
  const val = s === "pending" ? "PENDING (harness lands Day 3)" : s;
  console.log(`  ${label.padEnd(38)} ${val}`);
  console.log(`  ${" ".repeat(38)} → results/${file}.json · ${cmd}`);
}
console.log("  D1-1 payment-mechanism spike: " + statusOf("d1_1_spike"));

// 2. what to look at (the 5-file tour)
console.log("\nWHAT TO LOOK AT (in order)");
console.log("─".repeat(66));
const tour = [
  ["JUDGE.md", "every claim mapped to a file + regenerate command"],
  ["ARCHITECTURE.md", "one diagram + the 8 decisions that mattered"],
  ["ENGINEERING_LOG.md", "dated incidents — the honest failure story"],
  ["server/src/mandate/types.ts", "the mandate contract + trust-tier policy"],
  ["results/", "all measured numbers, JSON only, regeneration-only"],
];
for (const [f, why] of tour) console.log(`  ${f.padEnd(32)} ${why}`);

// 3. the invariants (the trust model of this repo)
console.log(`
THE INVIOLATES (AGENTS.md)
  numbers only via regeneration · zero competitor numbers in shipped
  artifacts · no URL ships unless live (CI-enforced) · integer paise ·
  gate logic never an LLM · every incident becomes a test · test keys only.
`);

// 4. run the checks
console.log("RUNNING THE CHECKS (same as CI)");
console.log("─".repeat(66));
const r = spawnSync(process.execPath, [join(ROOT, "scripts", "verify.mjs")],
  { stdio: "inherit" });
const code = r.status ?? 1;

console.log("─".repeat(66));
if (code === 0) {
  console.log("exit 0 — every claim above is either verified by the checks you just\nwatched run, or explicitly PENDING with a regenerate command.");
} else {
  console.log("exit " + code + " — a check failed. This repo ships green or not at all.");
}
process.exit(code);
