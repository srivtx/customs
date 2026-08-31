import { NextResponse } from "next/server";
import { getRuntime } from "@/lib/customs/runtime";
import { meterFromEvents, projectAtScale } from "@/lib/customs/meter";
import { brainMode } from "@/lib/customs/agent/llm";
import { railInfo } from "@/lib/customs/payments";
import { TRUST_TIERS } from "@/lib/customs/gate/types";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readResults(name: string): unknown | null {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "results", name), "utf8"));
  } catch {
    return null;
  }
}

export async function GET() {
  const rt = getRuntime();
  const events = rt.ledger.all();
  const meter = meterFromEvents(events);
  const projection = projectAtScale(meter);
  const orders = rt.ledger.orders();
  const approvals = orders
    .filter((o) => o.status === "AWAITING_APPROVAL")
    .map((o) => ({ orderId: o.orderId, buyerId: o.buyerId, totalPaise: o.totalPaise, items: o.items, createdAtMs: o.createdAtMs }));
  const attacks = [...events]
    .reverse()
    .filter((e) => e.type === "attack.blocked")
    .slice(0, 24)
    .map((e) => ({ ts: e.ts, ...(e.data as Record<string, unknown>) }));
  const chain = rt.ledger.audit();

  return NextResponse.json({
    ok: true,
    rail: railInfo(),
    brain: brainMode(),
    ephemeral: rt.ephemeral,
    fingerprint: rt.keys.fingerprint,
    keyEphemeral: rt.keys.ephemeral,
    merchant: { name: "Fieldnote Supply", products: rt.catalog.all.length },
    meter,
    projection,
    orders: orders.slice(0, 40),
    approvals,
    attacks,
    chain: { ok: chain.ok, length: chain.length, headHash: chain.headHash },
    eventsTotal: events.length,
    tiers: TRUST_TIERS,
    ablation: readResults("ablation.json"),
    conformance: readResults("conformance_matrix.json"),
    generatedAt: Date.now(),
  });
}
