import { NextRequest, NextResponse } from "next/server";
import { getRuntime, withSessionLock, BuyerSession } from "@/lib/customs/runtime";
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

      music?: { title?: unknown; channel?: unknown; playing?: unknown };
    };
    const rt = getRuntime();
    const adapter = (ADAPTERS.includes(body.adapter as AdapterId) ? body.adapter : "naive") as AdapterId;

    const persona = body.persona === "coco" ? ("coco" as const) : ("desk" as const);
    /* the ghost's state, if it hums — one compact line of context so the
       cheap voice can answer ANY phrasing of "what's playing" (the
       regex brains keep the commands; this is chatter context only) */
    const music =
      body.music && typeof body.music.title === "string" && typeof body.music.channel === "string"
        ? {
            title: body.music.title.slice(0, 80),
            channel: body.music.channel.slice(0, 80),
            playing: body.music.playing === true,
          }
        : null;

    /* session resolution AND the turn ride the per-session lock: two rapid
       sends (double-Enter before the client's busy flag renders) used to
       race the cart read-modify-write and lose adds */
    const { result, session } = await withSessionLock(rt, body.sessionId ?? "new", async () => {
      let s: BuyerSession | undefined = body.sessionId ? rt.sessions.get(body.sessionId) : undefined;
      if (!s) s = newSession(rt, (body.tier === "ATTESTED" || body.tier === "MANDATED" ? body.tier : "UNVERIFIED") as BuyerSession["tier"]);
      const r = await agentTurn(rt, s.sessionId, body.message ?? "", adapter, { persona, music });
      return { result: r, session: s };
    });
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
