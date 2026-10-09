import { managerToken } from "../ui/support/operation";
import { waitForHydration } from "../ui/support/ui";

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

test.describe("the Entregas sections on a phone", () => {
  for (const width of PHONES) {
    test(`at ${width}px have no scrollbar at all`, async ({ page }) => {
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

  test("open every section in a menu", async ({ page }) => {
    await open(page, 390);

    // The section you are on, named on the control itself — the whole reason
    // a menu is acceptable here.
    await expect(
      nav(page).getByText("Entregas", { exact: true }),
    ).toBeVisible();

    await nav(page).getByRole("button").click();

    const menu = page.getByRole("menu");

    await expect(menu).toBeVisible();

    for (const section of [
      "Ocorrências",
      "Monitoramento",
      "Atendimentos",
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
    test(`and the action bar at ${width}px stacks at full width, with a label`, async ({
      page,
    }) => {
      /**
       * Decision 3.6, the user's standard from the legacy screens: on a phone
       * every button of the row stacks at full width WITH its label —
       * Atualizar included.
       *
       * An earlier version of this test required the opposite (Atualizar as a
       * 36px icon, Exportar and Importar folded into a "Mais ações" menu) and
       * was rewritten when the user rejected that design.
       */
      await open(page, width);

      const create = page.getByRole("button", { name: /Nova Entrega/ });

      await expect(create).toBeVisible({ timeout: 30_000 });

      const refresh = page.getByRole("button", { name: "Atualizar" });

      await expect(refresh).toBeVisible();

      // The words are on the button, not only in its accessible name.
      await expect(refresh).toContainText("Atualizar");

      const actions = page.locator("[data-toolbar-actions]");

      const widths = await actions.evaluate((container) => {
        const box = container.getBoundingClientRect();

        const buttons = Array.from(
          container.querySelectorAll<HTMLElement>("button"),
        ).filter((button) => button.offsetParent !== null);

        return {
          container: box.width,
          buttons: buttons.map((button) => ({
            name: (button.textContent ?? "").trim(),
            width: button.getBoundingClientRect().width,
            clipped: button.scrollWidth > button.clientWidth + 1,
          })),
        };
      });

      expect(widths.buttons.length).toBeGreaterThanOrEqual(2);

      for (const button of widths.buttons) {
        expect(
          Math.abs(button.width - widths.container),
          `"${button.name}" ocupa ${Math.round(button.width)}px de ${Math.round(widths.container)}px a ${width}px`,
        ).toBeLessThanOrEqual(2);

        expect(
          button.clipped,
          `"${button.name}" está com o texto cortado`,
        ).toBe(false);
      }

      // Exportar is a button of the row like the others, not folded away.
      await expect(
        page.getByRole("button", { name: "Exportar" }),
      ).toBeVisible();
    });
  }
});

test.describe("the same sections on a large screen", () => {
  test("go back to being the strip, without the system bar", async ({
    page,
  }) => {
    await open(page, 1440);

    const strip = nav(page);

    await expect(strip).toBeVisible({ timeout: 30_000 });

    // The strip, not the menu: every section is a link the eye can scan.
    await expect(
      strip.getByRole("link", { name: /Ocorrências/ }),
    ).toBeVisible();

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

    // And the refresh button says what it does, on a desk as on a phone.
    await expect(page.getByRole("button", { name: "Atualizar" })).toContainText(
      "Atualizar",
    );
  });

  test("and open already showing the section you are on", async ({ page }) => {
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

test.describe("the tab strips that are not Entregas", () => {
  /**
   * Decision 3.1: every strip of tabs or chips overflows like Entregas' —
   * one line, faded edges and arrows, no operating-system scrollbar.
   * Integrações used to wrap onto a second line at 768px, and the /admin and
   * /dashboard overview drew a horizontal AND a vertical bar inside the 40px
   * box on Windows.
   */
  async function openAt(
    page: Page,
    width: number,
    path: string,
  ): Promise<void> {
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

    await page.goto(`${BASE}${path}`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
  }

  test("Integrações at 768px stays on one line and scrolls with the arrows", async ({
    page,
  }) => {
    await openAt(page, 768, "/dashboard/integrations");

    const strip = page.getByRole("navigation", {
      name: "Seções de integrações",
    });

    await expect(strip).toBeVisible({ timeout: 30_000 });

    // The arrows are drawn by the hydrated rail; the server's HTML has none.
    // "networkidle" is not hydration on a busy dev server, so wait for React
    // to own the list and give the first measurement a moment to land.
    await waitForHydration(strip.locator("ul"));
    await expect
      .poll(() =>
        strip.evaluate((element) => {
          const list = element.querySelector("ul") as HTMLElement;

          return (
            list.scrollWidth <= list.clientWidth + 1 ||
            element.querySelectorAll("[data-scroll-edge]").length > 0
          );
        }),
      )
      .toBe(true);

    const verdict = await strip.evaluate((element) => {
      const list = element.querySelector("ul") as HTMLElement;

      return {
        height: list.offsetHeight,
        scrollbarWidth: getComputedStyle(list).scrollbarWidth,
        wraps: getComputedStyle(list).flexWrap,
        overflows: list.scrollWidth > list.clientWidth + 1,
        arrows: element.querySelectorAll("[data-scroll-edge]").length,
      };
    });

    expect(verdict.wraps).not.toBe("wrap");
    expect(verdict.height).toBeLessThanOrEqual(40);
    expect(verdict.scrollbarWidth).toBe("none");

    if (verdict.overflows) {
      expect(
        verdict.arrows,
        "as abas não cabem e não há seta para alcançar as escondidas",
      ).toBeGreaterThan(0);
    }
  });

  for (const width of [320, 360, 390, 768, 1024]) {
    test(`the /dashboard overview at ${width}px does not scroll vertically`, async ({
      page,
    }) => {
      await openAt(page, width, "/dashboard");

      const list = page.locator('[data-tutorial="dashboard-tabs"]');

      await expect(list).toBeVisible({ timeout: 30_000 });

      const verdict = await list.evaluate((element) => {
        const style = getComputedStyle(element);

        return {
          overflowY: style.overflowY,
          scrollbarWidth: style.scrollbarWidth,
          verticalOverflow: element.scrollHeight > element.clientHeight + 1,
          height: (element as HTMLElement).offsetHeight,
        };
      });

      expect(verdict.overflowY).toBe("hidden");
      expect(verdict.scrollbarWidth).toBe("none");
      expect(verdict.verticalOverflow).toBe(false);
      expect(verdict.height).toBeLessThanOrEqual(40);
    });
  }
});
