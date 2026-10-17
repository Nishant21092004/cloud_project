import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { conflict, unauthorized } from "../../lib/errors.js";
import { emailSchema, parse, passwordSchema, phoneSchema } from "../../lib/validate.js";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "../../lib/jwt.js";
import type { AuthedRequest } from "../../middleware/auth.js";
import { requireAuth } from "../../middleware/auth.js";
import { authLimiter } from "../../middleware/ratelimit.js";

export const authRouter = Router();

/** Public registration ALWAYS creates a customer — role is never accepted from input. */
authRouter.post("/register", authLimiter, async (req, res, next) => {
  try {
    const body = parse(
      z.object({
        name: z.string().trim().min(2, "Please enter your full name").max(80),
        email: emailSchema,
        password: passwordSchema,
        phone: phoneSchema.optional(),
      }),
      req.body,
    );
    const exists = await prisma.user.findUnique({ where: { email: body.email } });
    if (exists) throw conflict("EMAIL_TAKEN", "An account with this email already exists — try signing in");
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        passwordHash: await bcrypt.hash(body.password, 10),
        role: "CUSTOMER", // hard-coded — never client-controlled
      },
      select: { id: true, name: true, email: true, role: true, phone: true },
    });
    res.cookie(SESSION_COOKIE, signSession({ sub: user.id, role: user.role }), sessionCookieOptions);
    res.status(201).json({ user });
  } catch (e) {
    next(e);
  }
});

authRouter.post("/login", authLimiter, async (req, res, next) => {
  try {
    const body = parse(z.object({ email: emailSchema, password: z.string().min(1, "Please enter your password") }), req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    // same error for unknown email and wrong password (no account enumeration)
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      throw unauthorized("Incorrect email or password");
    }
    res.cookie(SESSION_COOKIE, signSession({ sub: user.id, role: user.role }), sessionCookieOptions);
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone } });
  } catch (e) {
    next(e);
  }
});

authRouter.post("/logout", (req, res) => {
  res.clearCookie(SESSION_COOKIE, { ...sessionCookieOptions, maxAge: undefined });
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: (req as AuthedRequest).user });
});
