import type { NextFunction, Request, Response } from "express";

/** Compact request log — useful without drowning the console. */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    const user = (req as Request & { user?: { sub: string } }).user?.sub?.slice(-6) ?? "-";
    const line = `${req.method} ${req.originalUrl.split("?")[0]} → ${res.statusCode} ${ms}ms (user:${user})`;
    if (res.statusCode >= 500) console.error(`[api] ${line}`);
    else if (ms > 1500) console.warn(`[api] slow ${line}`);
    else console.log(`[api] ${line}`);
  });
  next();
}
