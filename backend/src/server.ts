import dotenv from "dotenv";
// local development convenience: backend/.env (Docker passes real env vars)
dotenv.config({ path: ".env" });
dotenv.config({ path: "../.env" });

import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { sweepExpiredOrders } from "./modules/orders/service.js";

async function main() {
  // database readiness gate
  let ready = false;
  for (let i = 0; i < 30 && !ready; i++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      ready = true;
    } catch {
      console.log("[boot] waiting for database…");
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  if (!ready) {
    console.error("[boot] database unreachable — exiting");
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`[boot] BloomNest API listening on :${env.PORT} (${env.NODE_ENV})`);
  });

  // release stock from expired unpaid online orders every minute
  const sweeper = setInterval(() => {
    sweepExpiredOrders().catch((e) => console.error("[sweeper]", e));
  }, 60_000);

  const shutdown = async (signal: string) => {
    console.log(`[boot] ${signal} received — shutting down gracefully`);
    clearInterval(sweeper);
    server.close(() => prisma.$disconnect().finally(() => process.exit(0)));
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((e) => {
  console.error("[boot] fatal:", e);
  process.exit(1);
});
