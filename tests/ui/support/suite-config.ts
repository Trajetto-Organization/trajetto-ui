import type { PlaywrightTestConfig } from "@playwright/test";

/**
 * What the three browser-suite configs (ui, a11y, responsive) share, kept in
 * one place so they cannot drift apart.
 *
 * - `forbidOnly` in CI: a `test.only` left behind turned the gate into one
 *   test that passed.
 * - One retry in CI, never locally. A test that needs it is reported, not
 *   hidden: a warning per flaky test and a section in the run summary
 *   (support/run-summary-reporter.ts). A real defect fails both attempts and
 *   the job.
 * - The local double of Turnstile's siteverify, up for as long as the run:
 *   the web's server checks login tokens against it in CI
 *   (TURNSTILE_SITEVERIFY_URL, honoured only with Cloudflare's test secret;
 *   src/lib/turnstile-siteverify.ts).
 */
const DOUBLES_PORT = Number(process.env.E2E_DOUBLES_PORT ?? 3199);

const browserSuiteDefaults: Pick<
  PlaywrightTestConfig,
  "forbidOnly" | "retries" | "reporter" | "webServer"
> = {
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["./tests/ui/support/run-summary-reporter.ts"]],
  webServer: {
    command: "node tests/ui/support/turnstile-siteverify-double.mjs",
    url: `http://127.0.0.1:${DOUBLES_PORT}/health`,
    env: { E2E_DOUBLES_PORT: String(DOUBLES_PORT) },
    // CI starts it fresh (a busy port is a misconfiguration to see);
    // locally a double left running from another config is reused.
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    stdout: "ignore",
    stderr: "pipe",
  },
};

export { DOUBLES_PORT, browserSuiteDefaults };
