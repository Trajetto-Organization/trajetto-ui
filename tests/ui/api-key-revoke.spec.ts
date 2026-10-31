import { test, expect, type Locator, type Page } from "./support/test";

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
import { waitForHydration } from "./support/ui";

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

/**
 * Waits for the key's card. The list only asks for the keys once the page
 * has hydrated AND the company is resolved — the auth store gets it in a
 * post-hydration effect, and until then the panel shows "escolha a empresa
 * acima". Under three workers that took longer than the 20 s this used to
 * allow, and the card "never appeared" for a reason that was only timing.
 */
async function expectKeyCard(page: Page, card: Locator): Promise<void> {
  await waitForHydration(
    page.locator('[data-tutorial="integrations-api-keys"]').first(),
  );

  await expect(card, "o cartão da chave não apareceu na lista").toBeVisible({
    timeout: 60_000,
  });
}

/**
 * Revokes what earlier runs of this file left active. The "cancel" test
 * keeps its key alive by design, and the company may hold ten active keys:
 * the eleventh run answered API_KEY_LIMIT_REACHED before any screen opened.
 * Only this file's own keys, by name; nothing the fixture needs.
 */
async function revokeLeftovers(): Promise<void> {
  const response = await api(
    `/integrations/api-keys?businessId=${CONTEXT.businessId}`,
  );

  expect(response.status).toBe(200);

  const rows = (await response.json()).data as Array<{
    id: string;
    name: string;
    revoked_at: string | null;
  }>;

  for (const row of rows) {
    const issuedAt = Number(
      /^Chave (?:cancelada|revogada) (\d+)$/.exec(row.name)?.[1],
    );

    // Older than ten minutes only: a key of a test running right now in the
    // other worker is not a leftover.
    if (row.revoked_at || !issuedAt || Date.now() - issuedAt < 10 * 60_000)
      continue;

    // No JSON content-type on a DELETE without a body: the API refuses an
    // empty JSON body.
    const revoked = await fetch(
      `${API}/integrations/api-key/${row.id}/business/${CONTEXT.businessId}`,
      {
        method: "DELETE",
        headers: { authorization: `Bearer ${managerForThisSpec()}` },
      },
    );

    // Each worker runs this hook: the other one may have revoked it first.
    expect([200, 204, 404, 409], `revogar a sobra ${row.name}`).toContain(
      revoked.status,
    );
  }
}

test.beforeAll(revokeLeftovers);

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
    await expectKeyCard(page, card);

    await card
      .getByRole("button", { name: /revogar/i })
      .first()
      .click();

    // A real dialog, not the browser's: it has a heading, which
    // `window.confirm` cannot.
    const dialog = page.getByRole("alertdialog");

    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(name);

    await dialog.getByRole("button", { name: /^cancelar$/i }).click();

    await expect(dialog).toBeHidden();

    expect(await isRevoked(id), "cancelar revogou a chave assim mesmo").toBe(
      false,
    );

    // Proven; now out of the way of the company's ten-key limit.
    await fetch(
      `${API}/integrations/api-key/${id}/business/${CONTEXT.businessId}`,
      {
        method: "DELETE",
        headers: { authorization: `Bearer ${managerForThisSpec()}` },
      },
    );
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
    await expectKeyCard(page, card);

    await card
      .getByRole("button", { name: /revogar/i })
      .first()
      .click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();

    /**
     * The calls, counted from the click onwards.
     *
     * The revoke is a Server Action; the panel asking for the list again is a
     * read — through the relay since reads left the actions (Next runs
     * actions one at a time per tab). A version that revoked and never
     * refetched left the row saying "active" over a key that was already
     * dead — and asserting only on the row's text could not see it here,
     * because editing the panel's source to test that makes the dev server
     * hot-reload the page, which refetches by itself. Counting the calls does
     * not care.
     */
    const actionCalls: string[] = [];
    const listReads: string[] = [];

    page.on("request", (request) => {
      const url = new URL(request.url());

      if (
        request.method() === "POST" &&
        url.pathname.includes("/dashboard/integrations")
      ) {
        actionCalls.push(request.url());
      }

      if (
        request.method() === "GET" &&
        url.pathname.startsWith("/api/relay/integrations/")
      ) {
        listReads.push(request.url());
      }
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

    expect(actionCalls.length, "a revogação não saiu").toBeGreaterThan(0);
    expect(
      listReads.length,
      "o painel revogou e não pediu a lista de novo",
    ).toBeGreaterThan(0);
  });
});
