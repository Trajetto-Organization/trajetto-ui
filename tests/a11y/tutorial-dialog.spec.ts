import { test, expect, type Page } from "@playwright/test";

import { readFileSync } from "node:fs";

/**
 * The guided tour, as a dialog.
 *
 * It was a full-screen overlay with no role, no Escape handler and no focus
 * management — while its own footer read "Pressione ESC para sair". A keyboard
 * user could tab through the page underneath it and had no way to close it.
 * These are the four promises it now makes.
 */
const CONTEXT = JSON.parse(
  readFileSync(
    "../trajetto-api/tests/load/fixtures/load-context.json",
    "utf8",
  ),
);

const BASE = process.env.RESPONSIVE_BASE_URL ?? "http://localhost:3100";

/** Deliveries opens with the tour over it. */
const PATH = "/dashboard/deliveries";

async function open(page: Page): Promise<void> {
  await page.context().addCookies([
    {
      name: "tkey",
      value: CONTEXT.managerTokens[0],
      domain: "localhost",
      path: "/",
    },
  ]);

  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto(`${BASE}${PATH}`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });

  expect(page.url()).not.toContain("/login");
}

const dialogOf = (page: Page) =>
  page.locator('[role="dialog"][aria-modal="true"]');

test.describe.configure({ mode: "parallel" });

test("announces itself as a dialog with a name", async ({ page }) => {
  await open(page);

  const dialog = dialogOf(page);
  await expect(dialog).toHaveCount(1);

  // `aria-labelledby` that points at nothing is worse than no name at all:
  // the dialog announces as unlabelled and the author believes it is named.
  const labelledBy = await dialog.getAttribute("aria-labelledby");
  expect(labelledBy).toBeTruthy();

  const title = page.locator(`#${labelledBy}`);
  await expect(title).toHaveCount(1);
  expect((await title.innerText()).trim().length).toBeGreaterThan(0);
});

test("Escape closes it, as the footer promises", async ({ page }) => {
  await open(page);
  await expect(dialogOf(page)).toHaveCount(1);

  await page.keyboard.press("Escape");

  await expect(dialogOf(page)).toHaveCount(0, { timeout: 10_000 });
});

test("Tab never leaves the card", async ({ page }) => {
  await open(page);

  const dialog = dialogOf(page);
  await expect(dialog).toHaveCount(1);

  // Far more presses than there are controls inside, so the loop has to wrap
  // several times. One escape is enough to fail this.
  const escaped: string[] = [];

  for (let step = 0; step < 24; step++) {
    await page.keyboard.press("Tab");

    const outside = await page.evaluate(() => {
      const card = document.querySelector('[role="dialog"][aria-modal="true"]');
      const element = document.activeElement;

      if (!card || !element || element === document.body) return null;
      if (card === element || card.contains(element)) return null;

      return `${element.tagName.toLowerCase()}.${String(element.className).slice(0, 40)}`;
    });

    if (outside) escaped.push(outside);
  }

  expect(
    Array.from(new Set(escaped)),
    "focus left the modal tutorial",
  ).toEqual([]);
});

test("closing gives focus back to the page", async ({ page }) => {
  await open(page);
  await expect(dialogOf(page)).toHaveCount(1);

  await page.keyboard.press("Escape");
  await expect(dialogOf(page)).toHaveCount(0, { timeout: 10_000 });

  // Focus landing on <body> after a dialog closes is the bug this guards: the
  // next Tab restarts at the top of the document, which on this app means
  // walking the whole sidebar again to get back to where you were.
  const landed = await page.evaluate(() => {
    const element = document.activeElement;

    if (!element) return "null";

    return element === document.body ? "body" : element.tagName.toLowerCase();
  });

  expect(landed, "focus was dropped on the document").not.toBe("body");
});
