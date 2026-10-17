import { createHash, randomInt } from "node:crypto";

/** Canonical money helpers — all amounts are integer paise. */
export const assertPaise = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0;

/** ₹ formatting is done client-side; the API only ever moves paise. */
export const paiseToRupees = (paise: number): number => paise / 100;

/**
 * Stable fingerprint of a priced cart. Any change to items, quantities or
 * server-computed unit prices changes the fingerprint, which is how the
 * checkout detects "price changed since you looked at it".
 */
export function fingerprint(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 32);
}

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I/L

/** Human-friendly unique order number, e.g. BN-261016-7K3M9. */
export function newOrderNumber(now = new Date()): string {
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  let rand = "";
  for (let i = 0; i < 5; i++) rand += ALPHABET[randomInt(ALPHABET.length)];
  return `BN-${yy}${mm}${dd}-${rand}`;
}

/** Collision-safe generator (retries on the astronomical chance of a clash). */
export async function uniqueOrderNumber(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const candidate = newOrderNumber();
    const exists = await prismaCount(candidate);
    if (!exists) return candidate;
  }
  throw new Error("Could not allocate an order number");
}

// small indirection to avoid a circular import with the prisma client module
import { prisma } from "./prisma.js";
async function prismaCount(orderNumber: string): Promise<boolean> {
  return (await prisma.order.count({ where: { orderNumber } })) > 0;
}
