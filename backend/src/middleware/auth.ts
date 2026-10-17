import type { NextFunction, Request, Response } from "express";
import { verifySession } from "../lib/jwt.js";
import { forbidden, unauthorized } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";

export interface AuthedRequest extends Request {
  user?: { id: string; role: "CUSTOMER" | "ADMIN"; email: string; name: string };
}

/** Requires a valid session cookie; loads a lightweight user snapshot. */
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.bn_session as string | undefined;
    const payload = token ? verifySession(token) : null;
    if (!payload) throw unauthorized();
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, email: true, name: true },
    });
    if (!user) throw unauthorized("Session no longer valid — please sign in again");
    req.user = user;
    next();
  } catch (e) {
    next(e);
  }
}

/** Role gate — public registration can never produce this role organically. */
export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, (err) => {
    if (err) return next(err);
    if (req.user?.role !== "ADMIN") return next(forbidden("Admin access required"));
    next();
  });
}

/** Optional auth — attaches user when a valid session exists, never blocks. */
export async function maybeAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.bn_session as string | undefined;
    const payload = token ? verifySession(token) : null;
    if (payload) {
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, email: true, name: true },
      });
      if (user) req.user = user;
    }
    next();
  } catch {
    next();
  }
}
