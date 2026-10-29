import path from "node:path";
import {
  configDefaults,
  coverageConfigDefaults,
  defineConfig,
} from "vitest/config";

// Vitest's default coverage exclude also drops `*-spec.ts(x)` / `*-test.ts(x)`,
// which here are product files (the public docs portal's OpenAPI reader is
// src/app/docs/_lib/public-spec.ts). Tests use the dot form only and live in
// tests/, so only that form is excluded.
const DASHED_TEST_GLOB = "**/*{.,-}{test,spec}?(-d).?(c|m)[jt]s?(x)";
const DOT_TEST_GLOB = "**/*.{test,spec}?(-d).?(c|m)[jt]s?(x)";

/**
 * Unit tests for the app's non-rendering logic.
 *
 * The `test` script stays Playwright. Its tests/E2E suite is pure rules and
 * CI runs it as `test:rules` (one project, no browser); the suites that drive
 * a browser against a running stack run nightly in
 * .github/workflows/browser-suites.yml.
 *
 * This runner is for what Playwright cannot reach without a live API and two
 * real accounts — the module-level singletons that decide what one user is
 * allowed to still see after another logs out.
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
    include: ["**/*.test.ts", "**/*.test.tsx"],

    // Stryker's sandboxes are full copies of the repository, tests included:
    // without this a plain run also executes those stale copies (twice the
    // time, and an old copy can fail or hide a failure).
    // tests/E2E holds Playwright files named *.test.ts (the pure-rule suite
    // CI runs as `test:rules`): a plain `npx vitest run` collected them and
    // 14 failed to load ("Playwright Test did not expect test.describe()").
    exclude: [...configDefaults.exclude, ".stryker-tmp/**", "tests/E2E/**"],

    // Measured for real (decision 13.1): every file of product code under src
    // counts, including the pages and components no unit test renders yet
    // (`all`), so the number is honest rather than flattering. Only Vitest's
    // defaults are excluded (tests, *.d.ts, configs), with the dashed test
    // glob narrowed as explained above. Published by the branch CI, not gated.
    coverage: {
      provider: "v8",
      all: true,
      include: ["src/**/*.{ts,tsx}"],
      exclude: coverageConfigDefaults.exclude.map((glob) =>
        glob === DASHED_TEST_GLOB ? DOT_TEST_GLOB : glob,
      ),
      reporter: ["text-summary", "json-summary", "json", "lcov", "html"],
      reportsDirectory: "coverage",
      // A red test must not also hide the measurement.
      reportOnFailure: true,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Next resolves this marker itself (empty on the server layer, a build
      // error on the client one); tests run server code, so the empty twin.
      "server-only": "next/dist/compiled/server-only/empty.js",
      // A build-time transform in Next; the root layout calls it at import.
      "next/font/google": path.resolve(
        __dirname,
        "./tests/unitaires/helpers/next-font-google.ts",
      ),
    },
  },
});
