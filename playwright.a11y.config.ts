import { defineConfig, devices } from "@playwright/test";

import { browserSuiteDefaults } from "./tests/ui/support/suite-config";

/**
 * The accessibility suite, against the running stack.
 *
 * Same requirements as the responsive suite: API on 3334, Next on 3100 and a
 * seeded `load-context.json` in the API repo. Kept in its own config because
 * it is slower — axe walks the whole tree on every page — and because a
 * failure here means something different from a layout failure.
 *
 * Specs import `test` from tests/ui/support/test.ts (hermetic contexts).
 */
export default defineConfig({
  ...browserSuiteDefaults,
  testDir: "./tests/a11y",
  // Its own folder: each run empties its outputDir first, and the three run
  // one after the other in CI — a shared folder lost the traces of the
  // suite before by the time the job uploaded them.
  outputDir: "./test-results/a11y",
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
    // The users' browser, not the CI runner's UTC/en-US (see the UI config).
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  },
});
