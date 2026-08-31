#!/usr/bin/env node
// verify.mjs — repo-evidence checks. Zero deps. This is what CI runs on every push.
// Checks grow stricter as the build progresses; they never loosen.
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function ok(name, cond, detail = "") {
  const line = `${cond ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`;
  console.log(line);
  if (!cond) failures.push(name);
}

console.log("customs :: verify — evidence checks (CI entry)\n");

// 1. required files exist
const REQUIRED = [
  "README.md", "JUDGE.md", "llms.txt", "AGENTS.md", "ARCHITECTURE.md",
  "ENGINEERING_LOG.md", "VIDEO_TRANSCRIPT.md", "Makefile",
  ".github/workflows/verify.yml",
  "scripts/verify.mjs", "scripts/triage.mjs",
  "server/src/mandate/types.ts", "server/src/index.ts",
  "apps/storefront/README.md", "apps/merchant/README.md",
];
for (const f of REQUIRED) ok(`file: ${f}`, existsSync(join(ROOT, f)));

// 2. results/*.json parse, carry a status, and PENDING prose matches PENDING status
const resultsDir = join(ROOT, "results");
const results = {};
for (const f of readdirSync(resultsDir).filter(x => x.endsWith(".json"))) {
  const p = join(resultsDir, f);
  let data = null;
  try { data = JSON.parse(readFileSync(p, "utf8")); } catch {}
  ok(`results/${f} parses as JSON`, !!data);
  if (data) {
    ok(`results/${f} carries "status"`, typeof data.status === "string", `status=${data.status}`);
    results[f.replace(".json", "")] = data;
  }
}

// 3. JUDGE.md numbers table: any PENDING claim must correspond to a pending result
const judge = readFileSync(join(ROOT, "JUDGE.md"), "utf8");
const pendingClaims = [...judge.matchAll(/\|\s*`results\/([a-z_]+)\.json`\s*\|/g)].map(m => m[1]);
for (const key of new Set(pendingClaims)) {
  const claimedPending = judge.includes(`results/${key}.json`) && judge.includes("PENDING");
  ok(`JUDGE.md ↔ results/${key}.json consistency`,
    !(claimedPending) || (results[key] && results[key].status === "pending"),
    results[key] ? `status=${results[key].status}` : "missing");
}

// 4. URL discipline: every external URL in meta files is allowlisted (no dead/placeholder links, ever)
const URL_ALLOW = [
  /^https:\/\/github\.com\/srivtx\//,
  /^https:\/\/github\.com\/HRaj07\/eacp$/,
  /^https:\/\/(www\.)?razorpay\.com\/docs\//,
];
const META_FILES = ["README.md", "JUDGE.md", "llms.txt", "AGENTS.md",
  "ARCHITECTURE.md", "ENGINEERING_LOG.md", "VIDEO_TRANSCRIPT.md"];
const urlRe = /https?:\/\/[^\s)\]"<>]+/g;
let urlCount = 0;
for (const f of META_FILES) {
  const text = readFileSync(join(ROOT, f), "utf8");
  for (const url of text.match(urlRe) || []) {
    urlCount++;
    const clean = url.replace(/[.,]$/, "");
    const allowed = URL_ALLOW.some(re => re.test(clean));
    ok(`url allowed (${f}): ${clean}`, allowed);
  }
}
ok(`url discipline scanned (${urlCount} urls across meta files)`, true);

// 5. README file map matches the actual tree
const readme = readFileSync(join(ROOT, "README.md"), "utf8");
const fm = readme.match(/<!-- FILEMAP:START -->([\s\S]*?)<!-- FILEMAP:END -->/);
ok("README has a FILEMAP block", !!fm);
if (fm) {
  const paths = [...fm[1].matchAll(/\|\s*`([^`]+)`\s*\|/g)].map(m => m[1]);
  for (const p of paths) {
    ok(`filemap path exists: ${p}`, existsSync(join(ROOT, p)));
  }
}

// 6. Makefile exposes the full target contract
const mk = readFileSync(join(ROOT, "Makefile"), "utf8");
const targets = [...mk.matchAll(/^([a-z0-9_-]+):/gm)].map(m => m[1]);
for (const t of ["verify", "triage", "demo", "meter", "ablation", "fuzz", "project", "spike-d1-1", "test"]) {
  ok(`make target: ${t}`, targets.includes(t));
}

// 7. no fabricated-number smell in results while pending
for (const [name, data] of Object.entries(results)) {
  if (data.status === "pending") {
    const hasMetrics = data.metrics && Object.keys(data.metrics).length > 0;
    ok(`results/${name}.json: no hand-written metrics while pending`, !hasMetrics);
  }
}

console.log("");
if (failures.length) {
  console.error(`FAILED (${failures.length}):`);
  failures.forEach(f => console.error("  - " + f));
  process.exit(1);
}
console.log("all evidence checks green.");
