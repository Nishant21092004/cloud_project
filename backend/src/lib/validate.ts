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
/** Indian mobile → clean 10 digits (0-prefixed / +91 / 91-prefixed input tolerated). */
export function normalizePhone(value: string): string {
  let p = value.replace(/[\s-]/g, "");
  if (p.startsWith("+91")) p = p.slice(3);
  else if (p.startsWith("91") && p.length === 12) p = p.slice(2);
  else if (p.startsWith("0") && p.length === 11) p = p.slice(1);
  return p;
}
export const phoneSchema = z
  .string()
  .trim()
  .transform(normalizePhone)
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number (drop any leading 0 or +91)"));
export const pincodeSchema = z.string().trim().regex(/^\d{6}$/, "PIN code must be exactly 6 digits");
export const paiseSchema = z.number().int("Amounts must be whole paise").min(0).max(100_000_000);
