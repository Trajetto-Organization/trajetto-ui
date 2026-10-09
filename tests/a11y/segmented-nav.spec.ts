import { managerToken } from "../ui/support/operation";

import { test, expect, type Page } from "@playwright/test";

import { readFileSync } from "node:fs";

/**
 * The tab strips that are really navigation.
 *
 * Deliveries and Integrations used Radix `Tabs` with no `TabsContent`: each
 * "tab" changes a URL parameter and the server renders a different page. They
 * are links now, and this is the test that says so — that they still navigate,
 * that the current one is announced and not merely drawn, and that the whole
 * strip is reachable by keyboard, which it was not before (Radix keeps only
 * the selected trigger in the tab order).
 */
const CONTEXT = JSON.parse(
  readFileSync("../trajetto-api/tests/load/fixtures/load-context.json", "utf8"),
);

const BASE = process.env.RESPONSIVE_BASE_URL ?? "http://localhost:3100";

const STRIPS = [
  {
    path: "/dashboard/integrations",
    label: "Seções de integrações",
    name: "integrations",
  },
  {
    path: "/dashboard/deliveries",
    label: "Seções de entregas",
    name: "deliveries",
  },
] as const;

async function open(page: Page, path: string): Promise<void> {
  await page.context().addCookies([
    {
      name: "tkey",
      value: managerToken(),
      domain: "localhost",
      path: "/",
    },
  ]);

  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto(`${BASE}${path}`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });

  expect(page.url(), `fell through to login: ${path}`).not.toContain("/login");

  await dismissTutorial(page);
}

/**
 * Gets the guided tour out of the way, with the keyboard.
 *
 * Deliveries opens with the tutorial over it, and the tutorial is a modal
 * dialog that traps Tab — so without this the clicks below hit the overlay
 * and the focus assertions never leave the card. Using Escape rather than
 * clicking the X is deliberate: the tour's own footer promises "Pressione ESC
 * para sair", and this is the test that keeps that promise true.
 */
async function dismissTutorial(page: Page): Promise<void> {
  const dialog = page.locator('[role="dialog"][aria-modal="true"]');

  if ((await dialog.count()) === 0) return;

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0, { timeout: 10_000 });
}

test.describe.configure({ mode: "parallel" });

for (const strip of STRIPS) {
  test(`${strip.name}: every item is a real link`, async ({ page }) => {
    await open(page, strip.path);

    const nav = page.getByRole("navigation", { name: strip.label });
    await expect(nav).toBeVisible();

    const links = nav.getByRole("link");
    const count = await links.count();

    expect(count, `${strip.name}: strip has no items`).toBeGreaterThan(1);

    // A link with no href is a button wearing a costume: no middle click, no
    // "copy link address", no opening in a new tab.
    for (let index = 0; index < count; index++) {
      const href = await links.nth(index).getAttribute("href");

      expect(href, `${strip.name}: item ${index} has no href`).toMatch(
        /^\?tab=/,
      );
    }

    // Exactly one current item, said out loud rather than only painted.
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
  });

  test(`${strip.name}: choosing an item moves the URL and the marker`, async ({
    page,
  }) => {
    await open(page, strip.path);

    const nav = page.getByRole("navigation", { name: strip.label });
    const target = nav.getByRole("link").nth(2);
    const label = (await target.innerText()).trim();

    await target.click();
    await page.waitForURL(/tab=/, { timeout: 30_000 });
    await page.waitForLoadState("networkidle");

    const current = page
      .getByRole("navigation", { name: strip.label })
      .locator('[aria-current="page"]');

    await expect(current).toHaveCount(1);

    expect(
      (await current.innerText()).trim(),
      `${strip.name}: the marker did not follow the click`,
    ).toBe(label);
  });

  test(`${strip.name}: the keyboard reaches every item`, async ({ page }) => {
    await open(page, strip.path);

    const nav = page.getByRole("navigation", { name: strip.label });
    const first = nav.getByRole("link").first();

    await first.focus();
    await expect(first).toBeFocused();

    // As links they are all in the tab order. With Radix tabs only the
    // selected trigger was, and arrow keys moved between the rest — which
    // here would have fired a page load per keypress.
    await page.keyboard.press("Tab");
    await expect(nav.getByRole("link").nth(1)).toBeFocused();
  });
}
