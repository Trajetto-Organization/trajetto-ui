import { managerToken } from "../ui/support/operation";

import { test, expect, type Page } from "@playwright/test";

import { readFileSync } from "node:fs";

/**
 * The screens at eleven widths, against real data.
 *
 * This is not a test of appearance — it is the set of failures that break a
 * screen and that no unit test sees: the page that scrolls sideways, the
 * button clipped out of its container, the toolbar that runs off the edge.
 * Each one is reproducible and measurable; "it looks wrong" is not.
 *
 * Runs against the load stack (API on 3334, Next on 3100), never against the
 * developer's own environment.
 */
const CONTEXT = JSON.parse(
  readFileSync("../trajetto-api/tests/load/fixtures/load-context.json", "utf8"),
);

const BASE = process.env.RESPONSIVE_BASE_URL ?? "http://localhost:3100";

/** The widths from the list, plus tablet portrait. */
const WIDTHS = [320, 360, 375, 390, 430, 768, 820, 1024, 1280, 1440, 1920];

const PAGES = [
  { path: "/dashboard", name: "dashboard" },
  { path: "/dashboard/deliveries", name: "deliveries" },
  { path: "/dashboard/routes", name: "routes" },
  // The map panel, the screen the Torre was before it had views (meeting of
  // 14/10/2026). Named: the bare Torre opens on Rotas, or on the view this
  // browser chose last.
  { path: "/dashboard/control-tower?view=panel", name: "control tower" },
  { path: "/dashboard/integrations", name: "integrations" },
  { path: "/dashboard/vehicle", name: "vehicles" },
];

/**
 * Enters with the session already established.
 *
 * The login form is not what is being measured, and going through it for
 * eleven widths across six pages would be most of the runtime.
 */
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

/** How far the page scrolls sideways. Zero is the only acceptable answer. */
async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const doc = document.documentElement;

    return Math.max(0, doc.scrollWidth - doc.clientWidth);
  });
}

/**
 * Content the layout cuts off and the user can never reach.
 *
 * The first version of this compared each element's box against the viewport
 * and skipped any element with an ancestor whose overflow was `auto`,
 * `scroll`, `hidden` or `clip`. It looked reasonable and was useless: the
 * dashboard shell puts `overflow: hidden` on `<main>` itself, so 98% of
 * visible elements fell into the exemption and nothing could ever be
 * reported. A 2400px `<div>` injected into a 390px page passed all eleven
 * widths without a single failure.
 *
 * What matters is not the element's box but whether the clipping container
 * holds more than it shows. `scrollWidth > clientWidth` on a container that
 * does NOT scroll means, literally, unreachable content: the cut-off button,
 * the column that vanishes, the text that stops mid-word. On a container that
 * scrolls it is the intended design, which is why `auto`/`scroll` stay exempt.
 */
async function clippedContent(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const offenders: string[] = [];

    /**
     * The map is the legitimate exception, and it has to be named.
     *
     * Leaflet positions tiles far outside the visible area on purpose and
     * relies on the container to clip them — that is how a draggable map
     * works. Exempting `.leaflet-container` by name costs one line; exempting
     * every `overflow: hidden` cost the entire test.
     */
    const exempt = (element: Element, style: CSSStyleDeclaration): boolean => {
      if (
        element.closest(".leaflet-container") !== null ||
        element.classList.contains("leaflet-container")
      ) {
        return true;
      }

      /**
       * An ellipsis is deliberate truncation, and it announces itself.
       *
       * `truncate` exists precisely to cut; the ellipsis tells the user there
       * is more and the title/tooltip carries the rest. Exempted by computed
       * style rather than class name, because what matters is the behaviour
       * and not the utility that produced it.
       */
      if (style.textOverflow === "ellipsis") return true;

      /**
       * The "visible to screen readers only" pattern.
       *
       * An `sr-only` is a 1x1 box clipping a whole label on purpose — exactly
       * what this detector looks for, and exactly the opposite of a defect.
       * A one-pixel width identifies the pattern without depending on the
       * class name.
       */
      if (element.clientWidth <= 1) return true;

      return false;
    };

    for (const element of Array.from(document.querySelectorAll("body *"))) {
      const style = getComputedStyle(element);

      if (style.display === "none" || style.visibility === "hidden") continue;

      const clips =
        style.overflowX === "hidden" ||
        style.overflowX === "clip" ||
        style.overflow === "hidden" ||
        style.overflow === "clip";

      if (!clips) continue;
      if (exempt(element, style)) continue;

      // A two-pixel tolerance: sub-pixel borders and rounding are not defects.
      const hidden = element.scrollWidth - element.clientWidth;

      if (hidden > 2) {
        offenders.push(
          `${element.tagName.toLowerCase()}.${String(element.className).slice(0, 40)} ` +
            `cuts ${hidden}px (content=${element.scrollWidth} visible=${element.clientWidth})`,
        );
      }
    }

    return offenders.slice(0, 5);
  });
}

test.describe.configure({ mode: "parallel" });

for (const target of PAGES) {
  test.describe(target.name, () => {
    for (const width of WIDTHS) {
      test(`does not scroll sideways at ${width}px`, async ({ page }) => {
        await signIn(page);
        await page.setViewportSize({ width, height: 900 });

        await page.goto(`${BASE}${target.path}`, {
          waitUntil: "networkidle",
          timeout: 60_000,
        });

        /**
         * The protected screen, and not the login one.
         *
         * The first version of this file passed at every width of every page
         * — against `/login`, because the seeded token carried no `role`,
         * `businessId` or `driverId`, and the app reads that as "your
         * permissions changed" and logs out. Eleven widths of a screen nobody
         * was measuring.
         */
        expect(
          page.url(),
          `${target.name} @ ${width}px fell through to login`,
        ).not.toContain("/login");

        /**
         * And not the error screen either, which is the same trap one step
         * further in. The error surface is a centred column that fits any
         * width and clips nothing, so it passes both measurements below
         * perfectly — two render-fatal bugs in /admin were green here for
         * exactly that reason.
         */
        await expect(
          page.locator("[data-error-surface]"),
          `${target.name} @ ${width}px caiu no limite de erro`,
        ).toHaveCount(0);

        // A page that scrolls horizontally on a phone is the most common and
        // most visible failure: the user drags and the content slides under
        // the header.
        //
        // Polled, not read once: "networkidle" is not hydration. Before React
        // owns the table, Radix's ScrollArea viewport is still server HTML
        // with `overflow-x: hidden` (its horizontal bar registers on the
        // client), so a busy dev server showed a 2266px table "cut" at 654px
        // that the hydrated page scrolls. A clip that is still there after
        // 20 s is a real one, and fails with its measurements.
        await expect
          .poll(() => horizontalOverflow(page), {
            timeout: 20_000,
            message: `${target.name} @ ${width}px scrolls sideways`,
          })
          .toBeLessThanOrEqual(2);

        await expect
          .poll(() => clippedContent(page), {
            timeout: 20_000,
            message: `${target.name} @ ${width}px cuts off content nobody can reach`,
          })
          .toEqual([]);
      });
    }
  });
}
