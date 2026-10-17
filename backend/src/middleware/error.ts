import { env } from "../config/env.js";
import { AppError } from "../lib/errors.js";
import type { NextFunction, Request, Response } from "express";

/** Final error handler — expected errors as clean JSON, unknowns logged with stack. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, ...(err.details !== undefined ? { details: err.details } : {}) } });
    return;
  }
  // Prisma known errors → friendly messages without internals
  const anyErr = err as { code?: string; message?: string };
  if (anyErr?.code === "P2002") {
    res.status(409).json({ error: { code: "DUPLICATE", message: "That value already exists" } });
    return;
  }
  if (anyErr?.code === "P2025") {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Record not found" } });
    return;
  }
  console.error("[api] unhandled error:", err);
  res.status(500).json({
    error: {
      code: "INTERNAL",
      message: env.NODE_ENV === "production" ? "Something went wrong on our side. Please try again." : String(anyErr?.message ?? err),
    },
  });
}
