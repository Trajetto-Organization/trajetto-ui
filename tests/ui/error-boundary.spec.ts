import { test, expect, type Page } from "@playwright/test";

import { managerForThisSpec } from "./support/operation";

import { readFileSync } from "node:fs";

/**
 * What the dashboard does when a screen's render throws.
 *
 * There was no `error.tsx` anywhere in this application. Next's own fallback
 * is what a person got: a blank page in production, a stack trace over the
 * whole viewport in development. Either way the sidebar went with it, and the
 * only way out of a broken screen was the browser's back button — on a
 * dispatch desk, mid-shift.
 *
 * Three things are asserted, and the third is why the boundary lives inside
 * `(protected)` rather than at the root: the navigation has to survive,
 * because the navigation IS the way out.
 *
 * The page that throws is `dashboard/boundary-probe`, which answers 404 in a
 * production build. Without something that fails on demand, a test of an
 * error boundary can only check that a file exists.
 */
const CONTEXT = JSON.parse(
  readFileSync("../trajetto-api/tests/load/fixtures/load-context.json", "utf8"),
);

const BASE = process.env.RESPONSIVE_BASE_URL ?? "http://localhost:3100";

async function open(page: Page, path: string): Promise<void> {
  await page.context().addCookies([
    {
      name: "tkey",
      value: managerForThisSpec(),
      domain: "localhost",
      path: "/",
    },
  ]);

  await page.addInitScript(() => {
    const real = Storage.prototype.getItem;

    Storage.prototype.getItem = function getItem(key: string) {
      if (key.startsWith("tutorial_")) return "true";

      return real.call(this, key);
    };
  });

  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto(`${BASE}${path}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
}

/**
 * Serial, and warmed up first.
 *
 * Against `next dev` the route and its boundary are compiled on the first
 * request, and a page asked for mid-compile falls back to the ROOT boundary —
 * which is a different component with a different exit label. Two workers
 * hitting a cold route therefore disagreed about which boundary caught the
 * error, with nothing wrong in the product. A production build resolves
 * boundaries statically and has none of this.
 */
test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();

  await page
    .goto(`${BASE}/dashboard/boundary-probe`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    })
    .catch(() => undefined);

  await page.close();
});

test.describe("a screen that throws", () => {
  test("is caught, explained, and leaves a way out", async ({ page }) => {
    await open(page, "/dashboard/boundary-probe");

    const surface = page.getByRole("alert").first();

    await expect(
      surface,
      "o limite de erro não pegou a exceção",
    ).toContainText(/quebrou nesta tela/i, { timeout: 30_000 });

    // Not blame, and not a stack trace: the two things a person needs are a
    // retry and an exit.
    await expect(surface).toContainText(/não foram perdidos/i);

    await expect(
      page.getByRole("button", { name: /tentar novamente/i }),
    ).toBeVisible();

    await expect(
      page.getByRole("link", { name: /voltar ao painel/i }),
    ).toBeVisible();
  });

  test("leaves the way out working", async ({ page }) => {
    await open(page, "/dashboard/boundary-probe");

    await expect(page.getByRole("alert").first()).toContainText(
      /quebrou nesta tela/i,
      { timeout: 30_000 },
    );

    /**
     * "Voltar ao painel" is the label only the PROTECTED boundary sets — the
     * root one says "Ir para o início". Asserting on it is how this file
     * knows WHICH boundary caught the error, which is the thing that decides
     * whether the sidebar is still on screen.
     *
     * The click is the point: an exit that renders and does not navigate is
     * the same dead end as no exit at all.
     */
    /*
      Next's development overlay renders on top of the boundary and swallows
      the click — a dev-only obstacle, and the reason this is dismissed first
      rather than forced through. In a production build there is no overlay.
    */
    await page.keyboard.press("Escape");

    await page
      .getByRole("link", { name: /voltar ao painel/i })
      .click({ timeout: 15_000 });

    await expect(page).toHaveURL(/\/dashboard(\?|$)/, { timeout: 30_000 });

    // And the dashboard really rendered, rather than the boundary following
    // along to the next screen.
    await expect(page.getByRole("alert").first()).not.toContainText(
      /quebrou nesta tela/i,
      { timeout: 30_000 },
    );
  });
});
