import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const CONTEXT = JSON.parse(
  readFileSync("../trajetto-api/tests/load/fixtures/load-context.json", "utf8"),
);
const BASE = process.env.RESPONSIVE_BASE_URL ?? "http://localhost:3100";

async function signIn(page: Page): Promise<void> {
  await page.context().addCookies([
    { name: "tkey", value: CONTEXT.managerTokens[0], domain: "localhost", path: "/" },
  ]);
}

test("segmented nav navigates and marks the current item", async ({ page }) => {
  await signIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/dashboard/integrations`, { waitUntil: "networkidle", timeout: 60000 });

  const nav = page.getByRole("navigation", { name: "Seções de integrações" });
  await expect(nav).toBeVisible();

  const links = nav.getByRole("link");
  const count = await links.count();
  console.log("itens:", count);
  expect(count).toBeGreaterThan(1);

  // The current one is announced, not only drawn.
  const current = nav.locator('[aria-current="page"]');
  await expect(current).toHaveCount(1);
  console.log("atual antes:", await current.innerText());

  // Every item points somewhere real.
  for (let i = 0; i < count; i++) {
    const href = await links.nth(i).getAttribute("href");
    expect(href, `item ${i} sem href`).toMatch(/^\?tab=/);
  }

  // Clicking moves both the URL and the current marker.
  const target = links.nth(2);
  const label = await target.innerText();
  await target.click();
  await page.waitForURL(/tab=/, { timeout: 30000 });
  await page.waitForLoadState("networkidle");

  console.log("url depois:", new URL(page.url()).search);
  const afterCurrent = page.getByRole("navigation", { name: "Seções de integrações" })
    .locator('[aria-current="page"]');
  await expect(afterCurrent).toHaveCount(1);
  console.log("atual depois:", await afterCurrent.innerText());
  expect((await afterCurrent.innerText()).trim()).toBe(label.trim());
});

test("keyboard reaches the segmented nav items", async ({ page }) => {
  await signIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/dashboard/integrations`, { waitUntil: "networkidle", timeout: 60000 });

  const nav = page.getByRole("navigation", { name: "Seções de integrações" });
  const first = nav.getByRole("link").first();

  await first.focus();
  await expect(first).toBeFocused();

  // Tab moves to the next item: as links they are all in the tab order, which
  // is the point — Radix tabs put only the selected one there.
  await page.keyboard.press("Tab");
  await expect(nav.getByRole("link").nth(1)).toBeFocused();
});
