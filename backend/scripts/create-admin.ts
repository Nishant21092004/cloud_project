/**
 * Secure admin bootstrap — the ONLY way to create admins.
 *   npm run create-admin -- admin@example.com "Strong Pass@123" "Store Manager"
 * Public registration can never create an admin (role is hard-coded server-side).
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: "../.env" });

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../src/lib/prisma.js";
import { emailSchema, parse, passwordSchema } from "../src/lib/validate.js";

async function main() {
  const [email, password, name] = process.argv.slice(2);
  const input = parse(z.object({ email: emailSchema, password: passwordSchema, name: z.string().trim().min(2).max(80) }), {
    email,
    password,
    name: name ?? "Store Admin",
  });
  const user = await prisma.user.upsert({
    where: { email: input.email },
    create: { email: input.email, name: input.name, passwordHash: await bcrypt.hash(input.password, 10), role: "ADMIN" },
    update: { role: "ADMIN" }, // promoting an existing account is explicit and deliberate
  });
  console.log(`✅ Admin ready: ${user.email} (${user.role})`);
}

main()
  .catch((e) => {
    console.error("❌ create-admin failed:", e.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
