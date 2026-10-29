import { defineConfig, devices } from "@playwright/test";

/**
 * The accessibility suite, against the running stack.
 *
 * Same requirements as the responsive suite: API on 3334, Next on 3100 and a
 * seeded `load-context.json` in the API repo. Kept in its own config because
 * it is slower — axe walks the whole tree on every page — and because a
 * failure here means something different from a layout failure.
 */
export default defineConfig({
  testDir: "./tests/a11y",
  fullyParallel: true,
  // CI: the 4-vCPU runner also hosts Postgres, the API and the web server, so
  // fewer browsers at once, and one retry for a timing flake. A real defect
  // fails both attempts and still fails the job; a test that passed only on
  // the retry is listed as "flaky" in the report, not hidden.
  workers: process.env.CI ? 2 : 3,
  retries: process.env.CI ? 1 : 0,
  timeout: 120_000,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.RESPONSIVE_BASE_URL ?? "http://localhost:3100",
    // The users' browser, not the CI runner's UTC/en-US (see the UI config).
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  },
});
