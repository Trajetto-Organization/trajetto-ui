import { test, expect, type Page } from "@playwright/test";

import { managerForThisSpec } from "./support/operation";

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
  /** Labels whose text does not fit the box drawn for it. */
  clipped: string[];
  /** Enabled items rendering no icon. */
  iconless: string[];
  /** Computed colour of the first item and of the destructive one. */
  neutralColor: string;
  destructiveColor: string | null;
}

async function openRowMenu(page: Page): Promise<MenuShape> {
  const trigger = page
    .getByRole("button", { name: /^Abrir menu de ações de / })
    .first();

  await expect(
    trigger,
    "nenhuma linha com menu de ações nesta tela",
  ).toBeVisible({ timeout: 30_000 });

  await trigger.click();

  const menu = page.getByRole("menu").first();
  await expect(menu).toBeVisible({ timeout: 10_000 });

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
      const clipped: string[] = [];
      const iconless: string[] = [];

      let destructiveColor: string | null = null;

      for (const item of items) {
        const text = (item.textContent ?? "").trim();
        labels.push(text);

        // The label lives in its own span so it can be measured; a fixed-width
        // menu shows up here as an ellipsis, which is how "Liberar para o
        // motorista" used to read as "Liberar para o motori…".
        const span = item.querySelector("span");

        if (span && span.scrollWidth > span.clientWidth + 1) clipped.push(text);

        const disabled = item.getAttribute("data-disabled") !== null;

        if (!disabled && item.querySelector("svg") === null) {
          iconless.push(text);
        }

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
        clipped,
        iconless,
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

test.describe("the row actions menu", () => {
  for (const screen of SCREENS) {
    test(`em ${screen.name} respeita o padrão do produto`, async ({ page }) => {
      await open(page, screen.path);

      const shape = await openRowMenu(page);

      expect(
        shape.labels.length,
        "o menu abriu vazio",
      ).toBeGreaterThanOrEqual(3);

      /**
       * The floor is the product's; the ceiling is what keeps a menu from
       * becoming a paragraph. Rotas sat at 230 with the same items every
       * other module renders at 160, and the gap between a short label and
       * its icon was the tell.
       */
      expect(shape.width).toBeGreaterThanOrEqual(160);
      expect(shape.width).toBeLessThanOrEqual(280);

      expect(
        shape.clipped,
        `rótulos cortados no menu: ${shape.clipped.join(", ")}`,
      ).toEqual([]);

      expect(
        shape.iconless,
        `itens habilitados sem ícone: ${shape.iconless.join(", ")}`,
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

  test("é o MESMO controle nas duas telas", async ({ page }) => {
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
});

test.describe("the Rotas table", () => {
  test("mostra identificador, datas de auditoria e o cabeçalho Ações", async ({
    page,
  }) => {
    await open(page, "/dashboard/routes");

    const headers = page.locator("table thead th");

    await expect(headers.first()).toBeVisible({ timeout: 30_000 });

    const titles = (await headers.allTextContents()).map((text) => text.trim());

    for (const expected of [
      "Identificador",
      "Rota",
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

  test("e o identificador da primeira linha é legível de verdade", async ({
    page,
  }) => {
    /**
     * A header named "Identificador" over an empty column is the same defect
     * wearing a label. What the support call needs is the id itself, on
     * screen, selectable.
     */
    await open(page, "/dashboard/routes");

    const firstCell = page.locator("table tbody tr").first().locator("td").first();

    await expect(firstCell).toBeVisible({ timeout: 30_000 });

    const text = (await firstCell.innerText()).trim();

    expect(
      text,
      `a primeira célula não parece um identificador: "${text}"`,
    ).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );

    // And it is not painted into a box narrower than itself.
    const clipped = await firstCell.evaluate((cell) => {
      const paragraph = cell.querySelector("p");

      if (!paragraph) return true;

      return paragraph.scrollWidth > paragraph.clientWidth + 1;
    });

    expect(clipped, "o identificador está cortado na célula").toBe(false);
  });
});

test.describe("the pagination footer", () => {
  test("não anuncia seleção numa tabela que não seleciona nada", async ({
    page,
  }) => {
    /**
     * Rotas has no checkbox column and the footer still read "0 de 1 linha(s)
     * selecionadas." — a counter for a control that is not on the screen.
     * Read by itself it says the selection is broken.
     */
    await open(page, "/dashboard/routes");

    const hasCheckbox = await page
      .locator('table thead input[type="checkbox"], table thead [role="checkbox"]')
      .count();

    expect(
      hasCheckbox,
      "a tabela de rotas ganhou seleção; este teste precisa ser revisto",
    ).toBe(0);

    await expect(page.getByText(/linha\(s\) selecionadas/)).toHaveCount(0);
    await expect(page.getByText(/linha\(s\) nesta página/)).toBeVisible();
  });

  test("e continua anunciando seleção onde ela existe", async ({ page }) => {
    // The other direction: Entregas does select rows, and the counter is what
    // tells the user how many will be assigned.
    await open(page, "/dashboard/deliveries");

    await expect(page.getByText(/linha\(s\) selecionadas/)).toBeVisible({
      timeout: 30_000,
    });
  });
});
