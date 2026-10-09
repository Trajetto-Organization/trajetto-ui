// Mutation testing of the web's critical rules (decision 13.5): who sees and
// may do what, the idempotency key of a form, and the occurrence/ticket
// state rules the panel decides on.
//
// @stryker-mutator 8.7 is the last line whose Vitest runner accepts Vitest 1.x
// (9.0 requires Vitest >= 2); pinned so the runner and the suite stay in step.
//
// Run: yarn test:mutation
// Smoke / one file: MUTATION_TESTS=<test globs> yarn test:mutation --mutate <file>
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: "vitest",
  plugins: ["@stryker-mutator/vitest-runner"],
  vitest: { configFile: "vitest.mutation.config.ts" },
  coverageAnalysis: "perTest",
  mutate: [
    // Authorization as the web applies it.
    "src/middleware.ts",
    "src/lib/permissions.ts",
    "src/lib/user-has-permission.ts",
    "src/lib/check-multiple-permissions.ts",
    "src/lib/route-access.ts",
    "src/features/permission/lib/permission-rules.ts",
    "src/app/(protected)/_components/layout/hooks/access-snapshot.ts",
    "src/app/(protected)/_components/layout/hooks/navigation-security-check.ts",
    "src/app/(protected)/_components/layout/protected-notifications-menu/link-access.ts",
    // Server-side list state: what sort/facets reach the API from the URL.
    "src/app/(protected)/_components/shared/tanstack-table/data-table/server-table.ts",
    // Idempotency of the panel's creates.
    "src/lib/idempotency-key.ts",
    // State rules.
    "src/features/deliveries/occurrence-authorizations/rules.ts",
    "src/features/deliveries/chat/lib/ticket-rules.ts",
  ],
  ignorePatterns: [
    "coverage",
    "reports",
    ".next",
    "playwright-report",
    "test-results",
    "tests/E2E",
    "tests/ui",
    "tests/a11y",
    "tests/responsive",
  ],
  reporters: ["clear-text", "progress", "html", "json"],
  htmlReporter: { fileName: "reports/mutation/index.html" },
  jsonReporter: { fileName: "reports/mutation/mutation.json" },
  // break 90: the 06/10/2026 run scored API 96.17, web 96.53, app 97.16
  // (docs/testes.md, "Mutação (Stryker)"); 90 leaves a margin and
  // fails a run that loses a real share of the killed mutants.
  thresholds: { high: 90, low: 75, break: 90 },
  tempDirName: ".stryker-tmp",
  // A static mutant (module-level table) has no per-test coverage, so it
  // reruns all ~80 related jsdom files: the 06/10 run estimated 4 h for that
  // tail against ~7 min for the rest. Skipped in the wide run; the tables
  // they touch are measured by the focused run below.
  // MUTATION_STATIC=1 keeps them, for a focused pass on one file with its
  // own tests (MUTATION_TESTS): the runner attributes a static mutant to the
  // first test that loaded the module, so with ignoreStatic it may be tried
  // against that one test only and reported Survived wrongly.
  ignoreStatic: process.env.MUTATION_STATIC !== "1",
  // 16 logical CPUs shared with the editor and Docker: 6 runners stay under ~4 GB.
  concurrency: 6,
};
