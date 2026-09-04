#!/usr/bin/env node
// verify.mjs — repo-evidence checks. Zero deps. This is what CI runs on every push.
// Checks grow stricter as the build progresses; they never loosen.
import { readFileSync, existsSync, readdirSync } from "node:fs";
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

// 1. required files exist (the product + the proof layer)
const REQUIRED = [
  "README.md", "JUDGE.md", "PAPER.md", "LICENSE", "llms.txt", "AGENTS.md", "ARCHITECTURE.md",
  "ENGINEERING_LOG.md", "VIDEO_TRANSCRIPT.md", "CLEANUP.md", "DEPLOY.md",
  "Makefile", ".env.example", ".github/workflows/verify.yml",
  "scripts/verify.mjs", "scripts/triage.mjs", "scripts/spike-d1-1.mjs",
  "scripts/fuzz.ts", "scripts/ablation.ts", "scripts/meter.ts",
  "scripts/project.ts", "scripts/audit.ts", "scripts/ledger-fork.ts",
  "scripts/agent-kit-demo.ts", "AGENT_KIT.md",
  "src/app/page.tsx", "src/app/layout.tsx", "src/app/icon.svg",
  "src/app/api/chat/route.ts", "src/app/api/state/route.ts",
  "src/app/api/agent/kit/route.ts", "src/app/api/mcp/route.ts",
  "src/app/api/acp/agents/route.ts", "src/app/api/acp/sessions/route.ts",
  "src/app/api/acp/sessions/[id]/route.ts",
  "src/app/api/decision/route.ts", "src/app/api/fuzz/route.ts",
  "src/app/api/hook/webhook/route.ts", "src/app/api/health/route.ts",
  "src/lib/customs/gate/types.ts", "src/lib/customs/gate/canonical.ts",
  "src/lib/customs/gate/mandate.ts", "src/lib/customs/gate/decide.ts",
  "src/lib/customs/ledger/ledger.ts", "src/lib/customs/ledger/chain.ts",
  "src/lib/customs/engine.ts", "src/lib/customs/runtime.ts",
  "src/lib/customs/agent/loop.ts", "src/lib/customs/agent/nlu.ts",
  "src/lib/customs/adapters/index.ts", "src/lib/customs/fuzz/corpus.ts",
  "src/lib/customs/meter.ts", "src/lib/customs/store/catalog.ts",
  "src/components/customs/shell.tsx", "src/components/customs/playground.tsx",
  "src/components/customs/control-room.tsx", "src/components/customs/landing.tsx",
  "src/components/customs/why.tsx", "src/components/customs/paper.tsx",
  "src/components/customs/agent-kit.tsx",
  "src/components/customs/music-ghost.tsx",
  "src/lib/customs/music/brain.ts", "src/lib/customs/music/youtube.ts",
  "src/lib/customs/music/store.ts",
  "src/components/customs/bits.tsx", "src/components/customs/chat-events.tsx",
  "src/components/customs/demo-player.tsx",
  "src/components/customs/theme.tsx",
  "src/components/customs/hero-bot.tsx",
  "src/components/customs/footer.tsx", "docs/FORM_ANSWERS.md", "docs/demo.gif",
  "public/logo.svg", "public/wordmark-light.svg", "public/wordmark-dark.svg",
  "public/og.png",
  "public/og-card.png",
];
for (const f of REQUIRED) ok(`file: ${f}`, existsSync(join(ROOT, f)));

// 2. results/*.json parse and carry a status
const resultsDir = join(ROOT, "results");
const results = {};
for (const f of readdirSync(resultsDir).filter((x) => x.endsWith(".json"))) {
  const p = join(resultsDir, f);
  let data = null;
  try { data = JSON.parse(readFileSync(p, "utf8")); } catch {}
  ok(`results/${f} parses as JSON`, !!data);
  if (data) {
    ok(`results/${f} carries "status"`, typeof data.status === "string", `status=${data.status}`);
    results[f.replace(".json", "")] = data;
  }
}

// 3. measured result families must have substance (never a bare status)
const conformance = results["conformance_matrix"];
ok("conformance matrix reports all attacks blocked", !!conformance?.summary && conformance.summary.passed === conformance.summary.total,
  conformance?.summary ? `${conformance.summary.passed}/${conformance.summary.total}` : "missing");
const costMeter = results["cost_meter"];
ok("cost meter carries metrics", !!costMeter?.metrics && Object.keys(costMeter.metrics).length >= 8,
  costMeter?.metrics ? `${Object.keys(costMeter.metrics).length} metrics` : "missing");
const audit = results["audit_chain"];
ok("audit chain verdict is pass (walk ok + tamper detected)", audit?.status === "pass" && audit?.metrics?.tamperDetected === true);
const ablation = results["ablation"];
ok("ablation reports three protocol arms", Array.isArray(ablation?.arms) && ablation.arms.length === 3);
const project = results["project"];
ok("projection declares its formula + assumptions", !!project?.formula && !!project?.assumptions);

// 3b. the at-1M net figure must match project.json everywhere it is stated —
// catches hand-typed ₹ drift (the class of bug where JUDGE.md said 1,06,19,000
// for a 10,61,90,000 projection: right digits, one zero short).
const fmtINR = (n) => {
  const s = String(Math.round(Math.abs(n)));
  if (s.length <= 3) return s;
  return s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + s.slice(-3);
};
const net = project?.metrics?.at1MPerMonth?.netInr;
const netStr = `₹${fmtINR(net)}`;
const wrongStr = `₹${fmtINR(net / 10)}`;
for (const f of ["JUDGE.md", "README.md", "docs/FORM_ANSWERS.md"]) {
  const txt = readFileSync(join(ROOT, f), "utf8");
  ok(`${f} states the at-1M net as ${netStr} (regenerated, not hand-typed)`, txt.includes(netStr));
  if (txt.includes(wrongStr))
    ok(`${f} states the at-1M net as ${netStr} (regenerated, not hand-typed)`, false,
      `found the off-by-10 figure ${wrongStr}`);
}

// 4. JUDGE.md: every results/ reference must exist; no pending metric rows remain
const judge = readFileSync(join(ROOT, "JUDGE.md"), "utf8");
const refd = [...judge.matchAll(/results\/([a-z_]+)\.json/g)].map((m) => m[1]);
for (const key of new Set(refd)) {
  ok(`JUDGE.md ↔ results/${key}.json exists`, !!results[key]);
}
const judgeTableRows = judge
  .split("\n")
  .filter((l) => l.startsWith("|") && l.includes("PENDING"));
ok(
  "JUDGE.md has no PENDING metric rows (deployment URL excepted)",
  judgeTableRows.length === 0 || judgeTableRows.every((l) => l.toLowerCase().includes("deployment") || l.toLowerCase().includes("url")),
  judgeTableRows.length ? judgeTableRows[0].slice(0, 60) : "clean"
);

// 5. URL discipline: every external URL in judge-facing files is allowlisted
const URL_ALLOW = [
  /^https:\/\/github\.com\/srivtx\//,
  /^https:\/\/customs\.srivtx\.xyz\/?$/,
  /^https:\/\/customs-phi\.vercel\.app\/?$/,
  /^https:\/\/github\.com\/HRaj07\/eacp$/,
  /^https:\/\/(www\.)?razorpay\.com\/docs\//,
  /^https:\/\/(www\.)?razorpay\.com\/buildathon\/?$/,
  /^https:\/\/img\.shields\.io\/badge\//, // README badges only — static, no tracking
  /^https:\/\/img\.shields\.io\/-/,
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/, // local dev instructions only
];
const META_FILES = ["README.md", "JUDGE.md", "PAPER.md", "llms.txt", "AGENTS.md",
  "ARCHITECTURE.md", "ENGINEERING_LOG.md", "VIDEO_TRANSCRIPT.md"];
const urlRe = /https?:\/\/[^\s)\]"<>]+/g;
let urlCount = 0;
for (const f of META_FILES) {
  const text = readFileSync(join(ROOT, f), "utf8");
  for (const url of text.match(urlRe) || []) {
    urlCount++;
    const clean = url.replace(/[.,)\]*:]+$/, "");
    const allowed = URL_ALLOW.some((re) => re.test(clean));
    ok(`url allowed (${f}): ${clean}`, allowed);
  }
}
ok(`url discipline scanned (${urlCount} urls across meta files)`, true);

// 6. README file map matches the actual tree
const readme = readFileSync(join(ROOT, "README.md"), "utf8");
const fm = readme.match(/<!-- FILEMAP:START -->([\s\S]*?)<!-- FILEMAP:END -->/);
ok("README has a FILEMAP block", !!fm);
if (fm) {
  const paths = [...fm[1].matchAll(/\|\s*`([^`]+)`\s*\|/g)].map((m) => m[1]);
  ok("filemap is non-trivial", paths.length >= 12, `${paths.length} paths`);
  for (const p of paths) {
    ok(`filemap path exists: ${p}`, existsSync(join(ROOT, p)));
  }
}

// 7. Makefile exposes the full target contract
const mk = readFileSync(join(ROOT, "Makefile"), "utf8");
const targets = [...mk.matchAll(/^([a-z0-9_-]+):/gm)].map((m) => m[1]);
for (const t of ["verify", "triage", "demo", "meter", "ablation", "fuzz", "project", "audit", "spike-d1-1", "test", "all"]) {
  ok(`make target: ${t}`, targets.includes(t));
}

// 8. package sanity: identity + the pruned manifest
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
ok("package identity is customs", pkg.name === "customs");
const PRUNED = ["prisma", "@prisma/client", "next-auth", "next-intl", "recharts", "sharp", "zod", "uuid"];
for (const dep of PRUNED) {
  ok(`manifest is pruned: ${dep} absent`, !(pkg.dependencies ?? {})[dep] && !(pkg.devDependencies ?? {})[dep]);
}

console.log("");
if (failures.length) {
  console.error(`FAILED (${failures.length}):`);
  failures.forEach((f) => console.error("  - " + f));
  process.exit(1);
}
console.log("all evidence checks green.");
