import { expect, test, type Page } from "@playwright/test";

import { waitForHydration } from "./support/ui";

/**
 * Clicks during the theme cross-fade (decision 16.124).
 *
 * While a view transition runs, Chromium hit-tests the captured page as
 * <html>: before switch-theme.ts handed those presses on, 6 real clicks on
 * the toggle 100 ms apart gave 2 switches, and a link clicked right after a
 * switch did nothing. Real mouse input only; nothing here calls the handler.
 */

const TOGGLE = 'button[aria-label^="Alternar para tema"]';

async function openLogin(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("theme", "light");
    } catch {
      // A blocked storage only means the page starts on the system theme.
    }
  });
  await page.goto("/login");

  const toggle = page.locator(TOGGLE).filter({ visible: true }).first();

  await waitForHydration(toggle);
}

async function clickCenter(page: Page, selector: string): Promise<void> {
  const box = await page
    .locator(selector)
    .filter({ visible: true })
    .first()
    .boundingBox();

  if (!box) throw new Error(`${selector} has no box`);

  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

test.describe("theme switch input during the cross-fade", () => {
  test("every one of quick real clicks on the toggle switches the theme", async ({
    page,
  }) => {
    await openLogin(page);

    await page.evaluate(() => {
      const w = window as unknown as {
        themeWrites: string[];
        clickTargets: string[];
      };
      const write = Storage.prototype.setItem;

      w.themeWrites = [];
      w.clickTargets = [];
      Storage.prototype.setItem = function setItem(key: string, value: string) {
        if (key === "theme") w.themeWrites.push(value);

        return write.call(this, key, value);
      };
      document.addEventListener(
        "click",
        (event) => {
          w.clickTargets.push((event.target as Element).tagName);
        },
        true,
      );
    });

    // An odd count, so the page must end on the other theme.
    for (let index = 0; index < 7; index += 1) {
      await clickCenter(page, TOGGLE);
      await page.waitForTimeout(100);
    }

    await expect(page.locator("html")).not.toHaveAttribute(
      "data-theme-transition",
      /.*/,
    );

    const result = await page.evaluate(() => {
      const w = window as unknown as {
        themeWrites: string[];
        clickTargets: string[];
      };

      return { writes: w.themeWrites, targets: w.clickTargets };
    });

    expect(result.targets).not.toContain("HTML");
    expect(result.writes).toEqual([
      "dark",
      "light",
      "dark",
      "light",
      "dark",
      "light",
      "dark",
    ]);
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
    // The transition-suppression rule never outlives the switch.
    await expect(page.locator("style[data-theme-switch]")).toHaveCount(0);
  });

  test("a link clicked right after a switch still navigates", async ({
    page,
  }) => {
    await openLogin(page);

    await clickCenter(page, TOGGLE);
    await page.waitForTimeout(120);
    await clickCenter(page, 'a[href="/"]');

    await expect(page).toHaveURL(/\/$/, { timeout: 60_000 });
  });
});
