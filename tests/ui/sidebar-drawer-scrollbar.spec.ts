import { expect, test, type Page } from "@playwright/test";

import { managerForThisSpec } from "./support/operation";

/**
 * The sidebar on a real screen: the phone drawer reopened mid-close, and the
 * menu's scrollbar under the pointer.
 *
 * 1. Radix portals the drawer's overlay and panel separately (both z-50), so
 *    DOM order decides which paints on top. When the overlay finished its exit
 *    before the panel, a Ctrl+B pressed inside that gap mounted a new overlay
 *    after the panel and it covered the menu until tapped.
 * 2. The rail sat over the last 8px of the menu (where the thumb is) and the
 *    items ran under the bar, so grabbing the thumb collapsed the sidebar or
 *    hit a link.
 *
 * Unit side: tests/unitaires/sidebar-mobile-overlay-race.test.ts and
 * sidebar-scroll-area.test.tsx.
 */
const BASE = process.env.RESPONSIVE_BASE_URL ?? "http://localhost:3100";

async function open(page: Page, width: number, height: number): Promise<void> {
  // A config that hands in a signed-in storageState keeps its session.
  const signedIn = (await page.context().cookies()).some(
    (cookie) => cookie.name === "tkey",
  );

  if (!signedIn) {
    await page.context().addCookies([
      {
        name: "tkey",
        value: managerForThisSpec(),
        domain: "localhost",
        path: "/",
      },
    ]);
  }

  // No guided tour on top of the page.
  await page.addInitScript(() => {
    const real = Storage.prototype.getItem;

    Storage.prototype.getItem = function getItem(key: string) {
      if (key.startsWith("tutorial_")) return "true";

      return real.call(this, key);
    };
  });

  await page.setViewportSize({ width, height });
  await page.goto(`${BASE}/dashboard`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });

  expect(page.url(), "fell through to login").not.toContain("/login");
  await page.locator("[data-sidebar-trigger]").waitFor();
}

/** Opens the phone drawer once the page answers the shortcut (hydrated). */
async function openDrawer(page: Page): Promise<void> {
  const panel = page.locator('[data-mobile="true"][data-sidebar="sidebar"]');

  await expect(async () => {
    if ((await panel.count()) === 0) await page.keyboard.press("Control+b");
    await expect(panel).toHaveAttribute("data-state", "open", {
      timeout: 2_000,
    });
  }).toPass({ timeout: 30_000 });
}

type DrawerState = {
  mounted: boolean;
  state?: string | null;
  overlayAbove?: boolean;
  hitInside?: boolean;
};

function drawerState(page: Page): Promise<DrawerState> {
  return page.evaluate(() => {
    const panel = document.querySelector(
      '[data-mobile="true"][data-sidebar="sidebar"]',
    );

    if (!panel) return { mounted: false };

    const overlays = [...document.querySelectorAll('[class*="bg-black/80"]')];
    const rect = panel.getBoundingClientRect();
    const hit = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );

    return {
      mounted: true,
      state: panel.getAttribute("data-state"),
      overlayAbove: overlays.some(
        (overlay) =>
          panel.compareDocumentPosition(overlay) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ),
      hitInside: !!hit && panel.contains(hit),
    };
  });
}

test.describe("the phone drawer toggled quickly", () => {
  for (const width of [390, 320]) {
    test(`stays above its overlay when reopened during the close at ${width}px`, async ({
      page,
    }) => {
      await open(page, width, 800);
      await openDrawer(page);
      await page.keyboard.press("Escape");
      await expect(page.locator('[data-mobile="true"]')).toHaveCount(0);

      // Inside and around the window where only one of the two has finished.
      for (const gap of [0, 100, 170, 200, 230, 260, 290, 350]) {
        await page.keyboard.press("Control+b");
        await page.waitForTimeout(80);
        await page.keyboard.press("Control+b");
        await page.waitForTimeout(gap);
        await page.keyboard.press("Control+b");
        await page.waitForTimeout(700);

        const state = await drawerState(page);

        expect(state, `reopened ${gap}ms into the close`).toEqual({
          mounted: true,
          state: "open",
          overlayAbove: false,
          hitInside: true,
        });

        await page.keyboard.press("Escape");
        await page.waitForTimeout(900);
      }
    });
  }
});

type BarInfo = {
  barLeft: number;
  barRight: number;
  itemsRight: number;
  hits: string[];
} | null;

function barInfo(page: Page, scope: string): Promise<BarInfo> {
  return page.evaluate((selector) => {
    const area = document.querySelector(selector);
    const bar = area?.querySelector(':scope > [data-orientation="vertical"]');

    if (!area || !bar) return null;

    const thumb = bar.firstElementChild as HTMLElement;
    const barRect = bar.getBoundingClientRect();
    const thumbRect = thumb.getBoundingClientRect();
    const y = thumbRect.top + thumbRect.height / 2;
    const items = [
      ...area.querySelectorAll(
        '[data-sidebar="menu-button"],[data-sidebar="menu-sub-button"]',
      ),
    ];
    const hits = [
      barRect.left + 1,
      barRect.left + barRect.width / 2,
      barRect.right - 1,
    ].map((x) => {
      const hit = document.elementFromPoint(x, y);

      return hit && bar.contains(hit)
        ? "bar"
        : (hit?.getAttribute("data-sidebar") ?? hit?.tagName ?? "nothing");
    });

    return {
      barLeft: barRect.left,
      barRight: barRect.right,
      itemsRight: Math.max(
        ...items.map((item) => item.getBoundingClientRect().right),
      ),
      hits,
    };
  }, scope);
}

test.describe("the sidebar menu's scrollbar", () => {
  for (const [width, scope] of [
    [1440, "[data-sidebar-menu]"],
    [390, '[data-mobile="true"] [data-sidebar-menu]'],
  ] as const) {
    test(`is grabbable over its whole width and drags the menu at ${width}px`, async ({
      page,
    }) => {
      // Short enough for the menu to overflow.
      await open(page, width, 560);

      if (width < 768) {
        await openDrawer(page);
        await page.waitForTimeout(500);
      }

      const info = await barInfo(page, scope);

      expect(info, "the menu should overflow at this height").not.toBeNull();
      expect(info!.barRight - info!.barLeft).toBeGreaterThanOrEqual(12);
      expect(info!.hits).toEqual(["bar", "bar", "bar"]);
      expect(info!.itemsRight, "no item under the bar").toBeLessThanOrEqual(
        info!.barLeft + 0.5,
      );

      const thumb = page.locator(
        `${scope} > [data-orientation="vertical"] > div`,
      );
      const box = (await thumb.boundingBox())!;

      // Grab at the outermost pixel, the one the rail used to own.
      await page.mouse.move(box.x + box.width - 1, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(
        box.x + box.width - 1,
        box.y + box.height / 2 + 60,
        { steps: 6 },
      );
      await page.mouse.up();

      const after = await page.evaluate(
        (selector) => ({
          scrollTop:
            document.querySelector(
              `${selector} [data-radix-scroll-area-viewport]`,
            )?.scrollTop ?? 0,
          desktop: document
            .querySelector(".group.peer")
            ?.getAttribute("data-state"),
          phone: document
            .querySelector('[data-mobile="true"]')
            ?.getAttribute("data-state"),
        }),
        scope,
      );

      expect(after.scrollTop).toBeGreaterThan(0);

      if (width < 768) expect(after.phone).toBe("open");
      else expect(after.desktop).toBe("expanded");
    });
  }
});
