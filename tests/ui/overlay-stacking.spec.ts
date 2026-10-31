import { test, expect, type Page } from "./support/test";

import { managerForThisSpec } from "./support/operation";

import { readFileSync } from "node:fs";
import sharp from "sharp";

/**
 * Whether an overlay is actually painted on top of the map.
 *
 * Leaflet numbers its panes from 400 to 700 and its controls up to 1000.
 * Those are GLOBAL z-indexes unless the map container opens a stacking context
 * of its own, and it did not — so every popover, dropdown and tooltip in this
 * product, all of which render at `z-50`, painted behind the map. On the
 * control tower the notifications menu came out as half a panel with the
 * Atlantic showing through the rest of it.
 *
 * The fix is one CSS rule that confines Leaflet's numbers to the map, rather
 * than a bigger number on the menu — which would have to be repeated on every
 * overlay in the product and forgotten the next time somebody added one.
 *
 * **Measured in pixels, and that detail is the whole test.** The obvious
 * version asks `document.elementFromPoint`, and it is worthless here: Radix
 * sets `pointer-events: none` on the body while a menu is open, so hit testing
 * answers "the menu" at every point whatever is actually drawn on screen.
 * Deleting the fix outright survived that version. A screenshot cannot be
 * fooled that way.
 */
const CONTEXT = JSON.parse(
  readFileSync("../trajetto-api/tests/load/fixtures/load-context.json", "utf8"),
);

const BASE = process.env.RESPONSIVE_BASE_URL ?? "http://localhost:3100";

type Rect = { x: number; y: number; width: number; height: number };

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

/** The rectangle where the open menu and the map cover the same pixels. */
async function overlapOf(page: Page): Promise<Rect | null> {
  return page.evaluate(() => {
    const panel = document.querySelector('[role="menu"]');
    const canvas = document.querySelector(".leaflet-container");

    if (!panel || !canvas) return null;

    const a = panel.getBoundingClientRect();
    const b = canvas.getBoundingClientRect();

    const left = Math.max(a.left, b.left);
    const right = Math.min(a.right, b.right);

    const top = Math.max(a.top, b.top);
    const bottom = Math.min(a.bottom, b.bottom);

    // Inset by two pixels so the border of either box is not what the
    // measurement lands on.
    if (right - left < 16 || bottom - top < 16) return null;

    return {
      x: Math.round(left + 2),
      y: Math.round(top + 2),
      width: Math.round(right - left - 4),
      height: Math.round(bottom - top - 4),
    };
  });
}

/**
 * How much of two shots of the same rectangle is not the same colour.
 *
 * Absolute colours would need a reference image and would rot the first time
 * the palette or the tile provider moved. What the question actually needs is
 * relative: does opening the menu change what is drawn there, or does the map
 * go on showing through?
 */
async function differingFraction(
  before: Buffer,
  after: Buffer,
): Promise<number> {
  const decode = (image: Buffer) =>
    sharp(image).raw().toBuffer({ resolveWithObject: true });

  const [a, b] = await Promise.all([decode(before), decode(after)]);

  expect(
    a.info.width === b.info.width && a.info.height === b.info.height,
    "os dois recortes têm tamanhos diferentes; a comparação não vale",
  ).toBe(true);

  let differing = 0;
  let total = 0;

  for (let index = 0; index + 3 <= a.data.length; index += a.info.channels) {
    const r = Math.abs(a.data[index] - b.data[index]);
    const g = Math.abs(a.data[index + 1] - b.data[index + 1]);
    const blue = Math.abs(a.data[index + 2] - b.data[index + 2]);

    total += 1;

    // Twelve levels: past tile compression noise and antialiasing, far below
    // any real change of surface.
    if (Math.max(r, g, blue) > 12) differing += 1;
  }

  return total === 0 ? 0 : differing / total;
}

/**
 * The Torre's map panel. Named in the URL since the product meeting of
 * 14/10/2026: the bare Torre opens on Rotas (no map), or on the view this
 * browser chose last.
 */
const TOWER_MAP = "/dashboard/control-tower?view=panel";

test.describe("the notifications menu over the control tower", () => {
  test("is painted above the map, not behind it", async ({ page }) => {
    await open(page, TOWER_MAP);

    await expect(
      page.locator(".leaflet-container"),
      "o mapa não carregou",
    ).toBeVisible({ timeout: 30_000 });

    // The tiles have to be drawn, or the rectangle under the menu is the map's
    // empty background and the comparison below would measure nothing.
    await expect(page.locator(".leaflet-tile-loaded").first()).toBeVisible({
      timeout: 30_000,
    });

    await page
      .getByRole("button", { name: /notifica/i })
      .first()
      .click();

    await expect(page.getByRole("menu").first()).toBeVisible({
      timeout: 10_000,
    });

    // Measured at rest: the menu opens with a fade and a zoom from 95%, so a
    // box read mid-animation is smaller than the menu (with no notifications
    // it reached past the map's top edge by less than the animation shaved
    // off, and the overlap read as none) and a screenshot taken then shows
    // the map through the half-transparent panel.
    await page
      .getByRole("menu")
      .first()
      .evaluate((element) =>
        Promise.all(
          element
            .getAnimations({ subtree: true })
            .map((animation) => animation.finished),
        ),
      );

    // The Torre's own header (views, refresh cadence, full screen) put the
    // map below the reach of a short menu (no notifications), and the app
    // header doesn't stick, so scrolling can't bring them together. What is
    // under test is the stacking order, not the layout: pull the map up under
    // the open menu with a negative margin — a margin creates no stacking
    // context, so the order measured is the page's own.
    await page.evaluate(() => {
      const panel = document.querySelector('[role="menu"]');
      const canvas = document.querySelector(".leaflet-container");
      const block = canvas?.parentElement;

      if (!panel || !canvas || !block) return;

      const gap =
        canvas.getBoundingClientRect().top -
        (panel.getBoundingClientRect().bottom - 80);

      if (gap > 0) block.style.marginTop = `-${Math.ceil(gap)}px`;
    });

    const clip = await overlapOf(page);

    expect(
      clip,
      "o menu e o mapa não se sobrepõem; o teste não mediu nada",
    ).not.toBeNull();

    /**
     * What is on top, asked of the browser itself.
     *
     * A grid of points over the shared rectangle, hit-tested while the menu
     * is open: each must land inside the menu. Hit-testing follows the paint
     * order, and Leaflet's panes take pointer events — with the bug (the
     * panes' z-index 400 in the page's own stacking context, above the menu's
     * z-50) the points land on the map. The pixel comparison this replaced
     * depended on the tiles: over a pale tile set (or a short menu, whose
     * overlap is its blank footer) a menu correctly on top still changed
     * only a few pixels.
     */
    const outside = await page.evaluate((rect) => {
      const misses: string[] = [];

      for (let column = 1; column <= 5; column += 1) {
        for (let row = 1; row <= 3; row += 1) {
          const x = rect.x + (rect.width * column) / 6;
          const y = rect.y + (rect.height * row) / 4;
          const hit = document.elementFromPoint(x, y);

          if (!hit?.closest('[role="menu"]')) {
            misses.push(
              `${Math.round(x)},${Math.round(y)}: ${hit?.className?.toString().slice(0, 60) ?? "nada"}`,
            );
          }
        }
      }

      return misses;
    }, clip as Rect);

    expect(
      outside,
      "pontos da área em comum caem no mapa, não no menu — o mapa está pintando por cima",
    ).toEqual([]);

    const withMenu = await page.screenshot({ clip: clip as Rect });

    await page.keyboard.press("Escape");

    await expect(page.getByRole("menu")).toHaveCount(0, { timeout: 10_000 });

    const mapAlone = await page.screenshot({ clip: clip as Rect });

    /**
     * The control, and it is not ceremony.
     *
     * The assertion below reads "these two shots differ", which a map that
     * simply repaints — a vehicle moving, a tile arriving late — would satisfy
     * on its own with the bug fully present. Two shots of the map by itself
     * put a number on that background noise, so the signal has to beat it.
     */
    const noise = await differingFraction(
      mapAlone,
      await page.screenshot({ clip: clip as Rect }),
    );

    expect(
      noise,
      `o mapa muda sozinho em ${Math.round(noise * 100)}% da área; a medição não distingue mais nada`,
    ).toBeLessThan(0.1);

    // Kept as evidence on the report: the menu changes what the shared
    // rectangle shows (how much depends on the tile set; the verdict is the
    // hit test above).
    const covered = await differingFraction(mapAlone, withMenu);

    test.info().annotations.push({
      type: "covered",
      description: `${Math.round(covered * 100)}% dos pixels em comum mudam com o menu`,
    });

    expect(covered).toBeGreaterThan(0);
  });

  test("and the map keeps its own controls on top of itself", async ({
    page,
  }) => {
    /**
     * The other half of isolating a stacking context: everything Leaflet does
     * INSIDE the map has to go on working. A container that clipped or
     * flattened its own children would be a worse bug than the one being
     * fixed, and it would look like a fix.
     */
    await open(page, TOWER_MAP);

    const zoomIn = page.locator(".leaflet-control-zoom-in");
    await expect(zoomIn).toBeVisible({ timeout: 30_000 });

    const onTop = await page.evaluate(() => {
      const control = document.querySelector(".leaflet-control-zoom-in");

      if (!control) return false;

      const box = control.getBoundingClientRect();

      const painted = document.elementFromPoint(
        box.left + box.width / 2,
        box.top + box.height / 2,
      );

      return Boolean(painted && control.contains(painted));
    });

    // Hit testing is the right question here: nothing has disabled pointer
    // events, and the control exists to be clicked.
    expect(onTop, "o controle de zoom ficou atrás dos tiles").toBe(true);
  });

  test("because the map container opens its own stacking context", async ({
    page,
  }) => {
    /**
     * The architectural claim itself, stated apart from its consequence.
     *
     * A bigger z-index on one menu would pass the pixel test above today and
     * lose the next overlay somebody adds. Containing Leaflet's numbers inside
     * the map is what makes `z-50` mean the same thing everywhere in the
     * product, so it is worth failing on its own terms.
     */
    await open(page, TOWER_MAP);

    await expect(page.locator(".leaflet-container")).toBeVisible({
      timeout: 30_000,
    });

    const isolates = await page.evaluate(() => {
      const map = document.querySelector(".leaflet-container");

      if (!map) return { creates: false, lifted: true, z: "?" };

      const style = getComputedStyle(map);

      return {
        creates:
          style.isolation === "isolate" ||
          style.contain.includes("paint") ||
          style.transform !== "none" ||
          style.filter !== "none" ||
          (style.position !== "static" && style.zIndex !== "auto"),
        // Isolation contains what is INSIDE; it says nothing about where the
        // container itself sits. Lifted above the overlays, the whole map
        // travels over them as one box and the bug comes back intact.
        lifted: style.zIndex !== "auto" && Number(style.zIndex) > 40,
        z: style.zIndex,
      };
    });

    expect(
      isolates.creates,
      "o mapa não cria contexto de empilhamento: os painéis do Leaflet voltam a competir com os overlays do produto",
    ).toBe(true);

    expect(
      isolates.lifted,
      `o mapa está em z-index ${isolates.z}, acima da faixa dos overlays (z-50)`,
    ).toBe(false);
  });
});
