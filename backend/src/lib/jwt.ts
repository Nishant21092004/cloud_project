import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { env } from "../config/env.js";

export interface SessionPayload {
  sub: string;
  role: Role;
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "7d" });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded === "string") return null;
    if (!decoded.sub || (decoded.role !== "CUSTOMER" && decoded.role !== "ADMIN")) return null;
    return { sub: decoded.sub, role: decoded.role };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "bn_session";
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};
