import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: [
        "src/lib/ledger.ts",
        "src/lib/split-form.ts",
        "src/lib/settlements.ts",
        "src/lib/ious.ts",
        "src/lib/reminders.ts",
        "src/lib/money-owed.ts",
        "src/lib/analytics.ts",
        "src/lib/budgets.ts",
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
        "src/lib/budgets.ts": {
          lines: 95,
          functions: 95,
          branches: 95,
          statements: 95,
        },
      },
    },
  },
});