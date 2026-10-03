import path from "node:path";
import { defineConfig } from "vitest/config";

// Unit tests for the pure logic in src/lib — dates, tokens, address checks.
// Pages and flows are covered end to end by the Playwright suite in qa/.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
