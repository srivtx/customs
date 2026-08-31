import { NextRequest, NextResponse } from "next/server";
import { getRuntime } from "@/lib/customs/runtime";
import { runTransaction } from "@/lib/customs/engine";
import { TrustTier, TRUST_TIERS } from "@/lib/customs/gate/types";
import type { AdapterId } from "@/lib/customs/adapters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ProposedShape {
  orderId: string;
  buyerId: string;
  tier: TrustTier;
  adapter: AdapterId;
  items: { productId: string; quantity: number }[];
  totalPaise: number;
  traceId: string;
}

function findProposed(orderId: string): ProposedShape | null {
  const rt = getRuntime();
  for (const e of rt.ledger.all()) {
    if (e.type === "order.proposed") {
      const d = e.data as unknown as ProposedShape;
      if (d.orderId === orderId) return d;
    }
  }
  return null;
}

/** Merchant-desk decision on a held (≥₹10,000) order. */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { orderId?: string; approve?: boolean };
    if (!body.orderId) return NextResponse.json({ ok: false, error: "orderId required" }, { status: 400 });
    const rt = getRuntime();
    const proposed = findProposed(body.orderId);
    if (!proposed) return NextResponse.json({ ok: false, error: "unknown order" }, { status: 404 });

    const tierCap = TRUST_TIERS[proposed.tier]?.maxAmountPaise ?? 0;
    if (proposed.totalPaise > tierCap) {
      return NextResponse.json({ ok: false, error: "over tier cap — no approval can widen it" }, { status: 409 });
    }

    if (body.approve) {
      // a human approved; re-bind the same cart with approval on file
      const tx = runTransaction(rt.deps, {
        buyerId: proposed.buyerId,
        tier: proposed.tier,
        items: proposed.items,
        adapter: proposed.adapter ?? "naive",
        nowMs: Date.now(),
        orderId: `${proposed.orderId}_approved`,
        humanApproved: true,
      });
      rt.ledger.append("approval.granted", {
        orderId: proposed.orderId,
        newOrderId: tx.orderId,
        by: "merchant-desk",
        at: Date.now(),
      });
      return NextResponse.json({
        ok: true,
        approved: true,
        captured: tx.decision.kind === "ALLOW",
        orderId: tx.orderId,
        decision: tx.decision,
      });
    }

    rt.ledger.append("approval.rejected", { orderId: proposed.orderId, by: "merchant-desk", at: Date.now() });
    return NextResponse.json({ ok: true, approved: false });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "decision failed" }, { status: 500 });
  }
}
