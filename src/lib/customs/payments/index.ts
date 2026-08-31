/**
 * The payment rail.
 *
 * D1-1 decision tree (ENGINEERING_LOG): (A) tokenized test-mode charge,
 * (B) hosted-checkout completion, (C) labeled simulation. With test keys in
 * env the rail is Razorpay's Orders API + Checkout + signature verification;
 * without keys the rail is an in-house simulation that stamps every event
 * `simulated: true` — never silently mixed with real test-mode captures.
 *
 * Volume runs (ablation, fuzz) always use the simulation rail regardless of
 * keys: test-mode Payment Links are capped at 30 per business
 * (https://razorpay.com/docs/payments/payment-links/create/) and the Orders
 * API path is for the human-facing demo, not for corpus hammering.
 */
import { createHmac, randomUUID } from "node:crypto";

export type RailId = "razorpay-test" | "simulation";

export interface RailInfo {
  id: RailId;
  label: string;
  simulated: boolean;
}

export function railInfo(): RailInfo {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (id && secret && !id.startsWith("rzp_live")) {
    return { id: "razorpay-test", label: "Razorpay test mode", simulated: false };
  }
  if (id && id.startsWith("rzp_live")) {
    // AGENTS.md invariant 8: live keys are refused at construction
    throw new Error("live keys refused — test keys (rzp_test_) only");
  }
  return { id: "simulation", label: "simulation (no keys)", simulated: true };
}

export interface PaymentOrder {
  rail: RailId;
  railOrderId: string;
  amountPaise: number;
  receipt: string;
  keyId?: string;
}

export interface PaymentCapture {
  rail: RailId;
  simulated: boolean;
  paymentId: string;
  confirmId: string;
  amountPaise: number;
}

/** Create an order on the Razorpay test rail (Orders API, basic auth). */
export async function createRazorpayOrder(
  amountPaise: number,
  receipt: string,
  notes: Record<string, string>
): Promise<PaymentOrder> {
  const keyId = process.env.RAZORPAY_KEY_ID!;
  const secret = process.env.RAZORPAY_KEY_SECRET!;
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Basic " + Buffer.from(`${keyId}:${secret}`).toString("base64"),
    },
    body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt, notes }),
  });
  if (!res.ok) {
    throw new Error(`razorpay order creation failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { id: string };
  return { rail: "razorpay-test", railOrderId: json.id, amountPaise, receipt, keyId };
}

export function simulatedOrder(amountPaise: number, receipt: string): PaymentOrder {
  return { rail: "simulation", railOrderId: `sim_order_${randomUUID().slice(0, 8)}`, amountPaise, receipt };
}

export function simulatedCapture(amountPaise: number): PaymentCapture {
  return {
    rail: "simulation",
    simulated: true,
    paymentId: `sim_pay_${randomUUID().slice(0, 12)}`,
    confirmId: `sim_conf_${randomUUID().slice(0, 12)}`,
    amountPaise,
  };
}

/** HMAC verification of the standard checkout handler signature. */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return expected === signature;
}

/** HMAC verification of webhook payloads (X-Razorpay-Signature). */
export function verifyWebhookSignature(rawBody: string, signature: string, webhookSecret: string): boolean {
  const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  return expected === signature;
}
