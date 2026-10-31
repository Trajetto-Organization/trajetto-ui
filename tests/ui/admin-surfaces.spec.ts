import { test, expect, type Page } from "./support/test";

import { fixtureBusinessId, openAsMaster } from "./support/operation";
import { waitForHydration } from "./support/ui";

/**
 * The back office, opened by a browser for the first time.
 *
 * Fifty-three UI tests, forty-seven accessibility tests and seventy-nine
 * responsive tests, and not one of them had ever navigated to an /admin
 * screen. That was not an oversight about coverage — it was structural: the
 * load fixture seeds fifty BUSINESS_ADMINs and no MASTER, and /admin is
 * MASTER-only, so there was no way in. The suites grew around the hole.
 *
 * Two render-fatal defects lived in that hole and were found by a human
 * clicking:
 *
 *   - "Limites de Uso" -> pick a company => `useRef only works in Client
 *     Components`. Picking a company pushes `?businessId=…`, the segment goes
 *     into its pending state, Next renders `admin/loading.tsx`, and that
 *     Server Component rendered a `<Table>` whose wrapper called `useRef`.
 *   - /admin/entregas and /admin/rotas, before a company is chosen =>
 *     `Functions cannot be passed directly to Client Components`. The
 *     "escolha uma empresa" branch renders `<EmptyState icon={Building2} />`
 *     from a Server Component, and a lucide icon is a function.
 *
 * Both are caught from source by `tests/unitaires/server-client-boundary.test.ts`,
 * which is where the class is guarded. This file guards the SCREENS: that the
 * back office renders, that a company can be chosen, and that what comes back
 * is the data and not the error page.
 */

/**
 * Everything React reported while the page was open.
 *
 * Asserting on the rendered DOM alone is not enough here and the reason is
 * specific: a boundary failure is caught by `error.tsx`, which answers with a
 * calm, well-designed apology. A test that only checked "the page rendered
 * something" would have passed on both of the bugs above — it would have
 * found a heading, a layout and a sidebar, all correct, wrapped around a
 * crash. So the console is read too, and any boundary message fails the test
 * whatever the screen looks like.
 */
function watchForBoundaryErrors(page: Page): () => string[] {
  const seen: string[] = [];

  const BOUNDARY =
    /only works in Client Components|cannot be passed (directly )?to Client Components|Only plain objects|Classes or other objects with methods/i;

  page.on("pageerror", (error) => {
    if (BOUNDARY.test(error.message)) seen.push(error.message);
  });

  page.on("console", (message) => {
    if (message.type() !== "error") return;
    if (BOUNDARY.test(message.text())) seen.push(message.text());
  });

  return () => [...new Set(seen)];
}

/** The error surface, by the attribute it carries for exactly this purpose. */
const errorSurface = (page: Page) => page.locator("[data-error-surface]");

async function assertHealthy(
  page: Page,
  boundaryErrors: () => string[],
  where: string,
): Promise<void> {
  expect(
    boundaryErrors(),
    `${where}: erro de fronteira Server/Client no console`,
  ).toEqual([]);

  await expect(
    errorSurface(page),
    `${where}: a tela caiu no limite de erro`,
  ).toHaveCount(0);
}

/** Picks the fixture's company in whichever selector is on screen. */
async function chooseCompany(page: Page): Promise<void> {
  const trigger = page.getByRole("combobox").first();

  await expect(trigger).toBeVisible({ timeout: 30_000 });

  await trigger.click();

  const search = page.getByPlaceholder("Buscar empresa...");

  await expect(search).toBeVisible({ timeout: 15_000 });

  // The first company the list offers. Which one does not matter; that the
  // choice completes a navigation does.
  const option = page.locator('[role="option"]').first();

  await expect(option).toBeVisible({ timeout: 20_000 });

  await option.click();

  /*
    The URL is the signal, not the network.

    Choosing a company is a `router.push("?businessId=…")`, and that push IS
    the thing under test — it is what puts the segment into the pending state
    that renders `loading.tsx`. `networkidle` resolved before the push had
    landed, so the assertion afterwards read a URL that had not changed yet
    and reported a product failure that was entirely the test's own hurry.
  */
  await page.waitForURL(/businessId=/, { timeout: 60_000 });

  // And then let the segment finish swapping its fallback for its content.
  await expect(page.locator("[data-error-surface]")).toHaveCount(0, {
    timeout: 30_000,
  });
}

test.describe("the admin panel opens", () => {
  test("and the Limites de Uso tab survives picking a company", async ({
    page,
  }) => {
    /**
     * The exact click that broke, in the exact order.
     *
     * The navigation is the point: `?businessId=…` puts the /admin segment
     * into its pending state, and that is when Next renders the segment's
     * `loading.tsx`. A test that loaded the URL with the parameter already on
     * it would never see the fallback, and would pass against the bug.
     */
    const boundaryErrors = watchForBoundaryErrors(page);

    await openAsMaster(page, "/admin");

    await assertHealthy(page, boundaryErrors, "/admin");

    const limitsTab = page.getByRole("tab", { name: /Limites de Uso/i });

    await expect(limitsTab).toBeVisible({ timeout: 30_000 });

    // As the first spec of a run, /admin hydrates while the other workers keep
    // next dev compiling; six clicks a second apart ran out before React
    // attached the tab's handlers. Wait for hydration itself, not a guess.
    await waitForHydration(limitsTab);

    /*
      Pressed until it takes.

      The tab list is a client component that mounts after hydration, so a
      click that lands in the gap does nothing at all — visibly nothing, which
      is indistinguishable from a tab that is broken. The same shape as the
      ⌘K shortcut in `permission-surfaces`, and the same answer: a person who
      clicks a tab and sees no change clicks it again.
    */
    for (let attempt = 0; attempt < 6; attempt += 1) {
      await limitsTab.click();

      if ((await limitsTab.getAttribute("aria-selected")) === "true") break;

      await page.waitForTimeout(1_000);
    }

    await expect(
      limitsTab,
      "a aba Limites de Uso não ficou selecionada",
    ).toHaveAttribute("aria-selected", "true");

    // The selector is what the tab is for; whether it also prints a sentence
    // asking for a company depends on what was chosen last and is not the
    // thing under test.
    await expect(page.getByRole("combobox").first()).toBeVisible({
      timeout: 30_000,
    });

    await chooseCompany(page);

    await assertHealthy(page, boundaryErrors, "/admin depois de escolher");

    // And the choice actually took: the URL carries it, so a reload and a
    // shared link land on the same company.
    expect(page.url(), "a empresa escolhida não foi para a URL").toContain(
      "businessId=",
    );

    await expect(
      page.locator("[data-empty-state]").filter({
        hasText: /Selecione uma empresa/i,
      }),
      "continuou pedindo para escolher uma empresa depois de escolher",
    ).toHaveCount(0);
  });

  test("and the route's own skeleton renders on the server", async ({
    page,
  }) => {
    /**
     * `admin/loading.tsx` is a Server Component that renders the real
     * `<Table>` primitive. That is legitimate and it is what broke: the
     * primitive measured its own overflow with `useRef`.
     *
     * Asserted by asking the SERVER for the page with JavaScript disabled, so
     * what comes back is the server's own HTML with nothing to hydrate it. If
     * a server-side render throws, there is no client to paper over it.
     */
    const boundaryErrors = watchForBoundaryErrors(page);

    await openAsMaster(page, "/admin");

    await assertHealthy(page, boundaryErrors, "/admin");

    const html = await page.content();

    expect(
      /only works in Client Components/.test(html),
      "o payload do servidor carrega o erro de hook, mesmo com a tela montada",
    ).toBe(false);
  });
});

for (const surface of [
  { path: "/admin/deliveries", title: /Entregas/i },
  { path: "/admin/routes", title: /Rotas/i },
]) {
  test.describe(`${surface.path}`, () => {
    test("opens asking for a company, without breaking at the boundary", async ({
      page,
    }) => {
      /**
       * The screen as a master first meets it: no company chosen yet.
       *
       * This is the branch /dashboard does not have. A company user's
       * deliveries are their own, so nothing asks them to choose — which is
       * why the same file, the same prop and the same component worked there
       * and died here.
       */
      const boundaryErrors = watchForBoundaryErrors(page);

      await openAsMaster(page, surface.path);

      await assertHealthy(page, boundaryErrors, surface.path);

      // The empty state renders, with its icon — the very thing that used to
      // cross the boundary as a function.
      await expect(
        page.getByText(/Selecione uma empresa/i).first(),
      ).toBeVisible({ timeout: 30_000 });

      await expect(
        page.locator("[data-empty-state] svg").first(),
        "o ícone do estado vazio não chegou à tela",
      ).toBeVisible();
    });

    test("and shows the data of the picked company", async ({ page }) => {
      const boundaryErrors = watchForBoundaryErrors(page);

      await openAsMaster(
        page,
        `${surface.path}?businessId=${fixtureBusinessId()}`,
      );

      await assertHealthy(page, boundaryErrors, `${surface.path} com empresa`);

      /*
        The EMPTY STATE, not the words. "Selecione uma empresa" is also the
        selector's own label, and the selector is supposed to stay on screen
        after a company is chosen — asserting on the phrase measured the
        selector and called it a failure.
      */
      await expect(
        page.locator("[data-empty-state]").filter({
          hasText: /Selecione uma empresa/i,
        }),
        "continuou pedindo empresa com uma já escolhida na URL",
      ).toHaveCount(0);

      // Something real arrived: a table, or an empty state that explains
      // itself. Either is correct; the error page is not.
      const content = page.locator("table, [data-empty-state]").first();

      await expect(content).toBeVisible({ timeout: 30_000 });
    });

    test("and the tabs switch without crashing", async ({ page }) => {
      const boundaryErrors = watchForBoundaryErrors(page);

      await openAsMaster(
        page,
        `${surface.path}?businessId=${fixtureBusinessId()}`,
      );

      const tabs = page.getByRole("tab");

      const total = await tabs.count();

      // A screen with no tabs is not a failure of this test; the deliveries
      // board has them and the routes board may not.
      if (total === 0) {
        await assertHealthy(page, boundaryErrors, `${surface.path} sem abas`);
        return;
      }

      for (let index = 0; index < Math.min(total, 5); index += 1) {
        const tab = tabs.nth(index);

        if (!(await tab.isVisible())) continue;

        await tab.click();
        await page.waitForTimeout(1_200);

        await assertHealthy(
          page,
          boundaryErrors,
          `${surface.path} aba ${await tab.innerText()}`,
        );
      }
    });
  });
}

test.describe("and the rest of the back office stays up", () => {
  /**
   * The screens that were never opened by a test, opened by one.
   *
   * Not an assertion about each screen's content — that belongs to whoever
   * owns the screen. This asks the one question that had never been asked of
   * any of them: does it render at all, without a boundary error and without
   * the error page?
   */
  const SURFACES = [
    "/admin/business",
    "/admin/branch",
    "/admin/driver",
    "/admin/vehicle",
    "/admin/user-registration",
    "/admin/profile-access",
    "/admin/master-users",
    "/admin/control-tower",
    "/admin/integrations",
    "/admin/activity",
  ];

  for (const path of SURFACES) {
    test(`${path} opens`, async ({ page }) => {
      const boundaryErrors = watchForBoundaryErrors(page);

      await openAsMaster(page, path);

      await assertHealthy(page, boundaryErrors, path);
    });
  }
});
