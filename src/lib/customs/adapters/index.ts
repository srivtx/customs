/**
 * Protocol adapters — the same store, gate and rails behind three wire
 * formats. This is the conformance matrix's subject: the gate is constant
 * while the protocol varies, and `make ablation` measures what the variance
 * costs (calls, bytes, tokens, round-trips).
 *
 * Honesty note (ENGINEERING_LOG, D2): "MCP-style" and "ACP-style" are
 * protocol-SHAPED transports — JSON-RPC 2.0 tool envelopes and signed
 * agent-to-agent message envelopes respectively — implemented in-process
 * over the identical tool implementations. They are not the MCP stdio
 * server or the ACP wire spec, and the repo never claims otherwise.
 * Swapping the in-process transport for the real stdio/HTTP transports is
 * an interface change, not a logic change: tool schemas are shared.
 */
import { createHash } from "node:crypto";

export type AdapterId = "naive" | "mcp" | "acp";

export const ADAPTERS: Record<AdapterId, { label: string; blurb: string }> = {
  naive: {
    label: "naive",
    blurb: "Direct in-process tool calls. The baseline: zero protocol overhead.",
  },
  mcp: {
    label: "MCP-style",
    blurb: "JSON-RPC 2.0 tool envelopes (tools/list → tools/call), MCP-shaped.",
  },
  acp: {
    label: "ACP-style",
    blurb: "Agent-to-agent message envelopes with ack + signed receipt per call.",
  },
};

/** Shared tool schemas — one definition, three transports. */
export const TOOL_SCHEMAS = [
  {
    name: "search_catalog",
    description: "Search Fieldnote Supply's catalog. Returns up to 3 products.",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
  {
    name: "get_product",
    description: "Fetch one product by id (price, stock, tags).",
    inputSchema: { type: "object", properties: { productId: { type: "string" } }, required: ["productId"] },
  },
  {
    name: "add_to_cart",
    description: "Add quantity of a product to the session cart.",
    inputSchema: {
      type: "object",
      properties: { productId: { type: "string" }, quantity: { type: "integer", minimum: 1 } },
      required: ["productId", "quantity"],
    },
  },
  {
    name: "request_mandate",
    description: "Ask the merchant desk for a signed spending mandate for the cart.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "bind_and_pay",
    description: "Bind the order against the mandate and pay on the rail.",
    inputSchema: { type: "object", properties: { orderId: { type: "string" } }, required: ["orderId"] },
  },
] as const;

export interface WireLogEntry {
  adapter: AdapterId;
  dir: "out" | "in";
  method?: string;
  body: string;
  bytes: number;
}

export interface AdapterContext {
  /** actual tool implementations (runtime injects the real ones) */
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  sign: (payload: string) => string;
  sessionId: string;
}

export interface AdapterResult<T = unknown> {
  value: T;
  wire: WireLogEntry[];
  calls: number;
  roundTrips: number;
}

function estTokens(s: string): number {
  // deterministic ~chars/4 estimate; used for rules-brain accounting only
  return Math.ceil(s.length / 4);
}

export function tokensOf(text: string): number {
  return estTokens(text);
}

/** naive — direct call, wire log records only the call shape. */
export async function naiveCall(
  name: string,
  args: Record<string, unknown>,
  ctx: AdapterContext
): Promise<AdapterResult> {
  const value = await ctx.callTool(name, args);
  const body = `direct:${name}`;
  return {
    value,
    wire: [{ adapter: "naive", dir: "out", method: name, body, bytes: body.length }],
    calls: 1,
    roundTrips: 1,
  };
}

/** MCP-style — JSON-RPC 2.0 envelope in, result envelope out. */
export async function mcpCall(
  name: string,
  args: Record<string, unknown>,
  ctx: AdapterContext
): Promise<AdapterResult> {
  const request = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } });
  const value = await ctx.callTool(name, args);
  const response = JSON.stringify({ jsonrpc: "2.0", id: 1, result: { content: [{ type: "json", json: value }] } });
  return {
    value,
    wire: [
      { adapter: "mcp", dir: "out", method: "tools/call", body: request, bytes: request.length },
      { adapter: "mcp", dir: "in", method: "result", body: response, bytes: response.length },
    ],
    calls: 1,
    roundTrips: 1,
  };
}

/** ACP-style — envelope + ack + result + merchant-signed receipt. */
export async function acpCall(
  name: string,
  args: Record<string, unknown>,
  ctx: AdapterContext
): Promise<AdapterResult> {
  const thread = ctx.sessionId;
  const request = JSON.stringify({
    type: "agent.message",
    from: `buyer:${thread}`,
    to: "merchant:fieldnote-supply",
    threadId: thread,
    performative: "request",
    body: { tool: name, args },
  });
  const ack = JSON.stringify({
    type: "agent.message",
    from: "merchant:fieldnote-supply",
    to: `buyer:${thread}`,
    threadId: thread,
    performative: "ack",
    ref: createHash("sha256").update(request).digest("hex").slice(0, 12),
  });
  const value = await ctx.callTool(name, args);
  const resultEnvelope = JSON.stringify({
    type: "agent.message",
    from: "merchant:fieldnote-supply",
    to: `buyer:${thread}`,
    threadId: thread,
    performative: "result",
    body: { value },
  });
  const receipt = ctx.sign(createHash("sha256").update(resultEnvelope).digest("hex"));
  return {
    value,
    wire: [
      { adapter: "acp", dir: "out", method: "request", body: request, bytes: request.length },
      { adapter: "acp", dir: "in", method: "ack", body: ack, bytes: ack.length },
      { adapter: "acp", dir: "in", method: "result", body: resultEnvelope, bytes: resultEnvelope.length + receipt.length },
    ],
    calls: 1,
    roundTrips: 3,
  };
}

export function adapterCall(
  adapter: AdapterId,
  name: string,
  args: Record<string, unknown>,
  ctx: AdapterContext
): Promise<AdapterResult> {
  switch (adapter) {
    case "mcp":
      return mcpCall(name, args, ctx);
    case "acp":
      return acpCall(name, args, ctx);
    default:
      return naiveCall(name, args, ctx);
  }
}
