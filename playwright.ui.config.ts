import { defineConfig, devices } from "@playwright/test";

import { browserSuiteDefaults } from "./tests/ui/support/suite-config";

/**
 * Functional tests against the running stack.
 *
 * `playwright.config.ts` runs the pure-logic suites — rules extracted out of
 * components so they can be checked without a browser. Those need nothing.
 * The two configs beside this one ask a specific question of a real screen:
 * does it fit (responsive), can it be operated (a11y).
 *
 * This one asks the plainest question of all, and the one the other three
 * cannot: does the screen actually show what the API just sent it. A field can
 * be added end to end — repository, use case, response schema, server action,
 * type — and still never reach a pixel, and every layer's own test passes
 * while it does.
 *
 * Same requirements as the others: API on 3334, Next on 3100, and a seeded
 * `load-context.json` in the API repository.
 *
 * Specs import `test` from tests/ui/support/test.ts: every browser context
 * is hermetic (third parties answered by local doubles) and is a person with
 * an address of its own (support/hermetic.ts).
 */
export default defineConfig({
  ...browserSuiteDefaults,
  testDir: "./tests/ui",
  // Its own folder: each run empties its outputDir first, and the three run
  // one after the other in CI — a shared folder lost the traces of the
  // suite before by the time the job uploaded them.
  outputDir: "./test-results/ui",
  // Compiles every visited route on the dev server before the workers start
  // (see the file for the failures it removes).
  globalSetup: "./tests/ui/support/warm-up.ts",
  fullyParallel: true,
  // CI: the 4-vCPU runner also hosts Postgres, the API and the web server, so
  // fewer browsers at once. One retry there (support/suite-config.ts): a real
  // defect fails both attempts and the job; a test that passed only on the
  // retry becomes a warning and a line in the run summary, never silence.
  workers: process.env.CI ? 2 : 3,
  timeout: 120_000,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.RESPONSIVE_BASE_URL ?? "http://localhost:3100",
    // The browser of the people who use it, wherever the suite runs. A CI
    // runner is UTC and en-US: after 21:00 in São Paulo its "today" is
    // already tomorrow, and the refuelling form refused the date picked as
    // "no futuro" (the API judges the date in the company's zone).
    // The Node side of the specs (a date picked "today") reads TZ, set to
    // the same zone by the workflow.
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
