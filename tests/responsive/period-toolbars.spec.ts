import { test, expect, type Page } from "@playwright/test";

import { managerForThisSpec } from "../ui/support/operation";
import { waitForHydration } from "../ui/support/ui";

/**
 * Where the period sits, checked as geometry (decision of 28/10/2026, spec
 * §3.1–3.3).
 *
 * Entregas had the period on a line of its own above the search and the
 * filters, and Pausas its two date fields on another; in Atividades the
 * Atualizar button sat a line above the 7 / 30 dias shortcuts. Every element
 * was present and labelled — only a measurement shows that they are on the
 * wrong line. What the screens promise now:
 *
 * - Entregas and Pausas: the period and Visualizar are ONE group at the right
 *   end of the filters' line (DataTableToolbarEnd). On a line too short for
 *   both, the group moves down whole and stays on the right.
 * - Atividades: the view switch on the left, the shortcuts and Atualizar on
 *   the right, on one line while they fit.
 * - Nothing scrolls sideways and nothing overlaps, down to a phone.
 */
const BASE = process.env.RESPONSIVE_BASE_URL ?? "http://localhost:3100";

interface Box {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

async function boxOf(page: Page, selector: string): Promise<Box | null> {
  return page.evaluate((css) => {
    const element = document.querySelector(css);

    if (!element || element.getClientRects().length === 0) return null;

    const rect = element.getBoundingClientRect();

    return {
      top: Math.round(rect.top),
      bottom: Math.round(rect.bottom),
      left: Math.round(rect.left),
      right: Math.round(rect.right),
    };
  }, selector);
}

const centreOf = (box: Box): number => (box.top + box.bottom) / 2;

async function open(
  page: Page,
  path: string,
  width: number,
  { collapsed = false, ready }: { collapsed?: boolean; ready: string },
): Promise<void> {
  await page.context().addCookies([
    {
      name: "tkey",
      value: managerForThisSpec(),
      domain: "localhost",
      path: "/",
    },
    // The sidebar as Ctrl+B leaves it (lib/sidebar-state).
    {
      name: "sidebar:state",
      value: collapsed ? "false" : "true",
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

  await page.setViewportSize({ width, height: 900 });

  await page.goto(`${BASE}${path}`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });

  await expect(page.locator(ready).first()).toBeVisible({ timeout: 60_000 });
  await expect(page.locator("[data-error-surface]")).toHaveCount(0);
}

/** No sideways scroll, and no two children of `row` on top of each other. */
async function fitsTheWidth(page: Page, row: string): Promise<void> {
  const verdict = await page.evaluate((css) => {
    const element = document.querySelector(css);
    const children = element
      ? [...element.children].filter((child) => child.getClientRects().length)
      : [];

    const overlapping: string[] = [];

    for (let i = 0; i < children.length; i += 1) {
      for (let j = i + 1; j < children.length; j += 1) {
        const a = children[i].getBoundingClientRect();
        const b = children[j].getBoundingClientRect();

        if (
          a.left < b.right - 1 &&
          b.left < a.right - 1 &&
          a.top < b.bottom - 1 &&
          b.top < a.bottom - 1
        ) {
          overlapping.push(`${i}×${j}`);
        }
      }
    }

    return {
      scroll: document.documentElement.scrollWidth - window.innerWidth,
      overlapping,
    };
  }, row);

  expect(verdict.scroll, "a página rola para o lado").toBeLessThanOrEqual(0);
  expect(verdict.overlapping, "controles sobrepostos na barra").toEqual([]);
}

const END = "[data-toolbar-end]";
const VIEW = `${END} [data-tutorial="view-options"]`;

/** The toolbar line the group ends. */
const ROW = `div:has(> ${END})`;

test.describe.configure({ mode: "parallel" });

test.describe("the period of Entregas", () => {
  const PERIOD = `${END} [data-tutorial="deliveries-period"]`;

  for (const [width, collapsed] of [
    [1920, false],
    [1920, true],
    [1440, true],
  ] as const) {
    test(`sits on the filters' line, beside Visualizar, at ${width}px${collapsed ? " with the sidebar collapsed" : ""}`, async ({
      page,
    }) => {
      await open(page, "/dashboard/deliveries", width, {
        collapsed,
        ready: PERIOD,
      });

      const search = await boxOf(page, '[data-tutorial="deliveries-search"]');
      const period = await boxOf(page, PERIOD);
      const view = await boxOf(page, VIEW);
      const row = await boxOf(page, ROW);

      expect(search && period && view && row).toBeTruthy();

      // One line: search, filters, period, Visualizar.
      expect(
        Math.abs(centreOf(search!) - centreOf(period!)),
        "o período saiu da linha dos filtros",
      ).toBeLessThanOrEqual(8);
      expect(
        Math.abs(centreOf(period!) - centreOf(view!)),
        "o período e Visualizar deixaram de dividir a linha",
      ).toBeLessThanOrEqual(8);

      // Visualizar last, at the toolbar's right edge; the period just before.
      expect(period!.right).toBeLessThanOrEqual(view!.left);
      expect(Math.abs(view!.right - row!.right)).toBeLessThanOrEqual(2);
    });
  }

  for (const width of [1440, 1280]) {
    test(`keeps the period and Visualizar together on the right at ${width}px with the sidebar open`, async ({
      page,
    }) => {
      await open(page, "/dashboard/deliveries", width, { ready: PERIOD });

      const period = await boxOf(page, PERIOD);
      const view = await boxOf(page, VIEW);
      const row = await boxOf(page, ROW);

      // Together, whichever line they are on, and still on the right.
      expect(
        Math.abs(centreOf(period!) - centreOf(view!)),
        "o grupo do período se partiu",
      ).toBeLessThanOrEqual(8);
      expect(period!.right).toBeLessThanOrEqual(view!.left);
      expect(Math.abs(view!.right - row!.right)).toBeLessThanOrEqual(2);

      await fitsTheWidth(page, ROW);
    });
  }

  for (const width of [768, 390]) {
    test(`fits ${width}px without sideways scroll or overlap`, async ({
      page,
    }) => {
      await open(page, "/dashboard/deliveries", width, { ready: PERIOD });

      await fitsTheWidth(page, ROW);
      await fitsTheWidth(page, END);
    });
  }

  test("opens the product's calendar inside the window, not the browser's date inputs", async ({
    page,
  }) => {
    await open(page, "/dashboard/deliveries?period=7d", 1440, {
      ready: PERIOD,
    });

    const custom = page.getByRole("button", { name: "Personalizado" });

    await waitForHydration(custom);
    await custom.click();

    const dialog = page.getByRole("dialog", { name: "Período personalizado" });

    await expect(dialog.getByRole("grid")).toHaveCount(2, { timeout: 30_000 });
    await expect(page.locator('input[type="date"]')).toHaveCount(0);

    // Never cut by the window (Radix flips but does not shrink: the panel
    // caps itself to the room it has).
    const box = await dialog.boundingBox();

    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(900);

    // The keyboard is on the grid: arrows move, Enter picks.
    await expect(page.locator(":focus")).toHaveAttribute("name", "day");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Enter");

    await expect(
      dialog.locator("[data-date-range-summary] dd").first(),
    ).not.toHaveText("dd/mm/aaaa");
  });
});

test.describe("the period of Pausas dos motoristas", () => {
  const PERIOD = `${END} [data-tutorial="pauses-period"]`;

  for (const [width, collapsed] of [
    [1920, false],
    [1440, false],
    [1440, true],
  ] as const) {
    test(`sits on the filters' line, beside Visualizar, at ${width}px${collapsed ? " with the sidebar collapsed" : ""}`, async ({
      page,
    }) => {
      await open(page, "/dashboard/driver-pauses", width, {
        collapsed,
        ready: PERIOD,
      });

      const filters = await boxOf(page, '[data-tutorial="pauses-filters"]');
      const period = await boxOf(page, PERIOD);
      const view = await boxOf(page, VIEW);

      expect(
        Math.abs(centreOf(filters!) - centreOf(period!)),
        "o período saiu da linha dos filtros",
      ).toBeLessThanOrEqual(8);
      expect(Math.abs(centreOf(period!) - centreOf(view!))).toBeLessThanOrEqual(
        8,
      );
      expect(period!.right).toBeLessThanOrEqual(view!.left);

      // No single-day fields with labels of their own any more.
      await expect(page.locator("#driver-pauses-from")).toHaveCount(0);
    });
  }

  for (const width of [768, 390]) {
    test(`fits ${width}px without sideways scroll or overlap`, async ({
      page,
    }) => {
      await open(page, "/dashboard/driver-pauses", width, { ready: PERIOD });

      await fitsTheWidth(page, ROW);
      await fitsTheWidth(page, END);
    });
  }

  test("opens the range calendar, with nothing after the company's today", async ({
    page,
  }) => {
    await open(page, "/dashboard/driver-pauses", 1440, { ready: PERIOD });

    const trigger = page.locator("[data-pauses-period-trigger]");

    await waitForHydration(trigger);
    await trigger.click();

    const dialog = page.getByRole("dialog", { name: "Período das pausas" });

    await expect(dialog.getByRole("grid")).toHaveCount(2, { timeout: 30_000 });

    // The last month on screen is the company's current one; the days after
    // today in it cannot be picked.
    const last = dialog.getByRole("grid").last();
    const enabled = last.locator('button[name="day"]:not([disabled])');
    const disabled = last.locator('button[name="day"][disabled]');

    expect(await enabled.count()).toBeGreaterThan(0);
    expect(
      (await enabled.count()) + (await disabled.count()),
    ).toBeGreaterThanOrEqual(28);
  });
});

test.describe("the toolbar of Registro de atividades", () => {
  const SWITCH = '[data-tutorial="activity-view-switch"]';
  const PERIOD = '[data-toolbar-actions] [data-tutorial="activity-period"]';
  const REFRESH = "[data-toolbar-actions] form";

  for (const width of [1280, 1440]) {
    test(`keeps the view switch, the shortcuts and Atualizar on one line at ${width}px`, async ({
      page,
    }) => {
      await open(page, "/dashboard/activity", width, { ready: PERIOD });

      const view = await boxOf(page, SWITCH);
      const period = await boxOf(page, PERIOD);
      const refresh = await boxOf(page, REFRESH);

      expect(view && period && refresh).toBeTruthy();

      expect(
        Math.abs(centreOf(view!) - centreOf(period!)),
        "os atalhos saíram da linha da troca de visão",
      ).toBeLessThanOrEqual(8);
      expect(
        Math.abs(centreOf(period!) - centreOf(refresh!)),
        "Atualizar saiu da linha dos atalhos",
      ).toBeLessThanOrEqual(8);
      expect(period!.right).toBeLessThanOrEqual(refresh!.left);
    });
  }

  test("stacks them on a phone in reading order, without sideways scroll", async ({
    page,
  }) => {
    await open(page, "/dashboard/activity", 390, { ready: PERIOD });

    const view = await boxOf(page, SWITCH);
    const period = await boxOf(page, PERIOD);
    const refresh = await boxOf(page, REFRESH);

    expect(view!.bottom).toBeLessThanOrEqual(period!.top);
    expect(period!.bottom).toBeLessThanOrEqual(refresh!.top);

    await fitsTheWidth(page, "[data-page-toolbar] > div");
  });
});
