import { z } from "zod";
import { badRequest } from "./errors.js";

/** Parse request data with a zod schema → 400 with readable field errors. */
export function parse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({ field: i.path.join(".") || "_", message: i.message }));
    throw badRequest("VALIDATION_ERROR", issues[0]?.message ?? "Invalid input", issues);
  }
  return result.data;
}

export const emailSchema = z.string().trim().toLowerCase().email("Please enter a valid email address");
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(72);
export function normalizeIndianPhone(input: string): string {
  const stripped = input.trim().replace(/[\s()-]/g, "");
  if (stripped.startsWith("+91")) return stripped.slice(3);
  if (stripped.startsWith("91") && stripped.length === 12) return stripped.slice(2);
  if (stripped.startsWith("0") && stripped.length === 11) return stripped.slice(1);
  return stripped;
}
export const phoneSchema = z.string().transform(normalizeIndianPhone)
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid Indian mobile number (10 digits; optional 0 or +91 prefix)"));
export const pincodeSchema = z.string().trim().regex(/^\d{6}$/, "PIN code must be exactly 6 digits");
export const paiseSchema = z.number().int("Amounts must be whole paise").min(0).max(100_000_000);
