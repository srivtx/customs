import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getRuntime } from "@/lib/customs/runtime";
import type { BuyerSession } from "@/lib/customs/runtime";
import { newSession, executeTool } from "@/lib/customs/agent/loop";
import { TOOL_SCHEMAS } from "@/lib/customs/adapters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/mcp — a REAL Model Context Protocol server over Streamable HTTP
 * (spec 2025-06-18, backwards-compatible to 2025-03-26). This is no longer
 * a protocol-shaped sketch: any MCP client — Claude Desktop, Cursor, the
 * MCP Inspector — can point at this URL, run the initialize handshake, list
 * the counter's tools, and call them against a live buyer session.
 *
 * The money path is the same one the playground uses: the five shared tool
 * schemas (one definition, three transports) plus two protocol tools that
 * carry the consent story across JSON-RPC — attest_tier (the session raises
 * its own trust tier) and approve_mandate (the principal's human-in-the-loop
 * approval). bind_and_pay refuses an unapproved mandate at the tool layer,
 * so no client can route around the principal.
 *
 * Spec compliance notes (modelcontextprotocol.io/specification/2025-06-18):
 * - POST with Accept json+event-stream; single JSON-RPC message per request
 * - notifications/responses → 202 Accepted, no body
 * - session id assigned at initialize via Mcp-Session-Id (visible ASCII),
 *   required afterwards: missing → 400, unknown → 404 (client re-initializes)
 * - MCP-Protocol-Version header validated on subsequent requests; absent →
 *   assume 2025-03-26 (backwards compat); invalid → 400
 * - GET → 405 (this server offers no server-initiated stream)
 * - DELETE → session teardown (204); unknown session → 404
 * - tool failures that are real errors → result.isError; refusals are
 *   ordinary results (a refused mandate is the gate working, not a crash)
 */

const SUPPORTED_VERSIONS = ["2025-06-18", "2025-03-26"];
const LATEST_VERSION = "2025-06-18";

/** the two protocol tools — consent and escalation, JSON-RPC shaped */
const MCP_PROTOCOL_TOOLS = [
  {
    name: "attest_tier",
    description:
      "Raise the buyer's trust tier (UNVERIFIED → ATTESTED → MANDATED; caps ₹500 → ₹5,000 → ₹50,000). OTP-bound in production; asserted in this demo.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "approve_mandate",
    description:
      "The principal's approval — the human in the loop. Call ONLY after the human consents to the pending mandate. bind_and_pay refuses until this runs.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
] as const;

const ALL_TOOLS = [...TOOL_SCHEMAS, ...MCP_PROTOCOL_TOOLS];

/** mcp session id → the buyer session it drives (per server process) */
const mcpSessions = new Map<string, BuyerSession>();

function rpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

/** execute one tool call against the session, MCP result shape */
async function callTool(session: BuyerSession, name: string, args: Record<string, unknown>) {
  const rt = getRuntime();
  const events: never[] = [];
  const say = () => {};
  if (name === "attest_tier") {
    const next: BuyerSession["tier"] = session.tier === "UNVERIFIED" ? "ATTESTED" : session.tier === "ATTESTED" ? "MANDATED" : "MANDATED";
    if (session.tier !== "MANDATED") {
      session.tier = next;
      rt.ledger.append("tier.raised", { sessionId: session.sessionId, buyerId: session.buyerId, to: next, via: "mcp attest_tier" });
    }
    return { tier: session.tier, note: "tier raised (OTP-bound in production; asserted in this demo)" };
  }
  if (name === "approve_mandate") {
    if (!session.mandate) return { approved: false, reason: "no pending mandate" };
    if (!session.awaitingMandateApproval) return { approved: true, note: "mandate already approved" };
    session.awaitingMandateApproval = false;
    rt.ledger.append("mandate.approved", { mandateId: session.mandate.id, buyerId: session.buyerId, via: "mcp approve_mandate" });
    return { approved: true, mandateId: session.mandate.id };
  }
  return executeTool(rt, session, name, args, events, say, "mcp");
}

export async function POST(req: NextRequest) {
  const accept = req.headers.get("accept") ?? "";
  if (!accept.includes("application/json") && !accept.includes("text/event-stream")) {
    return NextResponse.json(
      rpcError(null, -32600, "Accept header must include application/json and text/event-stream"),
      { status: 406 }
    );
  }

  let msg: {
    jsonrpc?: string;
    id?: unknown;
    method?: string;
    params?: Record<string, unknown>;
  };
  try {
    msg = await req.json();
  } catch {
    return NextResponse.json(rpcError(null, -32700, "parse error"), { status: 400 });
  }
  if (Array.isArray(msg)) {
    return NextResponse.json(rpcError(null, -32600, "batching was removed in 2025-06-18 — send one message"), { status: 400 });
  }
  if (msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return NextResponse.json(rpcError(msg.id, -32600, "not a JSON-RPC 2.0 request"), { status: 400 });
  }

  const { id, method, params } = msg;
  const mcpSid = req.headers.get("mcp-session-id");
  const protoHeader = req.headers.get("mcp-protocol-version");
  if (protoHeader && !SUPPORTED_VERSIONS.includes(protoHeader)) {
    return NextResponse.json(rpcError(id, -32600, `unsupported MCP-Protocol-Version: ${protoHeader}`), { status: 400 });
  }

  /* ---------- initialize: negotiate, open a buyer session, assign id ---------- */
  if (method === "initialize") {
    const requested = typeof params?.protocolVersion === "string" ? params.protocolVersion : LATEST_VERSION;
    const negotiated = SUPPORTED_VERSIONS.includes(requested) ? requested : LATEST_VERSION;
    const rt = getRuntime();
    const session = newSession(rt, "UNVERIFIED");
    const sid = randomUUID();
    mcpSessions.set(sid, session);
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: negotiated,
          capabilities: { tools: { listChanged: false } },
          serverInfo: {
            name: "customs",
            title: "Customs — the agentic counter (Fieldnote Supply)",
            version: "1.0.0",
          },
          instructions:
            "A two-sided agentic checkout in test mode: live keys are refused at construction. " +
            "search_catalog → add_to_cart → attest_tier if the cap is tight → request_mandate → " +
            "approve_mandate (the human consents) → bind_and_pay. The gate re-verifies every bound " +
            "at bind time; refusals carry reason codes; every span lands in a hash-chained ledger.",
        },
      },
      { headers: { "Mcp-Session-Id": sid } }
    );
  }

  /* notifications carry no id and get 202, no body */
  if (method === "notifications/initialized" || method.startsWith("notifications/")) {
    return new NextResponse(null, { status: 202 });
  }

  /* everything else needs a session */
  if (!mcpSid) {
    return NextResponse.json(rpcError(id, -32600, "missing Mcp-Session-Id — initialize first"), { status: 400 });
  }
  const session = mcpSessions.get(mcpSid);
  if (!session) {
    return NextResponse.json(rpcError(id, -32001, "session expired or unknown — re-initialize"), { status: 404 });
  }

  if (method === "tools/list") {
    return NextResponse.json({ jsonrpc: "2.0", id, result: { tools: ALL_TOOLS } });
  }

  if (method === "ping") {
    return NextResponse.json({ jsonrpc: "2.0", id, result: {} });
  }

  if (method === "tools/call") {
    const name = typeof params?.name === "string" ? params.name : "";
    if (!ALL_TOOLS.some((t) => t.name === name)) {
      return NextResponse.json(rpcError(id, -32602, `unknown tool: ${name}`), { status: 200 });
    }
    const args = (params?.arguments ?? {}) as Record<string, unknown>;
    try {
      const value = await callTool(session, name, args);
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
        },
      });
    } catch (err) {
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: `tool failed: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        },
      });
    }
  }

  return NextResponse.json(rpcError(id, -32601, `method not found: ${method}`), { status: 200 });
}

/** no server-initiated stream at this endpoint — the spec's explicit 405 */
export async function GET() {
  return NextResponse.json(
    { error: "this server offers no SSE stream at the MCP endpoint" },
    { status: 405, headers: { Allow: "POST, DELETE" } }
  );
}

/** the client is done — tear the session down */
export async function DELETE(req: NextRequest) {
  const mcpSid = req.headers.get("mcp-session-id");
  if (!mcpSid) return NextResponse.json({ error: "missing Mcp-Session-Id" }, { status: 400 });
  if (!mcpSessions.delete(mcpSid)) return NextResponse.json({ error: "unknown session" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
