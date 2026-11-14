import { z } from "zod";

/**
 * Environment configuration — parsed & validated once at startup.
 * The app refuses to boot with a malformed configuration (fail fast).
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url().or(z.string().startsWith("postgresql://")),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  ORDER_PAYMENT_TTL_MINUTES: z.coerce.number().int().positive().max(1440).default(30),
  UPLOAD_DIR: z.string().default("./uploads"),
  RAZORPAY_KEY_ID: z.string().optional().default(""),
  RAZORPAY_KEY_SECRET: z.string().optional().default(""),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(""),
  PAYMENTS_MODE: z.enum(["auto", "razorpay", "sandbox"]).default("auto"),
  /**
   * Session cookie `Secure` flag. Default "auto" = Secure in production (real
   * HTTPS deployments). Set "false" when the production demo runs on plain
   * HTTP (e.g. a VM IP without a domain) — browsers refuse Secure cookies
   * over http:// except on localhost.
   */
  COOKIE_SECURE: z.enum(["auto", "true", "false"]).default("auto"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid environment configuration:");
  for (const issue of parsed.error.issues) console.error(`   ${issue.path.join(".")}: ${issue.message}`);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
export const razorpayEnabled = Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);

/**
 * Resolved online-payment mode:
 *  - "razorpay" — real Razorpay Test Mode (keys configured and mode allows)
 *  - "sandbox"  — built-in simulator driving the SAME payment state machine,
 *                 clearly labelled "demo" in the UI. Lets the full online flow
 *                 be demonstrated with zero external credentials.
 * PAYMENTS_MODE=auto picks razorpay when keys exist, otherwise sandbox.
 */
export const paymentsMode: "razorpay" | "sandbox" =
  razorpayEnabled && env.PAYMENTS_MODE !== "sandbox" ? "razorpay" : "sandbox";
export const onlinePaymentsEnabled = true; // online option is always offered (razorpay or sandbox)

export type Env = typeof env;
