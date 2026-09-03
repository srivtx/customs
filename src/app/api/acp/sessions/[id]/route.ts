import { NextRequest, NextResponse } from "next/server";
import { createHash, sign as edSign, createPrivateKey } from "node:crypto";
import { getRuntime } from "@/lib/customs/runtime";
import { executeTool } from "@/lib/customs/agent/loop";
import { TOOL_SCHEMAS } from "@/lib/customs/adapters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/acp/sessions/[id] — the ACP message surface (core REST profile).
 *
 * POST a request envelope → the counter answers with the full ACP exchange,
 * receipts signed with the merchant's Ed25519 key (verify offline against
 * the public key in GET /api/acp/agents):
 *
 *   request  {type:"agent.message", performative:"request", body:{tool, args}}
 *   ack      {performative:"ack", ref: sha256(request)[0:12]}
 *   result   {performative:"result", body:{value}}
 *   receipt  {signature: ed25519(sha256(result-canonical)), fingerprint}
 *
 * The tool layer is the same one the playground and the MCP server run —
 * bind_and_pay refuses an unapproved mandate here exactly the same way.
 */

const KNOWN_TOOLS = new Set([...TOOL_SCHEMAS.map((t) => t.name), "attest_tier", "approve_mandate"]);

function sessionOf(id: string) {
  return getRuntime().sessions.get(id) ?? null;
}

function attest(session: ReturnType<typeof sessionOf> & NonNullable<ReturnType<typeof sessionOf>>) {
  const rt = getRuntime();
  const next = session.tier === "UNVERIFIED" ? "ATTESTED" : "MANDATED";
  if (session.tier !== "MANDATED") {
    session.tier = next;
    rt.ledger.append("tier.raised", { sessionId: session.sessionId, buyerId: session.buyerId, to: next, via: "acp attest_tier" });
  }
  return { tier: session.tier, note: "tier raised (OTP-bound in production; asserted in this demo)" };
}

function approve(session: ReturnType<typeof sessionOf> & NonNullable<ReturnType<typeof sessionOf>>) {
  const rt = getRuntime();
  if (!session.mandate) return { approved: false, reason: "no pending mandate" };
  if (!session.awaitingMandateApproval) return { approved: true, note: "mandate already approved" };
  session.awaitingMandateApproval = false;
  rt.ledger.append("mandate.approved", { mandateId: session.mandate.id, buyerId: session.buyerId, via: "acp approve_mandate" });
  return { approved: true, mandateId: session.mandate.id };
}

async function runTool(session: NonNullable<ReturnType<typeof sessionOf>>, tool: string, args: Record<string, unknown>) {
  const rt = getRuntime();
  if (tool === "attest_tier") return attest(session);
  if (tool === "approve_mandate") return approve(session);
  const events: never[] = [];
  const say = () => {};
  return executeTool(rt, session, tool, args, events, say, "acp");
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = sessionOf(id);
  if (!session) return NextResponse.json({ ok: false, error: "unknown session" }, { status: 404 });
  return NextResponse.json({
    ok: true,
    session_id: session.sessionId,
    buyer_id: session.buyerId,
    tier: session.tier,
    cart: [...session.cart.entries()],
    mandate: session.mandate,
    awaiting_approval: session.awaitingMandateApproval,
    last_order: session.lastOrderId,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = sessionOf(id);
  if (!session) return NextResponse.json({ ok: false, error: "unknown session" }, { status: 404 });

  try {
    const body = (await req.json()) as {
      performative?: string;
      body?: { tool?: string; args?: Record<string, unknown> };
      tool?: string;
      args?: Record<string, unknown>;
    };
    const tool = body.body?.tool ?? body.tool;
    const args = body.body?.args ?? body.args ?? {};
    if (!tool || !KNOWN_TOOLS.has(tool)) {
      return NextResponse.json({ ok: false, error: `unknown tool: ${tool ?? "(none)"}` }, { status: 400 });
    }
    if (body.performative && body.performative !== "request") {
      return NextResponse.json({ ok: false, error: "client envelopes carry performative:request" }, { status: 400 });
    }

    const requestCanonical = JSON.stringify({ type: "agent.message", from: `buyer:${session.sessionId}`, to: "merchant:fieldnote-supply", threadId: session.sessionId, performative: "request", body: { tool, args } });
    const ackRef = createHash("sha256").update(requestCanonical).digest("hex").slice(0, 12);

    const t0 = performance.now();
    const value = await runTool(session, tool, args);
    const ms = Math.max(1, Math.round(performance.now() - t0));
    getRuntime().ledger.append("span", { traceId: `tr_acp_${session.sessionId}`, orderId: session.lastOrderId ?? "none", spanId: `acp_${ackRef}`, parentSpanId: null, name: `acp:${tool}`, ms, adapter: "acp", attrs: {} });

    const resultEnvelope = JSON.stringify({
      type: "agent.message",
      from: "merchant:fieldnote-supply",
      to: `buyer:${session.sessionId}`,
      threadId: session.sessionId,
      performative: "result",
      body: { value },
    });
    const resultHash = createHash("sha256").update(resultEnvelope).digest();
    const rt = getRuntime();
    const signature = edSign(null, resultHash, createPrivateKey(rt.deps.privateKeyPem)).toString("base64");

    return NextResponse.json({
      ok: true,
      ack: { ref: ackRef, at: Date.now() },
      run: { run_id: `run_${ackRef}`, state: "completed", ms },
      type: "agent.message",
      from: "merchant:fieldnote-supply",
      to: `buyer:${session.sessionId}`,
      threadId: session.sessionId,
      performative: "result",
      body: { value },
      receipt: { algorithm: "ed25519", digest: resultHash.toString("hex"), signature, fingerprint: rt.keys.fingerprint, note: "verify: ed25519(sha256(result envelope)) against the public key in GET /api/acp/agents" },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "acp call failed" }, { status: 500 });
  }
}
