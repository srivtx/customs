import { NextRequest, NextResponse } from "next/server";
import { getRuntime } from "@/lib/customs/runtime";
import { confirmPaymentOnce } from "@/lib/customs/engine";
import { verifyPaymentSignature } from "@/lib/customs/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Checkout completion handler (Razorpay test mode). The client-side Checkout
 * flow posts the handler payload here; the signature is verified server-side
 * before any capture event is written, and confirmations are replay-proof.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      orderId?: string;
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    };
    if (!body.orderId || !body.razorpay_order_id || !body.razorpay_payment_id || !body.razorpay_signature) {
      return NextResponse.json({ ok: false, error: "missing handler fields" }, { status: 400 });
    }
    const rt = getRuntime();
    const valid = verifyPaymentSignature(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature);
    if (!valid) {
      rt.ledger.append("payment.failed", { orderId: body.orderId, reason: "SIGNATURE_INVALID", rail: "razorpay-test" });
      return NextResponse.json({ ok: false, error: "signature verification failed" }, { status: 400 });
    }
    const confirmId = `${body.razorpay_order_id}:${body.razorpay_payment_id}`;
    const result = confirmPaymentOnce(rt.deps, body.orderId, confirmId, {
      rail: "razorpay-test",
      simulated: false,
      paymentId: body.razorpay_payment_id,
      razorpayOrderId: body.razorpay_order_id,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: "replay detected — confirmation already seen" }, { status: 409 });
    }
    rt.ledger.append("payment.captured", {
      orderId: body.orderId,
      rail: "razorpay-test",
      simulated: false,
      paymentId: body.razorpay_payment_id,
      confirmId,
      note: "captured via Razorpay test-mode checkout",
    });
    return NextResponse.json({ ok: true, captured: true, paymentId: body.razorpay_payment_id });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "confirm failed" }, { status: 500 });
  }
}
