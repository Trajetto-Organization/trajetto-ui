import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Unit tests for the app's non-rendering logic.
 *
 * The `test` script stays Playwright: those are the end-to-end tests and CI
 * runs them as before. This runner is for what Playwright cannot reach without
 * a live API and two real accounts — the module-level singletons that decide
 * what one user is allowed to still see after another logs out.
 *
 * `happy-dom` rather than a plain node environment because the stores this
 * exercises persist to `localStorage`; jsdom is not an option on Node 22.21.
 * The version matches the runner in trajetto-api and the driver app so the
 * three repositories share one set of config idioms and CLI flags.
 */
export default defineConfig({
  test: {
    environment: "happy-dom",

    // Relative to whatever root is in play, so it keeps working when the
    // scripts narrow the run with `--dir` — same reason as the driver app's.
    include: ["**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
