import { NextRequest, NextResponse } from "next/server";
import { getRuntime, BuyerSession } from "@/lib/customs/runtime";
import { agentTurn, newSession } from "@/lib/customs/agent/loop";
import type { AdapterId } from "@/lib/customs/adapters";
import { brainMode } from "@/lib/customs/agent/llm";
import { railInfo } from "@/lib/customs/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADAPTERS: AdapterId[] = ["naive", "mcp", "acp"];

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      sessionId?: string;
      message: string;
      adapter?: string;
      tier?: string;
      persona?: string;
    };
    const rt = getRuntime();
    const adapter = (ADAPTERS.includes(body.adapter as AdapterId) ? body.adapter : "naive") as AdapterId;

    let session: BuyerSession | undefined = body.sessionId ? rt.sessions.get(body.sessionId) : undefined;
    if (!session) session = newSession(rt, (body.tier === "ATTESTED" || body.tier === "MANDATED" ? body.tier : "UNVERIFIED") as BuyerSession["tier"]);

    const persona = body.persona === "coco" ? ("coco" as const) : ("desk" as const);
    const result = await agentTurn(rt, session.sessionId, body.message ?? "", adapter, { persona });
    return NextResponse.json({
      ok: true,
      sessionId: session.sessionId,
      buyerId: session.buyerId,
      tier: session.tier,
      cart: [...session.cart.entries()],
      awaitingMandateApproval: session.awaitingMandateApproval,
      events: result.events,
      suggestions: result.suggestions,
      brain: brainMode(),
      rail: railInfo(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "chat turn failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
