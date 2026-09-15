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
  workers: 3,
  timeout: 120_000,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.RESPONSIVE_BASE_URL ?? "http://localhost:3100",
  },
});
