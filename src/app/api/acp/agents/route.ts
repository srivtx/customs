import { NextResponse } from "next/server";
import { getRuntime } from "@/lib/customs/runtime";
import { TOOL_SCHEMAS } from "@/lib/customs/adapters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/acp/agents — the ACP agent descriptor (core REST profile).
 * The counter announces itself: who it is, what tools it serves, and the
 * Ed25519 public key every receipt is signed under — so an outside client
 * can verify receipts offline.
 */
export async function GET() {
  const rt = getRuntime();
  return NextResponse.json({
    profile: "acp-core-rest",
    version: 1,
    agents: [
      {
        id: "merchant:fieldnote-supply",
        name: "Fieldnote Supply counter",
        description:
          "The Customs merchant counter: a signed-mandate gate over a 21-item catalog. " +
          "Test mode only — live keys are refused at construction.",
        endpoints: {
          sessions: "/api/acp/sessions",
          messages: "/api/acp/sessions/{session_id}",
          session: "/api/acp/sessions/{session_id}",
        },
        capabilities: {
          tools: TOOL_SCHEMAS.map((t) => t.name),
          protocolTools: ["attest_tier", "approve_mandate"],
          receipt: { algorithm: "ed25519", publicKeyPem: rt.keys.publicKeyPem, fingerprint: rt.keys.fingerprint },
        },
        note: "mcp: attest_tier and approve_mandate carry consent; bind_and_pay refuses an unapproved mandate at the tool layer.",
      },
    ],
  });
}
