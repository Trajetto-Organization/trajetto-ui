import { managerToken } from "../ui/support/operation";

import { test, expect, type Page } from "@playwright/test";

import { readFileSync } from "node:fs";

/**
 * The screens measured against WCAG, with real data.
 *
 * Runs the axe rule set plus three checks axe does not make: touch target
 * size, a visible focus indicator, and whether the keyboard can get stuck.
 * Every finding here is reproducible — "hard to use" is not a test result,
 * "this button is 18px on a phone" is.
 *
 * Both themes are exercised now. Until this week only light could be reached:
 * the provider set `data-theme` while Tailwind is configured for
 * `darkMode: ["class"]`, so no `dark:` class in this codebase ever applied and
 * the dark theme was ~700 utilities that had never rendered. Turning it on
 * without checking it would have shipped a theme nobody had ever seen — which
 * is what the dark loop below is for.
 */
const AXE = readFileSync("node_modules/axe-core/axe.min.js", "utf8");

const CONTEXT = JSON.parse(
  readFileSync(
    "../trajetto-api/tests/load/fixtures/load-context.json",
    "utf8",
  ),
);

const BASE = process.env.RESPONSIVE_BASE_URL ?? "http://localhost:3100";

const PAGES = [
  { path: "/dashboard", name: "dashboard" },
  { path: "/dashboard/deliveries", name: "deliveries" },
  { path: "/dashboard/routes", name: "routes" },
  { path: "/dashboard/control-tower", name: "control tower" },
  { path: "/dashboard/integrations", name: "integrations" },
  { path: "/dashboard/vehicle", name: "vehicles" },
] as const;

/** A phone and a laptop: the two shapes that actually get used. */
const WIDTHS = [390, 1440] as const;

async function signIn(page: Page): Promise<void> {
  await page.context().addCookies([
    {
      name: "tkey",
      value: managerToken(),
      domain: "localhost",
      path: "/",
    },
  ]);
}

/**
 * Forces a theme before the first paint.
 *
 * next-themes reads `localStorage.theme` on mount, so writing it here is the
 * same switch a person flips in the interface — and doing it in an init
 * script means the page never renders in the other theme first.
 */
async function forceTheme(page: Page, theme: "light" | "dark"): Promise<void> {
  await page.addInitScript((value) => {
    try {
      window.localStorage.setItem("theme", value);
    } catch {
      // Private mode, blocked storage: the default theme still renders.
    }
  }, theme);
}

async function open(
  page: Page,
  path: string,
  width: number,
  theme: "light" | "dark" = "light",
): Promise<void> {
  await signIn(page);
  await forceTheme(page, theme);

  await page.setViewportSize({ width, height: 900 });

  await page.goto(`${BASE}${path}`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });

  // The same trap the responsive suite fell into: a logged-out screen passes
  // every accessibility check and proves nothing about the app.
  expect(page.url(), `fell through to login: ${path}`).not.toContain("/login");

  /**
   * A screen that crashed is not a screen that passed.
   *
   * The error surface renders a heading, a button and a correct layout, so it
   * satisfies almost anything a test asks of "the page". Two render-fatal
   * bugs in /admin were green in the accessibility and responsive suites for
   * exactly that reason. One assertion, in every place a test arrives at a
   * URL, closes it.
   */
  await expect(
    page.locator("[data-error-surface]"),
    `a tela caiu no limite de erro: ${path}`,
  ).toHaveCount(0);
}

test.describe.configure({ mode: "parallel" });

const THEMES = ["light", "dark"] as const;

test.describe("axe", () => {
  for (const target of PAGES) {
    for (const width of WIDTHS) {
      for (const theme of THEMES) {
      test(`${target.name} @ ${width}px (${theme})`, async ({ page }) => {
        await open(page, target.path, width, theme);

        // The theme has to have actually taken, or the dark run is a second
        // light run wearing a different name.
        const applied = await page.evaluate(() =>
          document.documentElement.classList.contains("dark"),
        );

        expect(applied, `o tema ${theme} não foi aplicado`).toBe(
          theme === "dark",
        );

        await page.addScriptTag({ content: AXE });

        const violations = await page.evaluate(async () => {
          // @ts-expect-error injected above
          const report = await window.axe.run(
            {
              /**
               * The product, not the toolbox around it.
               *
               * `nextjs-portal` is the dev server's own overlay — the build
               * indicator and the error dialog. It appears whenever a page is
               * being recompiled, so a run that happened to land during a
               * rebuild failed on the CONTRAST OF THE NEXT.JS LOGO, which
               * ships in no production bundle and which nobody here can fix.
               * A test that fails on the weather is worse than no test.
               */
              exclude: [["nextjs-portal"]],
            },
            {
              runOnly: {
                type: "tag",
                values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
              },
            },
          );

          return (report.violations as Array<Record<string, any>>).map(
            (rule) => ({
              id: rule.id as string,
              impact: rule.impact as string,
              help: rule.help as string,
              nodes: (rule.nodes as Array<Record<string, any>>)
                .slice(0, 3)
                .map((node) => String(node.target)),
            }),
          );
        });

        expect(
          violations.map(
            (v) => `${v.impact} ${v.id}: ${v.help} — ${v.nodes.join(" ; ")}`,
          ),
        ).toEqual([]);
      });
      }
    }
  }
});

test.describe("touch targets", () => {
  for (const target of PAGES) {
    test(`${target.name} @ 390px`, async ({ page }) => {
      await open(page, target.path, 390);

      const small = await page.evaluate(() => {
        /** WCAG 2.5.8 AA: 24x24 CSS pixels. */
        const MINIMUM = 24;

        const offenders: string[] = [];

        const selector = [
          "a[href]",
          "button",
          'input:not([type="hidden"])',
          "select",
          "textarea",
          '[role="button"]',
          '[role="link"]',
          '[role="checkbox"]',
          '[role="menuitem"]',
        ].join(", ");

        for (const element of Array.from(
          document.querySelectorAll(selector),
        )) {
          const style = getComputedStyle(element);

          if (style.display === "none" || style.visibility === "hidden") {
            continue;
          }

          const box = element.getBoundingClientRect();

          if (box.width === 0 || box.height === 0) continue;

          /**
           * A link inside a sentence is exempt, and the spec says so.
           *
           * Its size is set by the font rather than by a designer, and growing
           * it would break the line it sits in. The test for "inline" is the
           * element's own display, which is what the exception is about.
           */
          if (style.display === "inline" && element.tagName === "A") continue;

          /**
           * A disabled control is not a target.
           *
           * The current page in a breadcrumb renders as `role="link"` with
           * `aria-disabled`, which is a label, not something anybody aims at.
           * Counting it as an undersized target was the check being wrong,
           * not the page.
           */
          if (
            element.getAttribute("aria-disabled") === "true" ||
            element.hasAttribute("disabled")
          ) {
            continue;
          }

          /**
           * The drawn box is not the target; what a finger hits is.
           *
           * Padding on the control, or a pseudo-element stretched past its
           * edges, enlarges the clickable area without changing the border
           * box — and `getBoundingClientRect` reports only the border box.
           * An earlier version probed the four corners with
           * `elementFromPoint`, which measures the real thing but only works
           * inside the viewport: every control below the fold came back
           * `null` and was reported as a defect. Geometry does not care where
           * the page is scrolled to.
           */
          const spread = (pseudo: string): { width: number; height: number } => {
            const decoration = getComputedStyle(element, pseudo);

            if (
              decoration.content === "none" ||
              decoration.position !== "absolute"
            ) {
              return { width: 0, height: 0 };
            }

            return {
              width: parseFloat(decoration.width) || 0,
              height: parseFloat(decoration.height) || 0,
            };
          };

          const before = spread("::before");
          const after = spread("::after");

          const width = Math.max(box.width, before.width, after.width);
          const height = Math.max(box.height, before.height, after.height);

          if (width < MINIMUM || height < MINIMUM) {
            offenders.push(
              `${element.tagName.toLowerCase()}.${String(element.className).slice(0, 34)} ` +
                `${Math.round(width)}x${Math.round(height)} ` +
                `"${(element.textContent ?? "").trim().slice(0, 24)}"`,
            );
          }
        }

        return offenders.slice(0, 8);
      });

      expect(small, `${target.name}: targets under 24x24`).toEqual([]);
    });
  }
});

test.describe("keyboard", () => {
  for (const target of PAGES) {
    test(`${target.name}: focus stays visible and never gets stuck`, async ({
      page,
    }) => {
      await open(page, target.path, 1440);

      const invisible: string[] = [];
      const seen: string[] = [];

      /**
       * A trap is Tab failing to MOVE, which is a question about node
       * identity, not about class names.
       *
       * The first version compared a truncated `tag.className` string and
       * called three matches in a row a trap — so a sidebar with five links
       * that share a class failed on every page while nothing was wrong. The
       * page keeps the previous node in a variable, and the comparison is
       * against that node.
       */
      let frozen = 0;

      // Enough to cross the sidebar, the header and the first controls of the
      // page without turning this into a full crawl.
      for (let step = 0; step < 30; step++) {
        await page.evaluate(() => {
          (window as unknown as Record<string, unknown>).__a11yPrevious =
            document.activeElement;
        });

        await page.keyboard.press("Tab");

        const info = await page.evaluate(() => {
          const element = document.activeElement;

          if (!element || element === document.body) return null;

          const previous = (window as unknown as Record<string, unknown>)
            .__a11yPrevious;

          const style = getComputedStyle(element);
          const box = element.getBoundingClientRect();

          /**
           * A focus ring, by any of the ways this codebase draws one.
           *
           * Tailwind's `ring-*` compiles to a box-shadow, `outline` is the
           * browser default. Absence of both means a keyboard user cannot
           * tell where they are on the page.
           */
          const hasOutline =
            style.outlineStyle !== "none" &&
            parseFloat(style.outlineWidth || "0") > 0;

          const hasRing =
            style.boxShadow !== "none" && style.boxShadow.trim() !== "";

          return {
            id: `${element.tagName.toLowerCase()}.${String(element.className).slice(0, 34)}`,
            visible: hasOutline || hasRing,
            onScreen: box.width > 0 && box.height > 0,
            moved: element !== previous,
          };
        });

        if (!info) break;

        seen.push(info.id);

        frozen = info.moved ? 0 : frozen + 1;

        // Three presses that do not move focus at all: the only way out is
        // the mouse.
        expect(
          frozen,
          `${target.name}: focus stuck on ${info.id}`,
        ).toBeLessThan(3);

        if (info.onScreen && !info.visible) invisible.push(info.id);
      }

      expect(
        seen.length,
        `${target.name}: nothing ever took focus`,
      ).toBeGreaterThan(3);

      expect(
        Array.from(new Set(invisible)),
        `${target.name}: focus with no visible indicator`,
      ).toEqual([]);
    });
  }
});
