import { test, expect, type Page } from "@playwright/test";


/**
 * Revoking an API key, from the click to the row.
 *
 * The confirmation used to be `window.confirm` — the browser's own dialog,
 * with its own typeface, a platform-dependent button order, no theme and a
 * title that reads "localhost:3100 diz". On the decision that stops
 * somebody's ERP mid-sentence, that is the moment the product looks least
 * like a product.
 *
 * What is asserted is the whole chain the replacement has to keep working,
 * because a dialog that looks right and revokes nothing is worse than the
 * browser's:
 *
 *   cancel really cancels → confirm really calls the API → the key is really
 *   revoked in the database → the list on screen says so without a reload
 */
import { CONTEXT, API, BASE, managerForThisSpec } from "./support/operation";

async function api(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${managerForThisSpec()}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

/** A key of this test's own, so nothing the fixture needs is revoked. */
async function issueKey(name: string): Promise<string> {
  const response = await api(`/integrations/api-key/${CONTEXT.businessId}`, {
    method: "POST",
    body: JSON.stringify({ name, scopes: ["deliveries:read"] }),
  });

  // Read ONCE: a Response body is a stream, and reading it for the failure
  // message leaves nothing for the success path.
  const body = await response.text();

  expect(response.status, `não foi possível emitir a chave: ${body}`).toBe(201);

  return JSON.parse(body).data.id;
}

async function isRevoked(id: string): Promise<boolean> {
  const response = await api(
    `/integrations/api-keys?businessId=${CONTEXT.businessId}`,
  );

  expect(response.status).toBe(200);

  const rows = (await response.json()).data as Array<{
    id: string;
    revoked_at: string | null;
  }>;

  return Boolean(rows.find((row) => row.id === id)?.revoked_at);
}

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

  await page.setViewportSize({ width: 1440, height: 950 });

  await page.goto(`${BASE}${path}`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });

  expect(page.url(), `fell through to login: ${path}`).not.toContain("/login");
}

test.describe("revoking a key", () => {
  test("asks in the product's own dialog, and cancelling changes nothing", async ({
    page,
  }) => {
    const name = `Chave cancelada ${Date.now()}`;
    const id = await issueKey(name);

    await open(page, "/dashboard/integrations?tab=api-keys");

    // Addressed by id rather than by text: filtering divs by their content
    // lands on the innermost one, which holds the name and not the button.
    const card = page.locator(`[data-api-key="${id}"]`);
    await expect(card).toBeVisible({ timeout: 20_000 });

    await card.getByRole("button", { name: /revogar/i }).first().click();

    // A real dialog, not the browser's: it has a heading, which
    // `window.confirm` cannot.
    const dialog = page.getByRole("alertdialog");

    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(name);

    await dialog.getByRole("button", { name: /^cancelar$/i }).click();

    await expect(dialog).toBeHidden();

    expect(
      await isRevoked(id),
      "cancelar revogou a chave assim mesmo",
    ).toBe(false);
  });

  test("confirming revokes it, and the list says so without a reload", async ({
    page,
  }) => {
    const name = `Chave revogada ${Date.now()}`;
    const id = await issueKey(name);

    await open(page, "/dashboard/integrations?tab=api-keys");

    // Addressed by id rather than by text: filtering divs by their content
    // lands on the innermost one, which holds the name and not the button.
    const card = page.locator(`[data-api-key="${id}"]`);
    await expect(card).toBeVisible({ timeout: 20_000 });

    await card.getByRole("button", { name: /revogar/i }).first().click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();

    /**
     * Server-action calls, counted from the click onwards.
     *
     * The revoke is one; the panel asking for the list again is another. A
     * version that revoked and never refetched left the row saying "active"
     * over a key that was already dead — and asserting only on the row's text
     * could not see it here, because editing the panel's source to test that
     * makes the dev server hot-reload the page, which refetches by itself.
     * Counting the calls does not care.
     */
    const actionCalls: string[] = [];

    page.on("request", (request) => {
      if (request.method() !== "POST") return;
      if (!request.url().includes("/dashboard/integrations")) return;

      actionCalls.push(request.url());
    });

    await dialog.getByRole("button", { name: /^revogar$/i }).click();

    // The database is the verdict; the screen only has to agree with it.
    await expect
      .poll(() => isRevoked(id), {
        timeout: 20_000,
        message: "a chave não foi revogada no banco",
      })
      .toBe(true);

    // And the row says so. No reload: the panel refetches after the action.
    await expect(
      page.locator(`[data-api-key="${id}"]`),
      "a lista continua mostrando a chave como ativa",
    ).toContainText(/revogada/i, { timeout: 20_000 });

    expect(
      actionCalls.length,
      "o painel revogou e não pediu a lista de novo",
    ).toBeGreaterThan(1);
  });
});
