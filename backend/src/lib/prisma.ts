import { PrismaClient } from "@prisma/client";

/** Single shared Prisma client (Prisma manages its own connection pool). */
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
