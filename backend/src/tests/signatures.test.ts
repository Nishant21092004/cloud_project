/**
 * Unit tests for the Razorpay signature helpers (real HMAC logic).
 * Uses the throwaway secrets from the test environment.
 */
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyCheckoutSignature, verifyWebhookSignature } from "../modules/payments/razorpay.js";

const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? "test_key_secret";
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? "test_webhook_secret";

describe("checkout signature", () => {
  it("accepts a correctly signed order|payment pair", () => {
    const sig = createHmac("sha256", KEY_SECRET).update("order_A1|pay_B2").digest("hex");
    expect(verifyCheckoutSignature({ rzpOrderId: "order_A1", rzpPaymentId: "pay_B2", signature: sig })).toBe(true);
  });

  it("rejects a signature computed with the wrong secret (forged client)", () => {
    const sig = createHmac("sha256", "attacker_secret").update("order_A1|pay_B2").digest("hex");
    expect(verifyCheckoutSignature({ rzpOrderId: "order_A1", rzpPaymentId: "pay_B2", signature: sig })).toBe(false);
  });

  it("rejects when fields are swapped (replay across orders)", () => {
    const sig = createHmac("sha256", KEY_SECRET).update("order_A1|pay_B2").digest("hex");
    expect(verifyCheckoutSignature({ rzpOrderId: "order_A1", rzpPaymentId: "pay_OTHER", signature: sig })).toBe(false);
  });
});

describe("webhook signature", () => {
  it("accepts a HMAC over the exact raw body", () => {
    const body = Buffer.from(JSON.stringify({ event: "payment.captured" }));
    const sig = createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
    expect(verifyWebhookSignature(body, sig)).toBe(true);
  });

  it("rejects a body that was modified after signing", () => {
    const body = Buffer.from(JSON.stringify({ event: "payment.captured" }));
    const sig = createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
    const tampered = Buffer.from(JSON.stringify({ event: "payment.captured", extra: 1 }));
    expect(verifyWebhookSignature(tampered, sig)).toBe(false);
  });
});
