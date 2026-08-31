import { NextRequest, NextResponse } from "next/server";
import { getRuntime } from "@/lib/customs/runtime";
import { verifyWebhookSignature } from "@/lib/customs/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Razorpay webhook receiver: signature-verified, id-deduped, replay-safe. */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "webhook secret not configured" }, { status: 503 });
  }
  if (!verifyWebhookSignature(raw, signature, secret)) {
    getRuntime().ledger.append("webhook.rejected", { reason: "SIGNATURE_INVALID", bytes: raw.length });
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 400 });
  }
  const rt = getRuntime();
  try {
    const event = JSON.parse(raw) as { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number } } } };
    const payment = event.payload?.payment?.entity;
    if (event.event === "payment.captured" && payment && payment.order_id) {
      const confirmId = `webhook:${payment.id}`;
      const seen = rt.ledger.all().some((e) => e.type === "payment.captured" && (e.data as Record<string, unknown>).confirmId === confirmId);
      if (seen) {
        rt.ledger.append("replay.detected", { code: "REPLAY_DETECTED", source: "webhook", confirmId });
        return NextResponse.json({ ok: true, deduped: true });
      }
      rt.ledger.append("payment.captured", {
        orderId: payment.order_id,
        rail: "razorpay-test",
        simulated: false,
        paymentId: payment.id,
        confirmId,
        totalPaise: payment.amount ?? 0,
        via: "webhook",
      });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "unparseable payload" }, { status: 400 });
  }
}
