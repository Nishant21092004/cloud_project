import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/tests/**/*.test.ts"],
    // integration tests share one Postgres — run files one at a time
    fileParallelism: false,
    pool: "forks",
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
