import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "node:path";
import { env } from "./config/env.js";
import { requestLogger } from "./middleware/logger.js";
import { errorHandler } from "./middleware/error.js";
import { apiLimiter } from "./middleware/ratelimit.js";
import { authRouter } from "./modules/auth/router.js";
import { catalogRouter } from "./modules/catalog/router.js";
import { cartRouter } from "./modules/cart/router.js";
import { addressesRouter, ordersRouter } from "./modules/orders/router.js";
import { paymentsRouter } from "./modules/payments/router.js";
import { adminRouter } from "./modules/admin/router.js";
import { prisma } from "./lib/prisma.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1); // behind Nginx on the VM

  // raw-body parsing for the two endpoints that verify signatures over bytes

  app.use("/api/payments/razorpay/webhook", express.raw({ type: "*/*", limit: "256kb" }));
  app.use("/api/admin/uploads", express.raw({ type: "*/*", limit: "6mb" }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  if (process.env.CORS_ORIGIN) app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
  app.use(requestLogger);

  // admin image uploads served with long cache
  app.use("/uploads", express.static(path.resolve(env.UPLOAD_DIR), { maxAge: "7d", fallthrough: true }));

  app.get("/health/live", (_req, res) => res.json({ ok: true }));
  app.get("/health/ready", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ ok: true, db: "up" });
    } catch {
      res.status(503).json({ ok: false, db: "down" });
    }
  });

  app.use("/api", apiLimiter);
  app.use("/api/auth", authRouter);
  app.use("/api/catalog", catalogRouter);
  app.use("/api/cart", cartRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/addresses", addressesRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/admin", adminRouter);

  // JSON 404 for unknown API paths (SPA fallback is Nginx's job)
  app.use("/api", (_req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: "API route not found" } }));

  app.use(errorHandler);
  return app;
}
