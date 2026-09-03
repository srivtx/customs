/**
 * agent-kit-demo.ts — the reference client: an agent kit walkthrough that
 * is ALSO the interop proof. This script holds no in-repo state and imports
 * nothing from src/ — it is exactly what an outside agent is: a process
 * speaking plain JSON over HTTP. It walks the golden path (search → add →
 * attest → checkout → approve → capture) against a running customs instance,
 * asserting each verdict, and exits non-zero if the counter ever deviates.
 *
 *   bun scripts/agent-kit-demo.ts [base-url]     # default http://localhost:3000
 *   make kit                                     # same thing, makefile voice
 *
 * Test mode only — live keys are refused at construction, and this client
 * refuses to talk to anything that doesn't identify itself honestly.
 */

const BASE = (process.argv[2] ?? process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

interface ChatEvent {
  id: string;
  ts: number;
  role?: string;
  text?: string;
  kind?: string;
  tool?: string;
  products?: { id: string; name: string; pricePaise: number }[];
  lines?: { name: string; quantity: number; unitPricePaise: number }[];
  totalPaise?: number;
  mandate?: { id: string; amountCapPaise: number };
  pendingApproval?: boolean;
  orderId?: string;
  decision?: { kind: string; code: string | null; checks: { label: string; pass: boolean | null }[] };
  status?: string;
  rail?: string;
  simulated?: boolean;
  manifestNo?: string;
  tier?: string;
}

interface ChatResponse {
  ok: boolean;
  sessionId: string;
  tier: string;
  awaitingMandateApproval: boolean;
  events: ChatEvent[];
  error?: string;
}

const ofKind = (events: ChatEvent[], kind: string) => events.filter((e) => e.kind === kind);

let failures = 0;
function expect(label: string, cond: boolean, detail = "") {
  const line = `${cond ? "PASS" : "FAIL"}  ${label}${detail ? " — " + detail : ""}`;
  console.log(line);
  if (!cond) failures += 1;
}

async function chat(sessionId: string | null, message: string): Promise<ChatResponse> {
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...(sessionId ? { sessionId } : {}), message }),
  });
  if (!res.ok) throw new Error(`/api/chat → HTTP ${res.status}`);
  return (await res.json()) as ChatResponse;
}

async function main() {
  console.log(`── customs · agent kit — an external agent clears the counter ──`);
  console.log(`base url: ${BASE}\n`);

  // 0 — the desk must identify itself, and its chain must verify
  const health = (await (await fetch(`${BASE}/api/health`)).json()) as {
    ok: boolean;
    chainOk: boolean;
    rail: { id: string; simulated: boolean };
    brain: string;
  };
  expect("health answers ok:true", health.ok === true);
  expect("ledger chain verifies", health.chainOk === true, `rail=${health.rail?.id} brain=${health.brain}`);

  // 1 — search the catalog
  let r = await chat(null, "search earbuds");
  const sid = r.sessionId;
  const products = ofKind(r.events, "products")[0]?.products ?? [];
  expect("search returns matches", products.length > 0, `${products.length} matches · session ${sid}`);
  const pick = products.find((p) => p.id === "bud-pro-earbuds") ?? products[0];
  console.log(`      picked: ${pick.id} — ₹${(pick.pricePaise / 100).toLocaleString("en-IN")}\n`);

  // 2 — build the cart
  r = await chat(sid, `add ${pick.id}`);
  const cart = ofKind(r.events, "cart")[0];
  expect("cart holds the line", (cart?.lines?.length ?? 0) === 1, `total ₹${((cart?.totalPaise ?? 0) / 100).toLocaleString("en-IN")}`);

  // 3 — raise the tier so the cap covers the cart
  r = await chat(sid, "attest");
  const tiered = ofKind(r.events, "tier").length > 0 || r.tier === "ATTESTED";
  expect("tier raised to ATTESTED", tiered, r.tier);

  // 4 — checkout: the desk drafts and signs a mandate, then waits
  r = await chat(sid, "checkout");
  const mandate = ofKind(r.events, "mandate")[0];
  expect("mandate drafted and pending approval", r.awaitingMandateApproval === true && !!mandate, mandate?.mandate?.id);

  // 5 — approve: the gate decides, the rail captures
  r = await chat(sid, "approve");
  const gate = ofKind(r.events, "gate")[0];
  const payment = ofKind(r.events, "payment")[0];
  const receipt = ofKind(r.events, "receipt")[0];
  expect("gate decision is ALLOW", gate?.decision?.kind === "ALLOW", `${gate?.decision?.checks?.filter((c) => c.pass).length ?? 0}/10 checks pass`);
  expect("payment captured", payment?.status === "captured", `rail=${payment?.rail}${payment?.simulated ? " (simulated)" : ""}`);
  expect("receipt issued", !!receipt?.manifestNo, `${receipt?.manifestNo} · order ${receipt?.orderId}`);

  // 6 — the chain still verifies after our order landed in it
  const after = (await (await fetch(`${BASE}/api/health`)).json()) as { chainOk: boolean; events: number };
  expect("ledger chain verifies after capture", after.chainOk === true, `${after.events} events on the chain`);

  console.log(
    `\n── the outside agent paid, bounded and gated · manifest ${receipt?.manifestNo ?? "?"} · ` +
      `${failures === 0 ? "all checks green" : failures + " CHECKS FAILED"} ──`
  );
  if (failures) process.exit(1);
}

main().catch((err) => {
  console.error(`agent kit walkthrough failed: ${err instanceof Error ? err.message : err}`);
  console.error(`is the product running at ${BASE}? (bun run dev)`);
  process.exit(1);
});
