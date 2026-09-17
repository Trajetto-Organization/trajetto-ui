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
  fullyParallel: true,
  workers: 3,
  timeout: 120_000,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.RESPONSIVE_BASE_URL ?? "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
