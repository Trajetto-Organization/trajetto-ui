import { test as base, type BrowserContextOptions } from "@playwright/test";

import { prepareContext } from "./hermetic";

/**
 * The `test` of the browser suites (ui, a11y, responsive): Playwright's, with
 * every browser context made hermetic and given its own address
 * (support/hermetic.ts) — the fixture context and the ones a spec opens
 * itself (`browser.newContext()`, `browser.newPage()`), which the fixture
 * alone would miss.
 *
 * Every spec imports `test` and `expect` from here, never from
 * "@playwright/test" (tests/unitaires/browser-suites-hermetic.test.ts holds
 * them to it).
 */
const test = base.extend<object, object>({
  browser: [
    async ({ browser }, use) => {
      const original = browser.newContext.bind(browser);

      browser.newContext = async (options?: BrowserContextOptions) => {
        const context = await original(options);

        await prepareContext(context);

        return context;
      };

      await use(browser);

      delete (browser as { newContext?: unknown }).newContext;
    },
    { scope: "worker" },
  ],

  // Contexts that do not come from `browser.newContext` (a reused one, in
  // UI mode). Preparing twice is a no-op.
  context: async ({ context }, use) => {
    await prepareContext(context);
    await use(context);
  },
});

export * from "@playwright/test";
export { test };
