// apps/api/vitest.config.mts
import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    projects: [
      {
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.integration.test.ts"],
          environment: "node",
        },
        resolve: { alias: { "@": resolve(__dirname, "./src") } },
      },
      {
        test: {
          name: "integration",
          include: ["src/**/*.integration.test.ts","src/**/*.e2e.test.ts"],
          environment: "node",
          globalSetup: ["./tests/setup/global-setup.ts"],

          // ✅ Vitest 4 — remplace poolOptions.forks.singleFork
          fileParallelism: false,

          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
        resolve: { alias: { "@": resolve(__dirname, "./src") } },
      },
    ],
  },
});