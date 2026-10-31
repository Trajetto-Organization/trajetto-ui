import { test, expect, type Page } from "./support/test";

import { managerForThisSpec, ownBranch } from "./support/operation";

import { readFileSync } from "node:fs";

/**
 * The three-dot menu, and the columns around it, as one design system.
 *
 * Rotas was built as its own thing: no identifier column, no audit dates, an
 * actions column with no header over it, and a menu 70px wider than the
 * thirty-eight others in the product. None of that is visible from inside the
 * module — it only shows up next to another screen, which is exactly where
 * the user found it.
 *
 * So the assertions here are mostly COMPARATIVE. "Rotas has an Ações header"
 * is a fact that rots the moment somebody renames the header; "Rotas and
 * Entregas open the same control" stays true as the product moves, and it is
 * the property that was actually broken.
 *
 * The control they must match is the legacy one the user approved (decision
 * 3.5): 160px, text only, a long label truncated with its full text in
 * `title`, the destructive act in red. An earlier version of this spec
 * required the opposite — a content-sized 160–280px menu with an icon on
 * every item — and was rewritten when the user rejected that design.
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

  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto(`${BASE}${path}`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });

  expect(page.url(), `fell through to login: ${path}`).not.toContain("/login");
}

/** What a row menu looks like once it is open, in numbers. */
interface MenuShape {
  width: number;
  /** Distance from the trigger's right edge to the menu's. */
  rightOffset: number;
  triggerWidth: number;
  triggerHeight: number;
  itemHeight: number;
  itemPaddingX: number;
  fontSize: number;
  labels: string[];
  /** Labels cut by the 160px box with no `title` to read them in full. */
  clippedWithoutTitle: string[];
  /** Items drawing an icon — the standard is text only. */
  withIcon: string[];
  /** Computed colour of the first item and of the destructive one. */
  neutralColor: string;
  destructiveColor: string | null;
}

async function openRowMenu(page: Page): Promise<MenuShape> {
  const trigger = page
    // The new menus name what they act on; the legacy ones say "Abrir Menu".
    .getByRole("button", { name: /^Abrir menu/i })
    .first();

  await expect(
    trigger,
    "nenhuma linha com menu de ações nesta tela",
  ).toBeVisible({ timeout: 30_000 });

  const menu = page.getByRole("menu").first();

  /*
    Opened until it stays open. Under three workers on a dev server the table
    is painted seconds before React hydrates it: a click in that gap opens
    nothing, and a menu opened just before a late re-render can close again
    before it is measured. Neither is the menu's shape, which is the question:
    once the page is live the same menu opens and stays open.
  */
  await expect(async () => {
    if ((await page.getByRole("menu").count()) === 0) await trigger.click();

    await expect(menu).toBeVisible({ timeout: 2_000 });

    // The menu opens with a zoom-in-95 animation: measured mid-flight the
    // 160px box reads 155 (scaled), and the test failed or passed depending
    // on how fast the machine was. Measure the menu at rest.
    await menu.evaluate(
      (element) =>
        Promise.all(
          element
            .getAnimations({ subtree: true })
            .map((animation) => animation.finished),
        ),
      undefined,
      { timeout: 2_000 },
    );

    await expect(menu).toBeVisible({ timeout: 500 });
  }).toPass({ timeout: 30_000 });

  const shape = await page.evaluate(() => {
    const panel = document.querySelector('[role="menu"]') as HTMLElement;
    const box = panel.getBoundingClientRect();

    /**
     * Read AFTER the menu opens, and that is not a detail.
     *
     * The table lives in a horizontally scrolling region, so clicking the
     * last column scrolls it into view: a box measured before the click
     * describes a button that has since moved a thousand pixels, and the
     * alignment check was comparing two different moments.
     */
    const trigger = document.querySelector(
      '[aria-haspopup="menu"][data-state="open"]',
    ) as HTMLElement;

    const triggerBox = trigger.getBoundingClientRect();

    const items = [
      ...panel.querySelectorAll('[role="menuitem"]'),
    ] as HTMLElement[];

    const first = items[0];
    const firstStyle = getComputedStyle(first);

    const labels: string[] = [];
    const clippedWithoutTitle: string[] = [];
    const withIcon: string[] = [];

    let destructiveColor: string | null = null;

    for (const item of items) {
      const text = (item.textContent ?? "").trim();
      labels.push(text);

      // A fixed 160px menu truncates a long label — "Liberar para o
      // motori…" — and that is the approved trade, as long as the whole
      // label is one hover away.
      const clipped = item.scrollWidth > item.clientWidth + 1;

      if (clipped && item.getAttribute("title") !== text) {
        clippedWithoutTitle.push(text);
      }

      if (item.querySelector("svg") !== null) withIcon.push(text);

      // Cancelling is the one destructive act these menus offer, and it is
      // supposed to look different from reading a detail.
      if (text.startsWith("Cancelar")) {
        destructiveColor = getComputedStyle(item).color;
      }
    }

    return {
      width: Math.round(box.width),
      rightOffset: Math.round(Math.abs(box.right - triggerBox.right)),
      triggerWidth: Math.round(triggerBox.width),
      triggerHeight: Math.round(triggerBox.height),

      // `offsetHeight` rather than the measured rectangle: the rectangle
      // carries the menu's own fractional position, and two identical items
      // read 31 and 32 depending on where their menu happened to land.
      itemHeight: first.offsetHeight,
      itemPaddingX: Math.round(parseFloat(firstStyle.paddingLeft)),
      fontSize: Math.round(parseFloat(firstStyle.fontSize)),
      labels,
      clippedWithoutTitle,
      withIcon,
      neutralColor: getComputedStyle(first).color,
      destructiveColor,
    };
  });

  // The icon button of the design system: 32 by 32, everywhere.
  expect(shape.triggerWidth).toBe(32);
  expect(shape.triggerHeight).toBe(32);

  return shape;
}

const SCREENS = [
  { path: "/dashboard/routes", name: "Rotas" },
  { path: "/dashboard/deliveries", name: "Entregas" },
];

/** A legacy screen whose menu the user holds up as the standard. */
const LEGACY = { path: "/dashboard/branch", name: "Filiais" };

test.describe("the row actions menu", () => {
  for (const screen of SCREENS) {
    test(`on ${screen.name} follows the product pattern`, async ({ page }) => {
      await open(page, screen.path);

      const shape = await openRowMenu(page);

      expect(shape.labels.length, "o menu abriu vazio").toBeGreaterThanOrEqual(
        3,
      );

      // The legacy width, exactly: Rotas sat at 230 with the same items
      // every other module renders at 160.
      expect(shape.width, "o menu não tem os 160px do padrão").toBe(160);

      expect(
        shape.clippedWithoutTitle,
        `rótulos cortados sem o texto inteiro no title: ${shape.clippedWithoutTitle.join(", ")}`,
      ).toEqual([]);

      expect(
        shape.withIcon,
        `itens com ícone (o padrão é só texto): ${shape.withIcon.join(", ")}`,
      ).toEqual([]);

      // Anchored to the trigger's right edge: the menu is the last column and
      // opening it leftwards pushes it off the table.
      expect(shape.rightOffset).toBeLessThanOrEqual(8);

      expect(
        shape.destructiveColor,
        "o menu não oferece o ato destrutivo; o teste precisa ser revisto",
      ).not.toBeNull();

      expect(
        shape.destructiveColor,
        "cancelar está pintado como qualquer outro item do menu",
      ).not.toBe(shape.neutralColor);
    });
  }

  test("is the SAME control on both screens", async ({ page }) => {
    /**
     * The assertion the module-by-module ones cannot make.
     *
     * Each screen above could satisfy its own limits and still look like a
     * different product — 160 here, 240 there, 32px rows against 36px. What
     * a design system promises is that the control is one control.
     */
    await open(page, SCREENS[0].path);
    const routes = await openRowMenu(page);

    await open(page, SCREENS[1].path);
    const deliveries = await openRowMenu(page);

    expect(
      deliveries.itemHeight,
      `altura do item: ${routes.itemHeight}px em Rotas, ${deliveries.itemHeight}px em Entregas`,
    ).toBe(routes.itemHeight);

    expect(deliveries.itemPaddingX).toBe(routes.itemPaddingX);
    expect(deliveries.fontSize).toBe(routes.fontSize);

    // Both carry the same vocabulary for the same act.
    expect(routes.labels).toContain("Ver detalhes");
    expect(deliveries.labels).toContain("Ver detalhes");

    expect(routes.labels).toContain("Copiar ID");
    expect(deliveries.labels).toContain("Copiar ID");
  });

  test("is the same control as the older screens", async ({ page }) => {
    // The comparison that matters to the user: the new modules against the
    // legacy menu they approved, not only against each other.
    await ownBranch(`Filial E2E ${Date.now()}`);
    await open(page, LEGACY.path);
    const legacy = await openRowMenu(page);

    for (const screen of SCREENS) {
      await open(page, screen.path);
      const shape = await openRowMenu(page);

      expect(shape.width, `${screen.name} × ${LEGACY.name}`).toBe(legacy.width);
      expect(shape.itemHeight).toBe(legacy.itemHeight);
      expect(shape.fontSize).toBe(legacy.fontSize);
    }
  });

  test("has no eye button next to the menu", async ({ page }) => {
    // "Ver detalhes" is an item of the menu; a second button beside the three
    // dots made Entregas and Rotas the only tables with two row controls.
    for (const screen of SCREENS) {
      await open(page, screen.path);

      const firstRow = page.locator("table tbody tr").first();

      await expect(firstRow).toBeVisible({ timeout: 30_000 });

      await expect(
        firstRow.getByRole("button", { name: /^Ver detalhes/ }),
        `${screen.name} ainda tem o botão de olho na linha`,
      ).toHaveCount(0);
    }
  });
});

test.describe("the Rotas table", () => {
  test("shows the identifier, the audit dates and the Ações header", async ({
    page,
  }) => {
    await open(page, "/dashboard/routes");

    const headers = page.locator("table thead th");

    await expect(headers.first()).toBeVisible({ timeout: 30_000 });

    const titles = (await headers.allTextContents()).map((text) => text.trim());

    // The record id first, as in every table (spec §5), then the code.
    expect(titles[0]).toBe("ID");

    for (const expected of [
      "ID",
      "Código",
      "Conclusão",
      "Data de criação",
      "Data de atualização",
      "Ações",
    ]) {
      expect(
        titles,
        `coluna ausente no cabeçalho: ${expected} — cabeçalho atual: ${titles.join(" | ")}`,
      ).toContain(expected);
    }
  });

  test("and the identifier of the first row is really readable", async ({
    page,
  }) => {
    /**
     * A header over an empty column is the same defect wearing a label. The
     * first cell is the record id, compact (its last twelve characters, the
     * full one in the tooltip); the support call's route code ("Rota 42",
     * sequential per company) is the next one, on screen and readable.
     */
    await open(page, "/dashboard/routes");

    const cells = page.locator("table tbody tr").first().locator("td");
    const idCell = cells.first();

    await expect(idCell).toBeVisible({ timeout: 30_000 });

    // What is painted (the screen-reader copy of the full id is in the
    // cell's text too, visually hidden).
    expect(
      (await idCell.locator('[aria-hidden="true"]').innerText()).trim(),
    ).toMatch(/^[0-9a-f]{12}$/);
    expect(await idCell.locator("p[title]").getAttribute("title")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );

    const firstCell = cells.nth(1);
    const text = (await firstCell.innerText()).trim();

    expect(
      text,
      `a célula do código não parece um identificador: "${text}"`,
    ).toMatch(/^Rota \d+/);

    // And it is not painted into a box narrower than itself.
    const clipped = await firstCell.evaluate((cell) => {
      const link = cell.querySelector("a");

      if (!link) return true;

      return link.scrollWidth > link.clientWidth + 1;
    });

    expect(clipped, "o identificador está cortado na célula").toBe(false);
  });

  test("and Copiar ID copies the whole id the first cell abbreviates", async ({
    page,
  }) => {
    // The table shows twelve characters; the clipboard must get all 36.
    await page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"], {
        origin: BASE,
      });
    await open(page, "/dashboard/routes");

    const full = await page
      .locator("table tbody tr")
      .first()
      .locator("td")
      .first()
      .locator("p[title]")
      .getAttribute("title");

    const menu = await openRowMenu(page);

    expect(menu.labels).toContain("Copiar ID");

    await page
      .getByRole("menuitem", { name: "Copiar ID", exact: true })
      .click();

    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(full);
    expect(full).toHaveLength(36);
  });
});

test.describe("the pagination footer", () => {
  test("does not announce selection on a table that selects nothing", async ({
    page,
  }) => {
    /**
     * Rotas has no checkbox column and the footer still read "0 de 1 linha(s)
     * selecionadas." — a counter for a control that is not on the screen.
     * Read by itself it says the selection is broken.
     */
    await open(page, "/dashboard/routes");

    const hasCheckbox = await page
      .locator(
        'table thead input[type="checkbox"], table thead [role="checkbox"]',
      )
      .count();

    expect(
      hasCheckbox,
      "a tabela de rotas ganhou seleção; este teste precisa ser revisto",
    ).toBe(0);

    await expect(page.getByText(/linha\(s\) selecionadas/)).toHaveCount(0);
    await expect(page.getByText(/linha\(s\) nesta página/)).toBeVisible();
  });

  test("and keeps announcing selection where it exists", async ({ page }) => {
    // The other direction: Entregas does select rows, and the counter is what
    // tells the user how many will be assigned.
    await open(page, "/dashboard/deliveries");

    await expect(page.getByText(/linha\(s\) selecionadas/)).toBeVisible({
      timeout: 30_000,
    });
  });
});
