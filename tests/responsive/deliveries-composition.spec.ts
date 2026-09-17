import { test, expect, type Page } from "@playwright/test";

import {
  fixtureBusinessId,
  managerToken,
  openAsMaster,
} from "../ui/support/operation";

/**
 * The shape of the Entregas page, checked as geometry rather than as markup.
 *
 * Every defect this file guards was invisible to the suite that already
 * existed, and for the same reason: the elements were all present, all
 * accessible, all correctly labelled, and in the wrong places. A test that
 * asks "is there a button called Nova Entrega" passes whether the button sits
 * above the sections, below them, or in the footer.
 *
 * What the page promises:
 *
 *   contexto   — the company, on /admin
 *   ações      — what can be done to it, on the same line while it fits
 *   navegação  — the sections, spanning the page
 *   conteúdo   — the section that is open
 *
 * With one deliberate exception, which is also here: Auditoria de
 * Comprovantes keeps its refresh next to its own Na fila / Aprovados /
 * Rejeitados counters, because that is what it changes.
 */
const BASE = process.env.RESPONSIVE_BASE_URL ?? "http://localhost:3100";

interface Box {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
}

async function boxOf(page: Page, selector: string): Promise<Box | null> {
  return page.evaluate((css) => {
    const element = document.querySelector(css);

    if (!element) return null;

    const rect = element.getBoundingClientRect();

    return {
      top: Math.round(rect.top),
      bottom: Math.round(rect.bottom),
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      width: Math.round(rect.width),
    };
  }, selector);
}

const centreOf = (box: Box): number => (box.top + box.bottom) / 2;

/** Signs in as the company's own manager: /dashboard has no selector. */
async function openAsManager(
  page: Page,
  path: string,
  width: number,
): Promise<void> {
  await page.context().addCookies([
    { name: "tkey", value: managerToken(), domain: "localhost", path: "/" },
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

  await expect(page.locator("main").first()).toBeVisible({ timeout: 60_000 });
  await expect(page.locator("[data-error-surface]")).toHaveCount(0);
}

/**
 * The desk strip, not the phone menu.
 *
 * Both are in the DOM at every width — one is hidden by a media query — and
 * both carry the same accessible name, so a locator by role would match two
 * elements and measure whichever came first. The strip is the one holding a
 * list.
 */
const STRIP = 'nav[aria-label="Seções de entregas"]:has(ul)';

/**
 * The muted track itself, which is what a person sees as "the tabs".
 *
 * Measuring the `<nav>` instead proves nothing about width, and that is not a
 * detail: the nav is a block element, so `w-auto` on it is 100% of its parent
 * and it reports the full content width whatever the rail inside is doing.
 * The first version of the test below did exactly that and survived having
 * `inline-flex lg:w-auto` — the very rule it exists to forbid — put back on
 * the list.
 */
const RAIL = `${STRIP} > ul`;

const STATS = '[data-tutorial="data-page-stats"]';

test.describe.configure({ mode: "parallel" });

test.describe("a composição da página de Entregas", () => {
  test("põe as ações ACIMA das seções, não embaixo delas", async ({ page }) => {
    /**
     * The one that was actually wrong, and the reason the whole band was
     * rebuilt.
     *
     * The action bar used to render under the strip, which put it between the
     * sections and the table: "Nova Entrega" sitting on top of a list it does
     * not belong to, while the section it DOES belong to was above it. Nothing
     * about that is visible to an assertion on text or role — only to one on
     * position.
     */
    await openAsManager(page, "/dashboard/deliveries", 1440);

    const actions = await boxOf(page, "[data-toolbar-actions]");
    const strip = await boxOf(page, STRIP);

    expect(actions, "a barra de ações não está na página").not.toBeNull();
    expect(strip, "a faixa de seções não está na página").not.toBeNull();

    expect(
      actions!.bottom,
      "as ações voltaram para baixo das seções",
    ).toBeLessThanOrEqual(strip!.top);
  });

  test("e no /admin divide a linha de cima com o seletor de empresa", async ({
    page,
  }) => {
    await openAsMaster(
      page,
      `/admin/deliveries?businessId=${fixtureBusinessId()}`,
    );

    const context = await boxOf(page, "[data-toolbar-context]");
    const actions = await boxOf(page, "[data-toolbar-actions]");
    const strip = await boxOf(page, STRIP);

    expect(context, "o seletor de empresa sumiu do /admin").not.toBeNull();
    expect(actions, "a barra de ações sumiu do /admin").not.toBeNull();

    // The same line: their vertical centres agree, though the controls are
    // deliberately different heights.
    expect(
      Math.abs(centreOf(context!) - centreOf(actions!)),
      "o seletor e as ações deixaram de dividir a linha em 1440px",
    ).toBeLessThanOrEqual(6);

    // Company on the left, actions on the right — subject, then verbs.
    expect(context!.left).toBeLessThan(actions!.left);

    expect(
      Math.max(context!.bottom, actions!.bottom),
      "a linha de contexto e ações não está acima das seções",
    ).toBeLessThanOrEqual(strip!.top);
  });

  test("e no /dashboard, sem seletor, as ações continuam no alto", async ({
    page,
  }) => {
    await openAsManager(page, "/dashboard/deliveries", 1440);

    expect(
      await boxOf(page, "[data-toolbar-context]"),
      "apareceu um seletor de empresa no /dashboard",
    ).toBeNull();

    const actions = await boxOf(page, "[data-toolbar-actions]");
    const strip = await boxOf(page, STRIP);

    expect(actions!.bottom).toBeLessThanOrEqual(strip!.top);

    // Right-aligned, like every other action bar in the product.
    expect(
      Math.abs(actions!.right - strip!.right),
      "as ações deixaram de alinhar pela direita com o conteúdo",
    ).toBeLessThanOrEqual(2);
  });

  /**
   * Both strips, and both widths, because neither pair alone is a test.
   *
   * Entregas has ten sections wanting 1431px: at 1440 the page has 1070 to
   * give, so the rail is full width whether it was told to be or not, and the
   * defect only appears at 1920. Integrações has four wanting 540, so it is
   * short of the page at every desk width. The rule is the same for both and
   * only the two together can catch it being broken.
   */
  for (const surface of [
    {
      name: "Entregas",
      path: "/dashboard/deliveries",
      label: "Seções de entregas",
    },
    {
      name: "Integrações",
      path: "/dashboard/integrations",
      label: "Seções de integrações",
    },
  ]) {
    for (const width of [1440, 1920]) {
      test(`a faixa de ${surface.name} ocupa a largura do conteúdo a ${width}px`, async ({
        page,
      }) => {
        await openAsManager(page, surface.path, width);

        const strip = `nav[aria-label="${surface.label}"]:has(ul)`;

        const rail = await boxOf(page, `${strip} > ul`);

        /*
          The heading, as the ruler. It is the one element on every one of
          these pages that is plainly the full content width — the cards are
          not on the sections without cards, and the table is wider than the
          page on purpose.
        */
        const ruler = await boxOf(page, "main h2");

        expect(rail, "a faixa de seções não está na página").not.toBeNull();
        expect(ruler, "o título da página não está na tela").not.toBeNull();

        expect(
          Math.abs(rail!.width - ruler!.width),
          `a faixa (${rail!.width}px) não acompanha a largura do conteúdo (${ruler!.width}px)`,
        ).toBeLessThanOrEqual(2);
      });
    }
  }

  /**
   * Growing is half the rule; the other half is knowing when to stop.
   *
   * Asked of INTEGRAÇÕES as well, and that is the half that matters: Entregas
   * has ten sections that between them almost fill a 1920px rail, so removing
   * the ceiling changes each of them by a dozen pixels and no assertion on
   * this page would notice. Integrações has four. Uncapped they came out
   * 390px each — a segmented control stretched until the labels float in the
   * middle of nothing — and only a test that opens that page can say so.
   */
  for (const surface of [
    {
      name: "Entregas",
      path: "/dashboard/deliveries",
      label: "Seções de entregas",
      atLeast: 6,
    },
    {
      name: "Integrações",
      path: "/dashboard/integrations",
      label: "Seções de integrações",
      atLeast: 3,
    },
  ]) {
    test(`as seções de ${surface.name} crescem, mas nenhuma vira banner`, async ({
      page,
    }) => {
      await openAsManager(page, surface.path, 1920);

      const items = await page.evaluate((css) => {
        const nav = document.querySelector(css);

        if (!nav) return null;

        return [...nav.querySelectorAll("li")].map((item) => ({
          label: (item.textContent ?? "").trim(),
          width: Math.round(item.getBoundingClientRect().width),

          // What the label alone needs: an item narrower than this is cutting
          // its own text.
          natural: Math.round(
            (item.firstElementChild as HTMLElement).scrollWidth,
          ),
        }));
      }, `nav[aria-label="${surface.label}"]:has(ul)`);

      expect(items, "a faixa não tem itens").not.toBeNull();
      expect(items!.length).toBeGreaterThanOrEqual(surface.atLeast);

      for (const item of items!) {
        expect(
          item.width,
          `"${item.label}" ficou com ${item.width}px — largura de banner, não de aba`,
        ).toBeLessThanOrEqual(258);

        expect(
          item.width + 1,
          `"${item.label}" ficou mais estreita do que o próprio rótulo`,
        ).toBeGreaterThanOrEqual(item.natural);
      }
    });
  }

  test("a Auditoria mantém Revalidar junto dos próprios contadores", async ({
    page,
  }) => {
    /**
     * The exception, and it is an exception on purpose.
     *
     * Every other section keeps its actions up beside the company. This one's
     * only action is the refresh, and what it refreshes is the three counters
     * the panel draws — Na fila, Aprovados, Rejeitados. Up in the band it was
     * a button on its own line, two elements away from the numbers it changes.
     */
    await openAsManager(page, "/dashboard/deliveries?tab=proof-audits", 1440);

    const strip = await boxOf(page, STRIP);

    expect(
      await boxOf(page, "[data-toolbar-actions]"),
      "a Auditoria voltou a pôr Revalidar lá em cima, junto com as outras abas",
    ).toBeNull();

    const chips = await boxOf(page, '[role="group"]');

    const refresh = await page
      .locator("form")
      .filter({ hasText: "Revalidar" })
      .first()
      .boundingBox();

    expect(chips, "os contadores da fila não estão na página").not.toBeNull();
    expect(refresh, "o botão Revalidar não está na página").not.toBeNull();

    const refreshBox: Box = {
      top: Math.round(refresh!.y),
      bottom: Math.round(refresh!.y + refresh!.height),
      left: Math.round(refresh!.x),
      right: Math.round(refresh!.x + refresh!.width),
      width: Math.round(refresh!.width),
    };

    expect(
      refreshBox.top,
      "Revalidar ficou acima da faixa de seções",
    ).toBeGreaterThan(strip!.bottom);

    expect(
      Math.abs(centreOf(chips!) - centreOf(refreshBox)),
      "Revalidar desgrudou da linha dos contadores",
    ).toBeLessThanOrEqual(8);

    expect(
      refreshBox.left,
      "Revalidar deixou de ficar à direita dos contadores",
    ).toBeGreaterThan(chips!.right);
  });
});

test.describe("os cards de Entregas", () => {
  /**
   * 768 is the width that decides this, and it is not the one the defect was
   * reported at.
   *
   * It was found at 1024, where four cards shared 655px. Four across now waits
   * for `xl`, so at 1024 there are two cards of 320px and every label fits on
   * one line whether it is allowed to wrap or not — put `truncate` back and
   * nothing on that screen changes. A tablet with the sidebar open gives the
   * page 400px and each card 190, and there "Total de Entregas" needs the
   * second line the clamp promises.
   */
  for (const width of [768, 1024]) {
    test(`não cortam o próprio texto a ${width}px`, async ({ page }) => {
      /**
       * `truncate` and `line-clamp-2` on the same element, and `truncate`
       * wins — it sets `white-space: nowrap`, so the two lines the clamp
       * allowed could never be used. At 1024px every card in the product read
       * "Total de...", "Entregu...", "155 (1...". A cut number is not a
       * smaller number, it is a wrong one.
       */
      await openAsManager(page, "/dashboard/deliveries", width);

      const clipped = await page.evaluate((css) => {
        const grid = document.querySelector(css);

        if (!grid) return ["sem cards"];

        const bad: string[] = [];

        for (const node of grid.querySelectorAll("h3, p, div")) {
          const element = node as HTMLElement;

          if (element.children.length > 0) continue;
          if (element.scrollWidth <= element.clientWidth + 1) continue;

          bad.push(
            `${element.innerText.trim()} (${element.scrollWidth} > ${element.clientWidth})`,
          );
        }

        return bad;
      }, STATS);

      expect(clipped, "texto cortado dentro de um card").toEqual([]);
    });
  }

  test("e não deixam uma coluna vazia quando são três", async ({ page }) => {
    /**
     * Every tab asked for four columns whatever it had. Ocorrências and
     * Motivos have three cards, so a wide screen drew three and an empty
     * fourth — 270px of nothing at the widest part of the page.
     */
    await openAsManager(
      page,
      "/dashboard/deliveries?tab=status-change-reasons",
      1440,
    );

    const verdict = await page.evaluate((css) => {
      const grid = document.querySelector(css) as HTMLElement | null;

      if (!grid) return null;

      const rights = [...grid.children].map((card) =>
        Math.round(card.getBoundingClientRect().right),
      );

      return {
        gridRight: Math.round(grid.getBoundingClientRect().right),
        lastCardRight: Math.max(...rights),
        count: rights.length,
      };
    }, STATS);

    expect(verdict, "a aba Motivos não trouxe cards").not.toBeNull();
    expect(verdict!.count).toBe(3);

    expect(
      verdict!.gridRight - verdict!.lastCardRight,
      "sobrou uma coluna vazia à direita dos cards",
    ).toBeLessThanOrEqual(2);
  });

  test("e não ocupam espaço nenhum nas abas que não têm cards", async ({
    page,
  }) => {
    /**
     * Four sections have no cards, and this used to render a zero-height
     * `<div>` for them anyway. The page spaces its children with `space-y-6`,
     * and an invisible child still takes a gap — 48px where there should be
     * 24, on exactly the sections with the least to show.
     */
    await openAsManager(page, "/dashboard/deliveries?tab=imports", 1440);

    await expect(
      page.locator(STATS),
      "a aba Importações voltou a renderizar uma grade de cards vazia",
    ).toHaveCount(0);
  });
});
