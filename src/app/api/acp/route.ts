import { NextResponse } from "next/server";

/**
 * GET /api/acp — the ACP surface index (core REST profile).
 * Self-describing: a judge or client landing on the bare root learns the
 * real endpoints instead of a 404. Zero state, zero money path.
 */
export async function GET() {
  return NextResponse.json({
    profile: "acp-core-rest",
    version: 1,
    endpoints: {
      agents: "/api/acp/agents",
      sessions: "/api/acp/sessions",
      session: "/api/acp/sessions/{session_id}",
    },
    note:
      "Receipts are Ed25519-signed under the public key in /api/acp/agents. " +
      "The full HTTP contract: AGENT_KIT.md. The MCP twin of this counter: /api/mcp.",
  });
}
