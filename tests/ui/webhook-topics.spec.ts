import { test, expect, type Page } from "@playwright/test";

import { managerForThisSpec } from "./support/operation";

import { readFileSync } from "node:fs";

/**
 * "Select all" on a family of events, and what actually gets sent.
 *
 * The family button used to toggle the literal string `route.*` into the
 * payload and change nothing else on screen: the five checkboxes underneath
 * stayed empty, so the only feedback for "subscribe to everything about
 * routes" was a small chip going tick. People clicked it, saw nothing happen,
 * and ticked the five boxes by hand — which produces a subscription that
 * stops covering the family the day a sixth topic is added.
 *
 * Two things are asserted, and the second is the one nobody can see:
 *
 *   1. the children show as chosen, because they ARE;
 *   2. the request carries `route.*` and NOT the five concrete names. The
 *      wildcard is a real subscription the API matches against topics that do
 *      not exist yet, and expanding it on the way out would silently turn a
 *      standing subscription into a frozen list.
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

  await page.setViewportSize({ width: 1440, height: 950 });

  await page.goto(`${BASE}${path}`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });

  expect(page.url(), `fell through to login: ${path}`).not.toContain("/login");
}

test.describe("subscribing to a whole family of events", () => {
  test("shows the children as chosen and sends only the wildcard", async ({
    page,
  }) => {
    await open(page, "/dashboard/integrations?tab=webhooks");

    await page.getByRole("button", { name: /novo endpoint|novo destino/i })
      .first()
      .click();

    const dialog = page.getByRole("dialog").first();
    await expect(dialog).toBeVisible({ timeout: 15_000 });

    // The catalogue is fetched; the families only exist after it lands.
    const familyToggle = dialog
      .getByRole("button", { name: /todos os eventos.*route/i })
      .first();

    await expect(familyToggle).toBeVisible({ timeout: 20_000 });

    const routeBoxes = dialog.locator(
      'label:has(span:text-matches("^route\\\\.")) input[type="checkbox"]',
    );

    const total = await routeBoxes.count();

    expect(total, "a família de rotas não tem eventos na tela").toBeGreaterThan(
      1,
    );

    // Nothing chosen yet — otherwise the assertion after the click proves
    // only that checkboxes exist.
    for (let index = 0; index < total; index += 1) {
      await expect(routeBoxes.nth(index)).not.toBeChecked();
    }

    /**
     * One concrete topic first, and this is what makes the assertion at the
     * end discriminate.
     *
     * With nothing chosen, "add the wildcard" and "replace the family with
     * the wildcard" produce the same payload, and a mutation that swapped one
     * for the other survived. Starting from a hand-ticked topic is the only
     * input where the two differ: the careless version sends
     * `["route.started", "route.*"]`, which reads as two subscriptions and
     * freezes half of it.
     */
    await routeBoxes.first().check();
    await expect(routeBoxes.first()).toBeChecked();

    await familyToggle.click();

    // Every child, checked. This is the whole complaint: the button used to
    // change one chip and leave these empty.
    for (let index = 0; index < total; index += 1) {
      await expect(
        routeBoxes.nth(index),
        `o evento ${index + 1} da família continua desmarcado`,
      ).toBeChecked();
    }

    await dialog.getByLabel(/nome/i).fill("Destino de teste");
    await dialog
      .getByLabel(/url/i)
      .fill(`https://exemplo.invalid/hook-${Date.now()}`);

    /**
     * The payload, caught on the way out.
     *
     * The save is a server action, so the topics travel inside the action's
     * request body rather than as a readable JSON field. Reading it as text
     * and looking for the strings is enough to tell the two shapes apart —
     * and telling them apart is the point.
     */
    const [request] = await Promise.all([
      page.waitForRequest(
        (candidate) =>
          candidate.method() === "POST" &&
          (candidate.postData() ?? "").includes("route."),
        { timeout: 20_000 },
      ),
      dialog.getByRole("button", { name: /salvar|criar/i }).first().click(),
    ]);

    const body = request.postData() ?? "";

    expect(body, "o curinga não foi enviado").toContain("route.*");

    /*
      No concrete route topic at all — not even the one ticked by hand before
      the family was turned on. `route.*` already says it, and sending both
      reads as two subscriptions where there is one.
    */
    const concrete = body.match(/route\.(?!\*)[a-z-]+/g) ?? [];

    expect(
      concrete,
      "os tópicos concretos foram enviados junto do curinga, o que congela a assinatura",
    ).toEqual([]);
  });
});
