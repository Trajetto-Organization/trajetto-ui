import { test, expect, type Page } from "@playwright/test";

import { managerForThisSpec, managerToken } from "./support/operation";

import { readFileSync } from "node:fs";

/**
 * The dashboard, and whether it knows the company delivers anything.
 *
 * `/dashboard/overview` counted vehicles, drivers, parts, suppliers, service
 * orders, users and fines — everything the product did before Entregas
 * existed. The word "delivery" appeared in its DTO zero times, so a carrier
 * whose entire operation is deliveries opened the first screen of the day and
 * was told how many spare parts it had.
 *
 * The API side is proven in `tests/E2E/dashboard-deliveries.test.ts`, over
 * real HTTP, including the response schema that would otherwise strip the new
 * fields. This file asks the question that one cannot: whether any of it
 * reaches a pixel. A field can be threaded through the repository, the use
 * case, the schema, the server action and the type and still never render,
 * with every layer's own test green while it does not.
 */
const CONTEXT = JSON.parse(
  readFileSync("../trajetto-api/tests/load/fixtures/load-context.json", "utf8"),
);

const BASE = process.env.RESPONSIVE_BASE_URL ?? "http://localhost:3100";

async function open(page: Page, path: string, width = 1440): Promise<void> {
  await page.context().addCookies([
    {
      name: "tkey",
      value: managerForThisSpec(),
      domain: "localhost",
      path: "/",
    },
  ]);

  // The guided tour opens over the screen the first time an account sees it.
  await page.addInitScript(() => {
    const real = Storage.prototype.getItem;

    Storage.prototype.getItem = function getItem(key: string) {
      if (key.startsWith("tutorial_")) return "true";

      return real.call(this, key);
    };
  });

  await page.setViewportSize({ width, height: 900 });

  await page.goto(`${BASE}${path}`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });

  expect(page.url(), `fell through to login: ${path}`).not.toContain("/login");
}

/** What the API says, so the screen can be held to the same numbers. */
async function operationFromApi(): Promise<Record<string, number> | null> {
  const response = await fetch("http://localhost:3334/dashboard/overview", {
    headers: { authorization: `Bearer ${managerToken()}` },
  });

  expect(response.status).toBe(200);

  const body = (await response.json()) as {
    deliveryOperation: Record<string, number> | null;
  };

  return body.deliveryOperation;
}

test.describe("the overview and the operation", () => {
  test("draws the operation block with the API's own numbers", async ({
    page,
  }) => {
    const operation = await operationFromApi();

    expect(
      operation,
      "a API não devolveu a operação; o cenário não prova nada",
    ).not.toBeNull();

    await open(page, "/dashboard");

    const panel = page.locator("[data-operation-panel]");
    await expect(panel).toBeVisible({ timeout: 30_000 });

    /*
      Every tile, against the number the API sent — not "some number is on
      screen". A panel wired to the wrong field renders six zeroes and looks
      entirely correct.
    */
    const labels: Array<[key: string, label: string]> = [
      ["unassigned", "Sem rota"],
      ["designated", "Designadas"],
      ["inRoute", "Em rota"],
      ["deliveredToday", "Entregues hoje"],
      ["failedToday", "Insucessos hoje"],
      ["occurrencesToday", "Ocorrências hoje"],
    ];

    for (const [key, label] of labels) {
      const tile = panel.locator(`[data-tile="${key}"]`);

      await expect(tile, `o bloco não tem a área "${label}"`).toBeVisible();

      await expect(tile, `"${label}" não mostra o número da API`).toContainText(
        String(operation![key]),
      );

      // The word too: six numbers with no names is a row of six numbers.
      await expect(tile).toContainText(label);
    }
  });

  test("shows the deliveries card among the counts", async ({ page }) => {
    await open(page, "/dashboard");

    const cards = page.locator("[data-cards]");
    await expect(cards).toBeVisible({ timeout: 30_000 });

    await expect(cards).toContainText("Entregas");
    await expect(cards).toContainText("Rotas");
  });

  test("the block survives a phone's width", async ({ page }) => {
    // Six tiles in a row is a desktop shape. At 390 they wrap to two columns;
    // what must not happen is the page growing sideways because of them.
    await open(page, "/dashboard", 390);

    const panel = page.locator("[data-operation-panel]");
    await expect(panel).toBeVisible({ timeout: 30_000 });

    const overflow = await page.evaluate(() => {
      const node = document.querySelector("[data-operation-panel]");

      if (!node) return -1;

      return node.scrollWidth - node.clientWidth;
    });

    expect(overflow, "o bloco da operação estoura a largura").toBeLessThan(3);
  });
});
