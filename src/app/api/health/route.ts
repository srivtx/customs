import { NextResponse } from "next/server";
import { getRuntime } from "@/lib/customs/runtime";
import { railInfo } from "@/lib/customs/payments";
import { brainMode } from "@/lib/customs/agent/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rt = getRuntime();
    const chain = rt.ledger.audit();
    return NextResponse.json({
      ok: true,
      service: "customs",
      rail: railInfo(),
      brain: brainMode(),
      ephemeral: rt.ephemeral,
      keyEphemeral: rt.keys.ephemeral,
      events: chain.length,
      chainOk: chain.ok,
      headHash: chain.headHash,
      ts: Date.now(),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "unhealthy" }, { status: 500 });
  }
}
