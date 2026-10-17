import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

/**
 * In-memory rate limiting (appropriate for a single VM; for a multi-instance
 * deployment swap the store for Redis — documented in docs/DEPLOYMENT.md).
 * Limits are env-tunable so load tests / CI can raise them without code edits.
 */
const base = { standardHeaders: true, legacyHeaders: false } as const;
const num = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

export const apiLimiter = rateLimit({ ...base, windowMs: 15 * 60 * 1000, max: num(process.env.RATE_LIMIT_API_PER_15M, 600) });
export const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: num(process.env.RATE_LIMIT_AUTH_PER_15M, 30),
  message: { error: { code: "RATE_LIMITED", message: "Too many attempts — please wait 15 minutes and try again" } },
});
export const checkoutLimiter = rateLimit({ ...base, windowMs: 60 * 1000, max: num(process.env.RATE_LIMIT_CHECKOUT_PER_MIN, 20) });
