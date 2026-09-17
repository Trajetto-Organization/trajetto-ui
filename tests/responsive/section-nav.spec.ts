import { managerToken } from "../ui/support/operation";

import { test, expect, type Page } from "@playwright/test";

import { readFileSync } from "node:fs";

/**
 * Ten sections and a 360px screen.
 *
 * Entregas has ten tabs. Laid out as a strip they want about 1431px, and the
 * strip kept the browser's own scrollbar to reach the rest — which on Windows
 * is a grey slab drawn INSIDE the 40px box. It ate enough of those 40 pixels
 * that the content no longer fit vertically either, so a row of tabs came out
 * with a horizontal scrollbar, a vertical scrollbar and two little arrows. On
 * a phone that is the first thing on the screen.
 *
 * Below `md` the sections are a menu naming the one you are on. From `md` up
 * they are the strip, scrolled with the product's own controls. This is the
 * test that keeps those two compositions from collapsing back into one that
 * stretches.
 */
const CONTEXT = JSON.parse(
  readFileSync("../trajetto-api/tests/load/fixtures/load-context.json", "utf8"),
);

const BASE = process.env.RESPONSIVE_BASE_URL ?? "http://localhost:3100";

/** The widths from the user's list. */
const PHONES = [320, 360, 375, 390, 430];

async function open(page: Page, width: number): Promise<void> {
  await page.context().addCookies([
    {
      name: "tkey",
      value: managerToken(),
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

  await page.goto(`${BASE}/dashboard/deliveries`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });

  expect(page.url(), `@${width}px fell through to login`).not.toContain(
    "/login",
  );
}

const nav = (page: Page) =>
  page.getByRole("navigation", { name: "Seções de entregas" });

test.describe("as seções de Entregas num celular", () => {
  for (const width of PHONES) {
    test(`a ${width}px não têm barra de rolagem alguma`, async ({ page }) => {
      await open(page, width);

      const strip = nav(page);

      await expect(strip).toBeVisible({ timeout: 30_000 });

      const verdict = await strip.evaluate((element) => {
        const boxes = [element, ...element.querySelectorAll("*")];

        let horizontal = 0;
        let vertical = 0;

        for (const box of boxes) {
          if (!(box instanceof HTMLElement)) continue;

          const style = getComputedStyle(box);

          /**
           * `offsetHeight - clientHeight` is borders PLUS scrollbar, and the
           * borders have to come out or every bordered control reads as
           * having a 2px scrollbar. What is left is what the operating
           * system took — the 15px slab that used to eat this strip.
           */
          const bordersY =
            parseFloat(style.borderTopWidth) +
            parseFloat(style.borderBottomWidth);

          const bordersX =
            parseFloat(style.borderLeftWidth) +
            parseFloat(style.borderRightWidth);

          horizontal = Math.max(
            box.offsetHeight - box.clientHeight - bordersY,
            horizontal,
          );

          vertical = Math.max(
            box.offsetWidth - box.clientWidth - bordersX,
            vertical,
          );
        }

        return {
          horizontal,
          vertical,
          height: (element as HTMLElement).offsetHeight,
        };
      });

      expect(
        verdict.horizontal,
        "a faixa de seções perdeu altura para uma barra de rolagem horizontal",
      ).toBeLessThanOrEqual(1);

      expect(
        verdict.vertical,
        "a faixa de seções ganhou uma barra de rolagem VERTICAL",
      ).toBeLessThanOrEqual(1);

      // One control, one line. A strip that wrapped into three rows would
      // satisfy everything above and still be the defect.
      expect(verdict.height).toBeLessThanOrEqual(48);
    });
  }

  test("abrem todas as seções num menu", async ({ page }) => {
    await open(page, 390);

    // The section you are on, named on the control itself — the whole reason
    // a menu is acceptable here.
    await expect(nav(page).getByText("Entregas", { exact: true })).toBeVisible();

    await nav(page).getByRole("button").click();

    const menu = page.getByRole("menu");

    await expect(menu).toBeVisible();

    for (const section of [
      "Ocorrências",
      "Monitoramento",
      "Chat",
      "Embarcadores",
      "Auditoria de Comprovantes",
    ]) {
      await expect(
        menu.getByRole("menuitem", { name: new RegExp(section) }),
        `${section} não está no menu de seções`,
      ).toBeVisible();
    }

    // And they navigate, because they are links.
    await menu.getByRole("menuitem", { name: /Embarcadores/ }).click();

    await expect(page).toHaveURL(/tab=shippers/);
  });

  for (const width of PHONES) {
    test(`e a barra de ações a ${width}px cabe numa linha`, async ({ page }) => {
      /**
       * Four full-width buttons stacked — Exportar, Importar, Revalidar, Nova
       * Entrega — put about 160px between the page title and the first
       * delivery. Exportar and Importar are desk work; on a phone they belong
       * in the overflow, and the row carries refresh and the thing being
       * created.
       */
      await open(page, width);

      const create = page.getByRole("button", { name: /Nova Entrega/ });

      await expect(create).toBeVisible({ timeout: 30_000 });

      const bar = page.locator("div", { has: create }).last();

      const height = await bar.evaluate(
        (element) => (element as HTMLElement).offsetHeight,
      );

      expect(
        height,
        `a barra de ações ocupa ${height}px de altura a ${width}px`,
      ).toBeLessThanOrEqual(56);

      /**
       * The refresh control is the arrows and nothing else.
       *
       * "Revalidar Dados" is fourteen characters of a button the user already
       * recognises by its icon, and on a 320px row those characters are what
       * squeeze the one action they came here for. The NAME stays — a screen
       * reader still hears it — which is the difference between compact and
       * mutilated.
       */
      const refresh = page.getByRole("button", { name: "Revalidar Dados" });

      await expect(refresh).toBeVisible();

      const compact = await refresh.evaluate((element) => ({
        width: element.getBoundingClientRect().width,

        // The box is `w-9` either way, so its width alone proves nothing: a
        // button still carrying "Revalidar Dados" is simply a 36px box with
        // the words spilling out of it. What gives it away is the overflow.
        clipped: element.scrollWidth > element.clientWidth + 1,
      }));

      expect(
        compact.width,
        `o botão de atualizar ocupa ${Math.round(compact.width)}px da linha`,
      ).toBeLessThanOrEqual(44);

      expect(
        compact.clipped,
        "o botão de atualizar continua com o texto dentro, cortado pela caixa",
      ).toBe(false);

      // The desk-only actions are gone from the row and reachable from the
      // overflow, not simply removed.
      await expect(
        page.getByRole("button", { name: "Exportar" }),
      ).toHaveCount(0);

      await page.getByRole("button", { name: "Mais ações desta seção" }).click();

      const menu = page.getByRole("menu");

      await expect(menu.getByRole("menuitem", { name: /Exportar CSV/ })).toBeVisible();
      await expect(
        menu.getByRole("menuitem", { name: /Importar planilha/ }),
      ).toBeVisible();
    });
  }
});

test.describe("as mesmas seções numa tela grande", () => {
  test("voltam a ser a faixa, sem a barra do sistema", async ({ page }) => {
    await open(page, 1440);

    const strip = nav(page);

    await expect(strip).toBeVisible({ timeout: 30_000 });

    // The strip, not the menu: every section is a link the eye can scan.
    await expect(strip.getByRole("link", { name: /Ocorrências/ })).toBeVisible();

    const verdict = await strip.evaluate((element) => {
      const list = element.querySelector("ul") as HTMLElement;

      return {
        lostToScrollbar: list.offsetHeight - list.clientHeight,
        overflows: list.scrollWidth > list.clientWidth + 1,
        scrolledTo: list.scrollLeft,
        scrollbarWidth: getComputedStyle(list).scrollbarWidth,
      };
    });

    /**
     * Asked of the style, not of the layout, and that is forced.
     *
     * Headless Chromium draws OVERLAY scrollbars: they take no space, so
     * `offsetHeight - clientHeight` reads zero whether the bar is suppressed
     * or not, and removing the rule outright survived a measurement of it.
     * The user's Windows draws a classic 15px slab inside the box. What can
     * be checked from here is the declaration that decides it.
     */
    expect(
      verdict.scrollbarWidth,
      "a faixa voltou a usar a barra de rolagem do sistema, que no Windows é desenhada dentro da caixa de 40px",
    ).toBe("none");

    expect(
      verdict.lostToScrollbar,
      "a faixa continua perdendo altura para a barra de rolagem do sistema",
    ).toBeLessThanOrEqual(1);

    expect(
      verdict.overflows,
      "as dez seções passaram a caber em 1440px; este teste precisa ser revisto",
    ).toBe(true);

    // Something has to reach what is off-screen, since the scrollbar is gone.
    await expect(
      strip.locator("button").last(),
      "sem barra de rolagem e sem controle: as seções finais ficaram inalcançáveis",
    ).toBeVisible();

    // And on a desk the refresh button says what it does: the compact form is
    // for the phone, not a permanent amputation.
    await expect(
      page.getByRole("button", { name: "Revalidar Dados" }),
    ).toContainText("Revalidar Dados");
  });

  test("e abrem já mostrando a seção em que você está", async ({ page }) => {
    /**
     * Opening Auditoria de Comprovantes from a link used to land on a strip
     * scrolled to the start, with the active section somewhere off to the
     * right — the one thing the strip exists to show.
     */
    await page.context().addCookies([
      {
        name: "tkey",
        value: managerToken(),
        domain: "localhost",
        path: "/",
      },
    ]);

    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto(`${BASE}/dashboard/deliveries?tab=proof-audits`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });

    const strip = nav(page);

    await expect(strip).toBeVisible({ timeout: 30_000 });

    const visible = await strip.evaluate((element) => {
      const list = element.querySelector("ul") as HTMLElement;

      const current = list.querySelector<HTMLElement>('[aria-current="page"]');

      if (!current) return null;

      return {
        left: current.offsetLeft - list.scrollLeft,
        right: current.offsetLeft + current.offsetWidth - list.scrollLeft,
        width: list.clientWidth,
      };
    });

    expect(visible, "nenhuma seção está marcada como atual").not.toBeNull();

    expect(
      visible!.left >= 0 && visible!.right <= visible!.width,
      `a seção ativa está fora da área visível da faixa (${visible!.left} a ${visible!.right} em ${visible!.width}px)`,
    ).toBe(true);
  });
});
