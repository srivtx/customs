import { NextRequest, NextResponse } from "next/server";
import { getRuntime } from "@/lib/customs/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rt = getRuntime();
  const traceId = `tr_${id}`;
  const spans = rt.ledger.spansFor(traceId);
  const events = rt.ledger
    .all()
    .filter((e) => (e.data as Record<string, unknown>).traceId === traceId)
    .map((e) => ({ seq: e.seq, ts: e.ts, type: e.type, data: e.data }));
  return NextResponse.json({ ok: true, traceId, spans, events });
}
