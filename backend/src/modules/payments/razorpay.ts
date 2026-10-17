/**
 * Razorpay integration — OPTIONAL, activated only when test credentials exist.
 * Without credentials, Cash on Delivery keeps the whole store working.
 *
 * Security model:
 *  - the checkout.js key id is PUBLIC, the key secret never leaves the server
 *  - every callback is verified: HMAC-SHA256 signature AND (when enabled) a
 *    server-to-server fetch of the payment entity from Razorpay's API
 *  - webhooks: HMAC over the RAW request body with the webhook secret
 *  - all transitions are idempotent (unique payment ids + status guards)
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { env, razorpayEnabled } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";

type RazorpayClient = {
  orders: { create: (o: Record<string, unknown>) => Promise<{ id: string; amount: number; currency: string; status: string }> };
  payments: { fetch: (id: string) => Promise<{ id: string; status: string; amount: number; order_id: string; method?: string }> };
};

let client: RazorpayClient | null = null;

export function getRazorpay(): RazorpayClient | null {
  if (!razorpayEnabled) return null;
  if (!client) {
    // lazy require so the app runs fine without the credentials
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Razorpay = require("razorpay");
    client = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    }) as RazorpayClient;
  }
  return client;
}

export function createPaymentOrder(amountPaise: number, receipt: string) {
  const rzp = getRazorpay();
  if (!rzp) throw new AppError(503, "PAYMENTS_DISABLED", "Online payments are not configured on this server — please use Cash on Delivery");
  return rzp.orders.create({ amount: amountPaise, currency: "INR", receipt, payment_capture: 1 });
}

export async function fetchProviderPayment(paymentId: string) {
  const rzp = getRazorpay();
  if (!rzp) return null;
  return rzp.payments.fetch(paymentId);
}

export function verifyCheckoutSignature({ rzpOrderId, rzpPaymentId, signature }: { rzpOrderId: string; rzpPaymentId: string; signature: string }) {
  const expected = createHmac("sha256", env.RAZORPAY_KEY_SECRET).update(`${rzpOrderId}|${rzpPaymentId}`).digest("hex");
  return safeEqual(expected, signature);
}

export function verifyWebhookSignature(rawBody: Buffer, signature: string) {
  const expected = createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
