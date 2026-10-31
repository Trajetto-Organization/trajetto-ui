import { test, expect, type Page } from "../ui/support/test";

import {
  Fragment,
  createElement,
  forwardRef,
  type ComponentType,
  type ReactNode,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SegmentedNav } from "../../src/components/ui/segmented-nav";
import {
  fixtureBusinessId,
  managerForThisSpec,
  openAsMaster,
} from "../ui/support/operation";
import { waitForHydration } from "../ui/support/ui";

/**
 * The section strips of Entregas and the Torre de controle end where their
 * rail ends — with the sidebar open, collapsed, or toggled with Ctrl+B.
 *
 * Every section of a filling `SegmentedNav` used to stop growing at 256px, a
 * ceiling sized for when Entregas had ten sections. With six (and five views
 * on the Torre) the items stopped short and the rest of the muted rail showed
 * as bare track after the last tab: 216px on Entregas at 1920px with the
 * sidebar collapsed, 264px on the Torre with it open, over 600px on a 2560px
 * screen.
 *
 * The suite that existed measured the `<ul>`, which is `w-full` and always
 * as wide as the page whatever its items do — it passed with the gap on
 * screen. These measure the LAST section against the rail's inner edge, which
 * is what a person sees.
 *
 * Below the width where the sections fit, the rail scrolls on one line with
 * the arrows instead (decision 3.1), and the page itself must never scroll
 * sideways.
 */
const BASE = process.env.RESPONSIVE_BASE_URL ?? "http://localhost:3100";

interface Strip {
  name: string;
  path: string;
  /** The accessible name; the desk strip is the variant holding a list. */
  nav: string;
  sections: number;
}

const STRIPS: Strip[] = [
  {
    name: "Entregas",
    path: "/dashboard/deliveries",
    nav: 'nav[aria-label="Seções de entregas"]',
    sections: 6,
  },
  {
    // Auditoria, the view the report named: the last of the five.
    name: "Torre de controle",
    path: "/dashboard/control-tower?view=audit",
    nav: 'nav[aria-label="Visões da torre de controle"]',
    sections: 5,
  },
];

/** Desk widths, from the common laptop to a 2560px monitor. */
const DESKS = [1366, 1440, 1920, 2560];

type Sidebar = "expanded" | "collapsed";

const SIDEBAR = "div.peer[data-side][data-state]";

/**
 * The sidebar's state as the server reads it (`sidebar:state`, see
 * src/lib/sidebar-state): collapsed from the first paint, no animation to
 * wait for.
 */
async function sidebarCookie(page: Page, sidebar: Sidebar): Promise<void> {
  if (sidebar === "expanded") return;

  await page
    .context()
    .addCookies([
      { name: "sidebar:state", value: "false", domain: "localhost", path: "/" },
    ]);
}

async function openAsManager(
  page: Page,
  path: string,
  width: number,
  sidebar: Sidebar,
): Promise<void> {
  await page.context().addCookies([
    {
      name: "tkey",
      value: managerForThisSpec(),
      domain: "localhost",
      path: "/",
    },
  ]);

  await sidebarCookie(page, sidebar);

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

  expect(page.url(), `caiu no login: ${path}`).not.toContain("/login");
}

/**
 * "ok", or what is wrong with the strip, in numbers.
 *
 * Fits: the last section's right edge is the rail's inner right edge (its
 * `p-1` excluded), within a pixel. Does not fit: the rail overflows, and an
 * arrow says so — which side depends on where the active section scrolled it.
 */
async function stripVerdict(page: Page, strip: Strip): Promise<string> {
  return page.evaluate(
    ({ css, sections }) => {
      const nav = document.querySelector(`${css}:has(ul)`);
      const list = nav?.querySelector("ul");

      if (!nav || !list) return "a faixa não está na página";

      const items = list.querySelectorAll(":scope > li");

      if (items.length !== sections)
        return `a faixa tem ${items.length} seções, esperava ${sections}`;

      const rail = list.getBoundingClientRect();
      const inner =
        rail.right - parseFloat(getComputedStyle(list).paddingRight);
      const last = items[items.length - 1].getBoundingClientRect();

      const gap = Math.round(inner - last.right);
      const overflows = list.scrollWidth > list.clientWidth + 1;
      const arrows = nav.querySelectorAll("[data-scroll-edge]").length;

      if (overflows)
        return arrows > 0
          ? "ok"
          : `transborda (${list.scrollWidth} > ${list.clientWidth}) sem seta`;

      return Math.abs(gap) <= 1
        ? "ok"
        : `sobram ${gap}px de trilho vazio depois da última seção (faixa de ${Math.round(rail.width)}px)`;
    },
    { css: strip.nav, sections: strip.sections },
  );
}

async function expectFilled(
  page: Page,
  strip: Strip,
  where: string,
): Promise<void> {
  await expect
    .poll(() => stripVerdict(page, strip), {
      timeout: 15_000,
      message: `${strip.name} ${where}`,
    })
    .toBe("ok");
}

test.describe.configure({ mode: "parallel" });

test.describe("the section strips reach the end of their rail", () => {
  for (const strip of STRIPS) {
    for (const sidebar of ["expanded", "collapsed"] as const) {
      test(`${strip.name}, sidebar ${sidebar}, ${DESKS.join("/")}px`, async ({
        page,
      }) => {
        await openAsManager(page, strip.path, DESKS[0], sidebar);

        await expect(page.locator(SIDEBAR)).toHaveAttribute(
          "data-state",
          sidebar,
        );

        // The arrows are client state; the overflow case needs them.
        await waitForHydration(page.locator(`${strip.nav}:has(ul) ul`));

        for (const width of DESKS) {
          await page.setViewportSize({ width, height: 900 });

          await expectFilled(page, strip, `@${width}, sidebar ${sidebar}`);
        }
      });
    }
  }

  test("Entregas follows Ctrl+B both ways", async ({ page }) => {
    /**
     * The report's own steps: Entregas at 1920px, Ctrl+B. The sidebar
     * animates its width for 200ms, so the strip is polled, not read once.
     */
    const [entregas] = STRIPS;

    await openAsManager(page, entregas.path, 1920, "expanded");

    const list = page.locator(`${entregas.nav}:has(ul) ul`);

    await waitForHydration(list);

    await expectFilled(page, entregas, "@1920 com a sidebar aberta");

    const before = (await list.boundingBox())!.width;

    await page.keyboard.press("Control+b");

    await expect(page.locator(SIDEBAR)).toHaveAttribute(
      "data-state",
      "collapsed",
    );

    // The rail took the width the sidebar gave back...
    await expect
      .poll(async () => (await list.boundingBox())!.width, { timeout: 5_000 })
      .toBeGreaterThan(before + 150);

    // ...and the sections took all of it.
    await expectFilled(page, entregas, "@1920 depois de Ctrl+B");

    await page.keyboard.press("Control+b");

    await expect(page.locator(SIDEBAR)).toHaveAttribute(
      "data-state",
      "expanded",
    );

    await expectFilled(page, entregas, "@1920 depois de Ctrl+B outra vez");
  });

  test("the Torre fills its rail on full screen too", async ({ page }) => {
    /**
     * Full screen pins the Torre over the whole page: a 1888px rail at
     * 1920px, the widest one in the product.
     */
    const [, torre] = STRIPS;

    await openAsManager(page, torre.path, 1920, "expanded");

    await waitForHydration(page.locator(`${torre.nav}:has(ul) ul`));

    await page.getByRole("button", { name: "Tela cheia" }).click();

    await expect(
      page.locator("[data-control-tower-shell][data-fullscreen]"),
    ).toBeVisible();

    await expectFilled(page, torre, "@1920 em tela cheia");
  });

  test("and on /admin, with the company selector above them", async ({
    page,
  }) => {
    await sidebarCookie(page, "collapsed");

    for (const strip of STRIPS) {
      const separator = strip.path.includes("?") ? "&" : "?";

      await openAsMaster(
        page,
        `${strip.path.replace("/dashboard/", "/admin/")}${separator}businessId=${fixtureBusinessId()}`,
      );

      await page.setViewportSize({ width: 1920, height: 900 });

      await expectFilled(page, strip, "no /admin @1920, sidebar recolhida");
    }
  });
});

/**
 * Server markup of an app component, from inside the Playwright runner.
 *
 * The runner compiles the JSX of every TSX file it loads — the app's too —
 * into its component-testing objects (`{ __pw_type: "jsx", type, props }`),
 * not React elements, and React's renderer refuses them. This walks the
 * component's output back into React elements: each component the app
 * compiled is wrapped so what it returns is converted too, and everything
 * from node_modules (Radix, next/link, lucide) is real React already.
 */
interface RunnerJsx {
  __pw_type: "jsx";
  type: unknown;
  props?: Record<string, unknown>;
  key?: string | number | null;
}

const isRunnerJsx = (value: unknown): value is RunnerJsx =>
  typeof value === "object" &&
  value !== null &&
  (value as RunnerJsx).__pw_type === "jsx";

const FORWARD_REF = Symbol.for("react.forward_ref");
const MEMO = Symbol.for("react.memo");

const asReact = new Map<unknown, unknown>();

function reactType(type: unknown): unknown {
  if (typeof type === "string") return type;

  if ((type as { __pw_jsx_fragment?: boolean })?.__pw_jsx_fragment)
    return Fragment;

  if (asReact.has(type)) return asReact.get(type);

  let result: unknown = type;
  const special = (type as { $$typeof?: symbol } | null)?.$$typeof;

  if (
    typeof type === "function" &&
    !(type as { prototype?: { isReactComponent?: unknown } }).prototype
      ?.isReactComponent
  ) {
    const render = type as (props: unknown) => unknown;

    result = (props: unknown) => toReact(render(props));
  } else if (special === FORWARD_REF) {
    const { render } = type as {
      render: (props: unknown, ref: unknown) => unknown;
    };

    result = forwardRef(function Forwarded(props, ref) {
      return toReact(render(props, ref)) as never;
    });
  } else if (special === MEMO) {
    result = reactType((type as { type: unknown }).type);
  }

  asReact.set(type, result);

  return result;
}

function toReact(value: unknown): ReactNode {
  if (Array.isArray(value)) return value.map(toReact);

  if (!isRunnerJsx(value)) return value as ReactNode;

  const { children, ...rest } = value.props ?? {};

  const props = Object.fromEntries(
    Object.entries(rest).map(([name, prop]) => [
      name,
      isRunnerJsx(prop) || Array.isArray(prop) ? toReact(prop) : prop,
    ]),
  );

  // Spread, as the compiled JSX passes them: siblings written side by side
  // are not a list and carry no keys (a `.map` inside stays an array).
  const kids = Array.isArray(children) ? children : [children];

  return createElement(
    reactType(value.type) as ComponentType,
    { ...props, key: value.key ?? undefined },
    ...(children === undefined ? [] : kids.map(toReact)),
  );
}

function serverMarkup<P extends object>(
  component: (props: P) => unknown,
  props: P,
): string {
  return renderToStaticMarkup(
    createElement(reactType(component) as ComponentType<P>, props),
  );
}

test.describe("a strip left with one or two sections", () => {
  /**
   * A profile with only `occurrence_manage` sees one section on Entregas
   * ("Tipos de Ocorrência") and one view on the Torre; a section dropped from
   * the store while it is open stays drawn next to what is left. Filling the
   * rail made that one section a ~1550px pill at 1920px (§4: no
   * disproportionate stretching), so below three sections the strip hugs.
   *
   * The fixture seeds no such profile, so the strip is the component's own
   * markup for those sections (rendered here with the same props Entregas
   * passes), put in the place of Entregas' real strip — same container, same
   * stylesheet, same page width — and measured there.
   */
  const SECTIONS = [
    { value: "occurrence-types", label: "Tipos de Ocorrência" },
    { value: "deliveries", label: "Entregas" },
  ];

  for (const count of [1, 2]) {
    for (const [width, sidebar] of [
      [1920, "collapsed"],
      [1366, "expanded"],
    ] as const) {
      test(`${count} seção(ões) @${width}, sidebar ${sidebar}: each one keeps its label's width`, async ({
        page,
      }) => {
        const [entregas] = STRIPS;
        const items = SECTIONS.slice(0, count);

        const markup = serverMarkup(SegmentedNav, {
          label: "Seções de entregas (poucas)",
          activeValue: items[0].value,
          hrefFor: (value: string) => `?tab=${value}`,
          items,
        });

        await openAsManager(page, entregas.path, width, sidebar);

        const real = page.locator(`${entregas.nav}:has(ul)`);

        await waitForHydration(real.locator("ul"));

        const verdict = await real.evaluate((nav, html) => {
          const holder = document.createElement("div");

          holder.innerHTML = html;

          const few = [...holder.querySelectorAll("nav")].find((candidate) =>
            candidate.querySelector("ul"),
          );

          if (!few) return "o componente não desenhou a faixa";

          // In the real strip's place, which React keeps but no longer shows.
          nav.insertAdjacentElement("afterend", few);
          (nav as HTMLElement).style.display = "none";

          const list = few.querySelector("ul")!;
          const room = few.parentElement!.getBoundingClientRect().width;
          const rail = list.getBoundingClientRect();
          const inner =
            rail.right - parseFloat(getComputedStyle(list).paddingRight);

          const stretched = [...list.querySelectorAll(":scope > li")]
            .map((item) => {
              const li = item as HTMLElement;
              const drawn = li.getBoundingClientRect().width;

              li.style.width = "max-content";
              li.style.flex = "none";
              const natural = li.getBoundingClientRect().width;
              li.style.width = "";
              li.style.flex = "";

              return { label: li.textContent, drawn, natural };
            })
            .filter(({ drawn, natural }) => drawn - natural > 1);

          if (stretched.length > 0)
            return stretched
              .map(
                ({ label, drawn, natural }) =>
                  `"${label}" esticada para ${Math.round(drawn)}px (o rótulo pede ${Math.round(natural)}px)`,
              )
              .join("; ");

          const last = list
            .querySelector(":scope > li:last-child")!
            .getBoundingClientRect();

          if (Math.abs(inner - last.right) > 1)
            return `sobram ${Math.round(inner - last.right)}px de trilho vazio depois da última seção`;

          if (rail.width > room / 2)
            return `a faixa ocupa ${Math.round(rail.width)}px de ${Math.round(room)}px`;

          return "ok";
        }, markup);

        expect(verdict, `${count} seção(ões) @${width}`).toBe("ok");
      });
    }
  }
});

test.describe("on a tablet and on a phone", () => {
  for (const strip of STRIPS) {
    for (const width of [390, 768]) {
      test(`${strip.name} @${width}: the page never scrolls sideways`, async ({
        page,
      }) => {
        // Below md the sidebar is a drawer, so its state matters from 768.
        const states: Sidebar[] =
          width >= 768 ? ["expanded", "collapsed"] : ["expanded"];

        for (const sidebar of states) {
          await page.context().clearCookies();

          await openAsManager(page, strip.path, width, sidebar);

          const desk = page.locator(`${strip.nav}:has(ul)`);
          const phone = page.locator(`${strip.nav}:not(:has(ul))`);

          if (width < 768) {
            // The phone menu, not a squeezed strip; nothing hidden — every
            // section is in the menu.
            await expect(phone).toBeVisible();
            await expect(desk).toBeHidden();
          } else {
            await expect(desk).toBeVisible();

            await waitForHydration(desk.locator("ul"));

            await expectFilled(page, strip, `@${width}, sidebar ${sidebar}`);

            // One 40px line, whatever the width.
            expect(
              (await desk.locator("ul").boundingBox())!.height,
              `@${width}: a faixa passou de uma linha`,
            ).toBeLessThanOrEqual(40);
          }

          const sideways = await page.evaluate(() => {
            const root = document.documentElement;

            return root.scrollWidth - root.clientWidth;
          });

          expect(
            sideways,
            `@${width}, sidebar ${sidebar}: a página rola na horizontal`,
          ).toBeLessThanOrEqual(1);
        }
      });
    }
  }
});
