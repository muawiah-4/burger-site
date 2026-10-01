import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * These tests cover pure logic in src/lib only (see AGENTS notes in the test
 * files) — no React components are rendered, so a plain Node environment is
 * enough; jsdom is installed for when that changes.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    exclude: ["**/node_modules/**", "**/e2e/**", "**/.next/**"],
  },
});
