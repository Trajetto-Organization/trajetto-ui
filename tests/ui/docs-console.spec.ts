import { expect, test, type Page } from "./support/test";

import { ensureScalarBundle } from "./support/scalar-bundle";

/**
 * The two API documentation consoles in a real browser (DOCS-11 remainder).
 *
 * `docs-portal.spec.ts` covers the guides on this app and checks the console
 * link's redirect and the HTML the API serves. What only a browser shows: the
 * pinned Scalar build really loads and renders the public reference, its
 * search finds an operation by a Portuguese word, choosing a result takes the
 * reader there, and neither console logs an error while doing it. The
 * internal Swagger UI at the API's /docs is checked the same way.
 */
const API = process.env.LOAD_BASE_URL ?? "http://localhost:3334";

/** Console errors and uncaught exceptions, from the moment the page opens. */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];

  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });

  return errors;
}

test.describe("the public console of the integration API (Scalar)", () => {
  // The page loads Scalar from jsDelivr, which the suites never reach: the
  // double serves the same file, from the npm registry, checked against the
  // hash the API pins (support/scalar-bundle.ts). Fetched once, here, so a
  // registry problem fails with its own message, not as a blank console.
  test.beforeAll(async () => {
    // Room for the download's three tries (a minute each, plus the pauses).
    test.setTimeout(240_000);
    await ensureScalarBundle();
  });

  test("loads the reference, in Portuguese, with no console error", async ({
    page,
  }) => {
    const errors = collectErrors(page);

    const response = await page.goto(`${API}/integration/docs`, {
      waitUntil: "networkidle",
    });

    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/API de Integração/);

    // Rendered by the script, not the <noscript>/fallback text.
    await expect(page.getByRole("button", { name: /Abrir Busca/ })).toBeVisible(
      { timeout: 60_000 },
    );
    await expect(page.locator("#fallback")).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Abrir Grupo - Entregas" }),
    ).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("search finds an operation and takes you to it", async ({ page }) => {
    const errors = collectErrors(page);

    await page.goto(`${API}/integration/docs`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Abrir Busca/ }).click();

    const search = page.getByRole("combobox", {
      name: "Digite o termo de busca",
    });

    await expect(search).toBeVisible({ timeout: 30_000 });
    await search.fill("rota");

    const result = page.getByRole("option", { name: /Listar rotas/ }).first();

    await expect(result, "a busca não encontrou 'Listar rotas'").toBeVisible({
      timeout: 30_000,
    });

    // And a word that matches nothing yields nothing — or every search would
    // "work" by listing the whole document.
    await search.fill("zzzz-nada-aqui");
    await expect(
      page.getByRole("option", { name: /Listar rotas/ }),
    ).toHaveCount(0, { timeout: 30_000 });

    await search.fill("rota");
    await expect(result).toBeVisible({ timeout: 30_000 });
    await result.click();

    await expect(page).toHaveURL(/rota/i, { timeout: 30_000 });
    await expect(page.getByText("/integration/v1/routes").first()).toBeVisible({
      timeout: 30_000,
    });

    expect(errors).toEqual([]);
  });
});

test.describe("the internal API console (Swagger UI at /docs)", () => {
  test("loads the operations with no console error", async ({ page }) => {
    const errors = collectErrors(page);

    const response = await page.goto(`${API}/docs`, {
      waitUntil: "networkidle",
    });

    expect(response?.status()).toBe(200);
    await expect(page.locator(".swagger-ui").first()).toBeVisible({
      timeout: 60_000,
    });

    // Every route of the API is an operation block; a broken document renders
    // an error box and none.
    await expect
      .poll(() => page.locator(".opblock").count(), { timeout: 60_000 })
      .toBeGreaterThan(50);
    await expect(page.locator(".swagger-ui .errors-wrapper")).toHaveCount(0);

    expect(errors).toEqual([]);
  });
});
