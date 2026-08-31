#!/usr/bin/env node
// spike-d1-1.mjs — the payment-mechanism spike (ENGINEERING_LOG entry "D1-1").
//
// Question: can an agent complete payment on Razorpay test-mode, end to end, without a
// human at a checkout page — and which mechanism ships?
//   (A) tokenized test-mode charge      — the true agent payment
//   (B) hosted-checkout completion      — agent drives the hosted page (Playwright, later)
//   (C) labeled simulation              — never silent
//
// Also resolves the Payment Link test-mode cap scope (docs: 30/business — total? active?).
//
// Requires: RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET (test keys only — live keys refused).
// Writes: results/d1_1_spike.json  Prints: verdict + a suggested ENGINEERING_LOG entry.
// Secrets are never printed or written. Test-mode only.

import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.razorpay.com/v1";
const KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const LINK_MAX = parseInt(process.env.SPIKE_LINK_MAX || "35", 10);
const TEST_CARD = { number: "4111111111111111", exp_month: 12, exp_year: 2028, cvv: "123" };

const out = {
  status: "not-run",
  started_at: null,
  key: null, // prefix only, redacted
  steps: {},
  verdict: null,
};

function fail(msg) { console.error("SPIKE ABORT: " + msg); process.exit(1); }

if (!KEY_ID || !KEY_SECRET) {
  out.status = "blocked-no-keys";
  out.started_at = new Date().toISOString();
  out.notes = "Spike code shipped and ready; awaiting rzp_test_* keys from the operator. Until then the app runs the labeled simulation rail (path C). Set the keys and re-run `make spike-d1-1` to execute paths A/B and flip the live rail.";
  try {
    writeFileSync(join(ROOT, "results", "d1_1_spike.json"), JSON.stringify(out, null, 2) + "\n");
  } catch {}
  fail("set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET (test keys). Get them from dashboard > settings > API keys, test mode.");
}
if (KEY_ID.startsWith("rzp_live")) fail("LIVE KEY REFUSED. Test keys only (AGENTS.md invariant 8).");
if (!KEY_ID.startsWith("rzp_test")) fail("key does not look like a test key (rzp_test_...).");

const auth = "Basic " + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");

async function rq(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { "Authorization": auth, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null, text = "";
  try { text = await res.text(); json = JSON.parse(text); } catch { json = null; }
  return { status: res.status, ok: res.ok, json, text: text.slice(0, 400) };
}

const log = (s, msg) => console.log(`  [${s}] ${msg}`);

// ---------- run ----------
out.status = "run";
out.started_at = new Date().toISOString();
out.key = KEY_ID.slice(0, 12) + "…(redacted)";
console.log("D1-1 payment-mechanism spike — test mode, no real money\n");

// Step 0: identity of the account (business id for cap scoping)
const acc = await rq("GET", "/users/me"); // may 404 on this key class — informational
out.steps.account = { status: acc.status };
log(acc.status, `account lookup ${acc.ok ? "ok" : "not available for this key class"}`);

// Step 1: ORDERS — can we create orders programmatically? (Path B/C substrate)
const order = await rq("POST", "/orders", { amount: 10000, currency: "INR", receipt: `spike-d1-1-${Date.now()}` });
out.steps.order_create = { status: order.status, id: order.json?.id || null };
log(order.status, `order create ${order.json?.id || order.text}`);

// Step 2: PAYMENT LINKS — how many exist?
const linksList = await rq("GET", "/payment_links?count=100");
const existing = Array.isArray(linksList.json?.items) ? linksList.json.items.length : null;
out.steps.links_existing = { status: linksList.status, count: existing };
log(linksList.status, `existing payment links visible: ${existing ?? "n/a"}`);

// Step 3: LINK CAP DISCOVERY — create until refusal or LINK_MAX
console.log(`  link cap discovery: creating up to ${LINK_MAX} links (override with SPIKE_LINK_MAX)…`);
let created = 0, capHit = null;
for (let i = 1; i <= LINK_MAX; i++) {
  const r = await rq("POST", "/payment_links", {
    amount: 9900, currency: "INR",
    description: `customs d1-1 spike link ${i}`,
    reference_id: `customs-spike-${i}`,
  });
  if (r.ok) { created++; if (i <= 3 || i % 10 === 0) log(r.status, `link ${i} created ${r.json?.id}`); }
  else {
    capHit = { index: i, status: r.status, error: r.json?.error || r.text };
    log(r.status, `link ${i} REFUSED — ${JSON.stringify(r.json?.error?.description || r.text).slice(0, 200)}`);
    break;
  }
}
out.steps.links_created = created;
out.steps.links_cap_hit = capHit;

// Step 4: TOKENIZED CHARGE (Path A) — token + payment, all programmatic
console.log("  path A: tokenized charge attempts…");
const cust = await rq("POST", "/customers", {
  name: "Customs Spike Buyer", email: "spike@customs.test", contact: "9000000001",
});
out.steps.customer_create = { status: cust.status, id: cust.json?.id || null };
log(cust.status, `customer create ${cust.json?.id || cust.text}`);

const tokenBody = { type: "card", card: TEST_CARD, ...(cust.json?.id ? { customer_id: cust.json.id } : {}) };
const tok1 = await rq("POST", "/tokens", tokenBody);
out.steps.token_attempt = { status: tok1.status, id: tok1.json?.id || null, error: tok1.json?.error?.description || null };
log(tok1.status, `token create ${tok1.json?.id || "— " + (tok1.json?.error?.description || tok1.text)}`);

if (tok1.ok && tok1.json?.id) {
  const pay = await rq("POST", "/payments", {
    amount: 10000, currency: "INR",
    token_id: tok1.json.id,
    customer_id: cust.json?.id,
    description: "customs d1-1 spike charge",
  });
  out.steps.token_charge = { status: pay.status, id: pay.json?.id || null };
  log(pay.status, `token charge ${pay.json?.id || pay.text}`);
}

// ---------- verdict ----------
const linksCapped = !!capHit && /limit|exceed|quota|maximum/i.test(JSON.stringify(capHit.error || ""));
out.verdict = {
  orders_api: order.ok ? "works" : "blocked",
  payment_link_cap: capHit
    ? { hit_at: capHit.index, capped: linksCapped, scope_note: existing != null ? `existed before spike: ${existing}` : "n/a" }
    : { hit_at: null, capped: false, note: `no refusal within ${LINK_MAX} — cap may be higher or scoped differently` },
  mechanism_A: out.steps.token_charge?.id ? "PROGRAMMATIC CHARGE CONFIRMED" :
    (tok1.ok ? "token created, charge failed — investigate response" : "not available server-side"),
  mechanism_B: "hosted-checkout completion — wire Playwright next (this spike's orders API works as substrate)",
  mechanism_C: "labeled simulation — always available, always labeled",
};
out.suggested_log_entry = [
  "## 2026-09-01 — D1-1 result (auto-suggested; paste/adjust in ENGINEERING_LOG.md)",
  `- Orders API: ${out.verdict.orders_api}`,
  `- Link cap: ${JSON.stringify(out.verdict.payment_link_cap)}`,
  `- Path A (tokenized): ${out.verdict.mechanism_A}`,
  `- Path B substrate: order create ${out.steps.order_create?.id ? "ok (" + out.steps.order_create.id + ")" : "blocked"}`,
  "- Decision: <A | B | C> — <one sentence why>",
  "- The test it became: link-cap guard + mechanism-labeled audit records",
].join("\n");

writeFileSync(join(ROOT, "results", "d1_1_spike.json"), JSON.stringify(out, null, 2) + "\n");
console.log("\n── verdict ──");
console.log(JSON.stringify(out.verdict, null, 2));
console.log("\nSuggested ENGINEERING_LOG entry printed to results/d1_1_spike.json → paste into ENGINEERING_LOG.md.");
console.log("spike complete — exit 0 (results carry the receipts; verdict forms the decision).");
