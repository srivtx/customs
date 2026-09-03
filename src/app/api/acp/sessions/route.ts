import { NextRequest, NextResponse } from "next/server";
import { getRuntime } from "@/lib/customs/runtime";
import { newSession } from "@/lib/customs/agent/loop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/acp/sessions — open an ACP session (core REST profile).
 * Backed by the same buyer session the playground and the MCP server use:
 * cart, tier and mandate live under it. The trust tier the session starts
 * at may be declared here, or raised later via attest_tier.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { agent?: string; tier?: string };
    if (body.agent && body.agent !== "merchant:fieldnote-supply") {
      return NextResponse.json({ ok: false, error: `unknown agent: ${body.agent}` }, { status: 404 });
    }
    const rt = getRuntime();
    const tier = body.tier === "ATTESTED" || body.tier === "MANDATED" ? body.tier : "UNVERIFIED";
    const session = newSession(rt, tier);
    return NextResponse.json(
      {
        ok: true,
        session_id: session.sessionId,
        agent: "merchant:fieldnote-supply",
        buyer_id: session.buyerId,
        tier: session.tier,
        state: "ready",
        note: "POST messages to /api/acp/sessions/" + session.sessionId,
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "session failed" }, { status: 500 });
  }
}
