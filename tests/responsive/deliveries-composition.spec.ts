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
   * Two rails, two rules, and the rule is the number of sections.
   *
   * Entregas has ten, which between them want more width than a 1440px page
   * has — so the rail is the page's width and the sections divide it. Left to
   * hug, it stopped 120px short of a 1920px screen with bare background beside
   * it, which is where this whole round started.
   *
   * Integrações has four, wanting about 526px. Filling stretched each one to
   * 390px: a segmented control pulled until the labels float in the middle of
   * nothing. So it keeps its own width, and below the width where four fit it
   * wraps rather than hiding two behind a scroll arrow.
   *
   * One component, one `fill` prop, and this is the test that keeps the two
   * behaviours from collapsing into one.
   */
  test("a faixa de Entregas ocupa a largura do conteúdo", async ({ page }) => {
    for (const width of [1440, 1920]) {
      await openAsManager(page, "/dashboard/deliveries", width);

      const rail = await boxOf(page, RAIL);
      const ruler = await boxOf(page, "main h2");

      expect(rail, `@${width}: a faixa não está na página`).not.toBeNull();

      expect(
        Math.abs(rail!.width - ruler!.width),
        `@${width}: a faixa (${rail!.width}px) não acompanha o conteúdo (${ruler!.width}px)`,
      ).toBeLessThanOrEqual(2);
    }
  });

  test("e a de Integrações mantém a própria, sem esticar nem rolar", async ({
    page,
  }) => {
    const STRIP_I = 'nav[aria-label="Seções de integrações"]:has(ul)';

    for (const width of [1440, 1920]) {
      await openAsManager(page, "/dashboard/integrations", width);

      const rail = await boxOf(page, `${STRIP_I} > ul`);
      const ruler = await boxOf(page, "main h2");

      expect(rail, `@${width}: a faixa não está na página`).not.toBeNull();

      /*
        Comfortably narrower than the page, and the same width at both — a
        rail that grew with the window is one that went back to filling.
      */
      expect(
        rail!.width,
        `@${width}: a faixa de Integrações voltou a esticar até a página`,
      ).toBeLessThan(ruler!.width - 100);
    }
  });

  for (const width of [768, 1024]) {
    test(`e a de Integrações mostra as quatro seções a ${width}px`, async ({
      page,
    }) => {
      /**
       * At 768 the sidebar leaves the page 400px and the four sections want
       * 526, so something has to give. It is the height: the rail wraps and
       * all four stay on screen, instead of two hiding behind a scroll arrow
       * that a person has to discover.
       */
      await openAsManager(page, "/dashboard/integrations", width);

      const verdict = await page.evaluate(() => {
        const nav = document.querySelector(
          'nav[aria-label="Seções de integrações"]:has(ul)',
        );

        if (!nav) return null;

        const list = nav.querySelector("ul") as HTMLElement;

        return {
          scrolls: list.scrollWidth > list.clientWidth + 1,
          hidden: [...list.querySelectorAll("li")].filter((item) => {
            const box = item.getBoundingClientRect();
            const rail = list.getBoundingClientRect();

            return box.right > rail.right + 1 || box.left < rail.left - 1;
          }).length,
          items: list.querySelectorAll("li").length,
        };
      });

      expect(verdict, "a faixa não está na página").not.toBeNull();
      expect(verdict!.items).toBe(4);

      expect(
        verdict!.scrolls,
        `@${width}: a faixa de Integrações voltou a rolar em vez de quebrar linha`,
      ).toBe(false);

      expect(
        verdict!.hidden,
        `@${width}: ${verdict!.hidden} seções ficaram fora da faixa`,
      ).toBe(0);
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
