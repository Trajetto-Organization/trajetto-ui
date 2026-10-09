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
 * The page that throws is `dashboard/boundary-probe`. A production server
 * answers 404 for it unless it was started with E2E_PROBES=1, which the
 * browser-suites job sets (it runs the production build); `next dev` always
 * serves it. Without something that fails on demand, a test of an error
 * boundary can only check that a file exists.
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
  /**
   * Warmed until the PROTECTED boundary is the one answering, not just until
   * a request finishes.
   *
   * The first version fired one navigation and swallowed whatever came back
   * (`.catch(() => undefined)`). That is a warm-up that cannot tell whether it
   * warmed anything: with three workers hammering `next dev`, the cold
   * compile of this route runs past the navigation budget, the request the
   * test makes next arrives mid-compile, and Next answers it from the ROOT
   * boundary — whose exit says "Ir para o início" instead of "Voltar ao
   * painel". The suite then failed claiming the way out was missing, on a
   * boundary that works, and the file is serial so the other three tests
   * never ran.
   *
   * So it asks the question the tests ask, and keeps asking until the answer
   * is the right one. Failing here is also better than failing there: a
   * timeout in a warm-up names the dev server, a timeout in the assertion
   * names the product.
   */
  const page = await browser.newPage();

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      /*
        Signed in, which the first version of this warm-up was not.

        `browser.newPage()` carries no cookie, so the middleware sent it to
        /login: the route never compiled, the exit link was never going to
        appear, and the loop spent its whole budget proving that a signed-out
        visitor cannot see a dashboard. `open` is the same door the tests use.
      */
      await open(page, "/dashboard/boundary-probe");

      await page
        .getByRole("link", { name: /voltar ao painel/i })
        .waitFor({ state: "visible", timeout: 20_000 });

      break;
    } catch {
      // Still compiling, or still answering from the root boundary. Ask
      // again — the compile only has to happen once.
    }
  }

  await page.close();
});

test.describe("a screen that throws", () => {
  test("is caught, explained, and leaves a way out", async ({ page }) => {
    await open(page, "/dashboard/boundary-probe");

    /*
      Keyed on the surface's own attribute, not on `role="alert"`.

      `getByRole("alert").first()` resolves to whichever alert the DOM offers
      first, and Next renders its own — an empty `__next-route-announcer__` —
      on every navigation. Whether that one or the boundary comes first is a
      race, so the test failed about one run in five with "element(s) not
      found" while the error page was plainly on screen.
    */
    const surface = page.locator("[data-error-surface]");

    await expect(surface, "o limite de erro não pegou a exceção").toContainText(
      /quebrou nesta tela/i,
      { timeout: 30_000 },
    );

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

    await expect(page.locator("[data-error-surface]")).toContainText(
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
    // along to the next screen. Keyed on the attribute the surface carries
    // for this: `role="alert"` is used legitimately elsewhere in the product,
    // so "the alert does not say quebrou" passes on a page with no alert at
    // all — and would have passed on a second crash that said something else.
    await expect(
      page.locator("[data-error-surface]"),
      "o limite de erro seguiu para a tela seguinte",
    ).toHaveCount(0, { timeout: 30_000 });
  });

  test("and Tentar novamente fetches again from the server, it does not replay the payload", async ({
    page,
  }) => {
    /**
     * The button was asserted VISIBLE and never pressed, which is the
     * difference between "there is a retry" and "the retry works".
     *
     * It mattered more than it sounds. Next's `reset()` clears the boundary's
     * own state and re-renders from the RSC payload it already holds — so for
     * a failure that happened during the SERVER render, retrying replays the
     * same cached failure and the button does nothing, forever. Both boundary
     * bugs found in /admin were exactly that: the payload carried the error.
     *
     * The surface now calls `router.refresh()` first, which throws the payload
     * away and asks the server again. This presses it and watches the wire.
     */
    const asked: string[] = [];

    page.on("request", (request) => {
      if (request.url().includes("boundary-probe")) asked.push(request.url());
    });

    await open(page, "/dashboard/boundary-probe");

    await expect(page.locator("[data-error-surface]")).toHaveCount(1, {
      timeout: 30_000,
    });

    const before = asked.length;

    // Next's dev overlay sits on top of the boundary; a real user in
    // production has nothing in the way.
    await page.keyboard.press("Escape");

    await page
      .getByRole("button", { name: /tentar novamente/i })
      .click({ timeout: 15_000 });

    await expect
      .poll(() => asked.length, {
        message:
          "Tentar novamente não pediu a tela de novo ao servidor — " +
          "reset() sozinho só reaproveita o payload que já falhou",
        timeout: 30_000,
      })
      .toBeGreaterThan(before);

    /*
      And the probe throws every time, deliberately, so the boundary must
      still be there afterwards. A retry that "succeeded" against a screen
      that always fails would mean the boundary had stopped catching.
    */
    await expect(page.locator("[data-error-surface]")).toHaveCount(1, {
      timeout: 30_000,
    });
  });

  test("and a good screen stays good after one that broke", async ({
    page,
  }) => {
    /**
     * Recovery by navigation, which is what a person actually does after the
     * second retry: they go somewhere else. The question is whether the
     * boundary stays behind.
     */
    await open(page, "/dashboard/boundary-probe");

    await expect(page.locator("[data-error-surface]")).toHaveCount(1, {
      timeout: 30_000,
    });

    await open(page, "/dashboard/integrations?tab=webhooks");

    await expect(
      page.locator("[data-error-surface]"),
      "o limite de erro sobreviveu à navegação para outra tela",
    ).toHaveCount(0);

    // The screen is not merely free of the boundary — it rendered its own
    // content.
    await expect(
      page.getByRole("button", { name: "Novo endpoint" }),
    ).toBeVisible({ timeout: 30_000 });

    // And back to the broken one: the boundary catches again rather than
    // having been consumed.
    await open(page, "/dashboard/boundary-probe");

    await expect(page.locator("[data-error-surface]")).toHaveCount(1, {
      timeout: 30_000,
    });
  });
});
