import { defineConfig, devices } from "@playwright/test";

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
 */
export default defineConfig({
  testDir: "./tests/ui",
  // Compiles every visited route on the dev server before the workers start
  // (see the file for the failures it removes).
  globalSetup: "./tests/ui/support/warm-up.ts",
  fullyParallel: true,
  workers: 3,
  timeout: 120_000,
  reporter: [["list"]],
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
