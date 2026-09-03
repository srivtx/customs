import { NextResponse } from "next/server";
import { TOOL_SCHEMAS } from "@/lib/customs/adapters";
import { TRUST_TIERS, TrustTier } from "@/lib/customs/gate/types";
import { brainMode } from "@/lib/customs/agent/llm";
import { railInfo } from "@/lib/customs/payments";
import { CATALOG } from "@/lib/customs/store/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/agent/kit — the machine-readable agent kit.
 *
 * The counter's HTTP surface, published: what an outside agent may call,
 * in what order, and what comes back. Everything here is generated from
 * the same constants the product runs on (TOOL_SCHEMAS, TRUST_TIERS,
 * railInfo, brainMode) — the kit cannot drift from the code, because it
 * IS the code, serialized. The human twin of this document is
 * AGENT_KIT.md; the working proof is `make kit` (a client with no
 * in-repo state walks the golden path over pure HTTP).
 */
export async function GET() {
  const rail = railInfo();

  const tiers = (Object.keys(TRUST_TIERS) as TrustTier[]).map((id) => {
    const t = TRUST_TIERS[id];
    return {
      id,
      label: t.label,
      blurb: t.blurb,
      maxAmountPaise: t.maxAmountPaise,
      maxItems: t.maxItems,
      mandateTtlMs: t.mandateTtlMs,
    };
  });

  return NextResponse.json({
    kit: "customs-agent-kit",
    version: 1,
    summary:
      "Both sides of the agentic counter behind one HTTP surface. An external agent " +
      "speaks plain JSON to POST /api/chat: search the catalog, build a cart, raise its " +
      "trust tier, request a signed spending mandate, approve it, and pay — every check " +
      "visible, every span hash-chained. Test mode only: live keys are refused at construction.",
    service: {
      rail: { id: rail.id, label: rail.label, simulated: rail.simulated },
      brain: brainMode(),
      catalogSize: CATALOG.length,
      ledger: "hash-chained JSONL — every verdict, every span, every refusal",
    },
    endpoints: {
      chat: {
        method: "POST",
        path: "/api/chat",
        contentType: "application/json",
        body: {
          sessionId: "string · omit on the first call; the response hands one back",
          message: "string · required — the agent's utterance (see protocol.messages)",
          adapter: '"naive" | "mcp" | "acp" · optional, default "naive" — the wire format of the turn',
          tier: '"UNVERIFIED" | "ATTESTED" | "MANDATED" · optional — the tier a NEW session starts at',
        },
        response: {
          ok: "boolean",
          sessionId: "string — reuse this on every following call",
          buyerId: "string",
          tier: "TrustTier",
          cart: "[[productId, quantity]]",
          awaitingMandateApproval: "boolean — when true, send the approve message",
          events: "ChatEvent[] — the full turn, step by step (see events)",
          suggestions: "{label, value}[] — parser-exact next messages",
          brain: '"rules" | "llm"',
          rail: "rail info of the deployment",
        },
      },
      health: { method: "GET", path: "/api/health", note: "ok:true only when the ledger chain verifies" },
      state: { method: "GET", path: "/api/state", note: "the live ledger lines the control room renders" },
      reset: { method: "POST", path: "/api/reset", note: "re-seed the deterministic demo history" },
      kit: { method: "GET", path: "/api/agent/kit", note: "this document" },
    },
    protocol: {
      session: "one sessionId per buying session; cart, tier and mandate live server-side under it",
      escalation: "a session raises its own tier by sending \"attest\" — UNVERIFIED → ATTESTED → MANDATED",
      approval:
        "checkout drafts an Ed25519-signed mandate and holds for the principal: send \"approve\" to " +
        "release it. No approval, no money — bind_and_pay refuses without a signed mandate in bounds.",
      messages: [
        { message: "search <query> [under <₹n>]", effect: "catalog search; a products event returns matches" },
        { message: "add <productId> [×n]", effect: "adds to the session cart" },
        { message: "cart", effect: "echoes the cart with the running total" },
        { message: "attest", effect: "raises the trust tier (OTP-bound in production; asserted here)" },
        { message: "checkout", effect: "drafts + signs a mandate for the cart; waits for approval" },
        { message: "approve", effect: "releases the mandate; the gate decides; the rail captures" },
        { message: "status", effect: "passport: tier, caps, cart, active mandate" },
        { message: "attack: <corpus-id>", effect: "red-team: replays an authored attack against the live gate" },
      ],
    },
    tools: TOOL_SCHEMAS,
    trustTiers: tiers,
    events: {
      "role:user|agent": "chat text",
      step: "one tool call with its wire log (adapter frames, byte counts)",
      products: "catalog matches {id, name, pricePaise, stock}",
      cart: "cart lines + totalPaise (integer paise — floats never touch money)",
      mandate: "the signed mandate view + pendingApproval",
      gate: "the 10-check decision card: verdicts are reason codes, not vibes",
      payment: "{status: captured | held | refused, rail, simulated}",
      receipt: "the manifest: orderId, manifestNo, lines, totalPaise",
      attack: "an authored attack replayed live: verdict + per-check detail",
      tier: "a tier change with the new bounds",
    },
    walkthrough: [
      { step: 1, message: "search earbuds", expect: "a products event with matches" },
      { step: 2, message: "add <first productId from step 1>", expect: "a cart event with totalPaise" },
      { step: 3, message: "attest", expect: "a tier event — the cap now covers the cart" },
      { step: 4, message: "checkout", expect: "a mandate event, pendingApproval: true" },
      { step: 5, message: "approve", expect: "gate → payment captured → receipt with manifestNo" },
    ],
    proof: {
      referenceClient: "scripts/agent-kit-demo.ts — a client with no in-repo state",
      run: "make kit   (BASE_URL env or the default http://localhost:3000)",
      humanTwin: "AGENT_KIT.md",
    },
  });
}
