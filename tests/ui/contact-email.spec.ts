import { test, expect } from "./support/test";

/**
 * The e-mail channel on /contato, in a real browser: the link answers only on
 * its text (it used to be a block that took the empty row up to the copy
 * button), the copy button is its own target, and nothing sits on top of
 * either. Both are reachable with Tab. No session needed.
 */
const BASE = process.env.RESPONSIVE_BASE_URL ?? "http://localhost:3100";

for (const width of [1440, 768, 390, 320]) {
  test(`e-mail link and copy button keep separate hit areas at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${BASE}/contato`, { waitUntil: "load", timeout: 90_000 });

    const link = page.locator("a[data-contact-email]");
    const button = page.getByRole("button", { name: "Copiar e-mail" });
    await expect(link).toBeVisible();

    // Measured at rest: the column slides in (CSS `tpUp`, under a second).
    // Every running, finite animation on the link or on a box around it is
    // waited for, instead of a fixed time after the link showed; a paused
    // one (a reveal waiting to scroll in) never finishes and is left out.
    await link.evaluate((anchor) => {
      const moving: Array<Promise<unknown>> = [];

      for (let node: Element | null = anchor; node; node = node.parentElement) {
        for (const animation of node.getAnimations()) {
          if (
            animation.playState === "running" &&
            animation.effect?.getComputedTiming().endTime !== Infinity
          ) {
            moving.push(animation.finished.catch(() => undefined));
          }
        }
      }

      return Promise.all(moving);
    });

    const geometry = await link.evaluate((anchor) => {
      const range = document.createRange();
      range.selectNodeContents(anchor);
      const text = range.getBoundingClientRect();
      const box = anchor.getBoundingClientRect();
      const copy = document
        .querySelector('button[aria-label="Copiar e-mail"]')!
        .getBoundingClientRect();
      const y = text.top + text.height / 2;
      const hit = (x: number) => document.elementFromPoint(x, y);

      const lines = new Set(
        [...range.getClientRects()].map((rect) => Math.round(rect.top)),
      ).size;

      return {
        boxWidth: box.width,
        textWidth: text.width,
        lines,
        columnWidth: anchor.parentElement!.getBoundingClientRect().width,
        // Points on the text belong to the link.
        textHits: [0.1, 0.5, 0.9].every((f) =>
          hit(text.left + text.width * f)?.closest("a[data-contact-email]"),
        ),
        // The gap between the text and the button belongs to neither.
        gapHit:
          copy.left - box.right > 4
            ? (hit((box.right + copy.left) / 2)?.closest("a, button")
                ?.tagName ?? null)
            : null,
        // The middle of the button is the button.
        buttonHit:
          hit(copy.left + copy.width / 2)
            ?.closest("button")
            ?.getAttribute("aria-label") ?? null,
      };
    });

    if (geometry.lines === 1) {
      expect(geometry.boxWidth).toBeLessThanOrEqual(geometry.textWidth + 2);
    } else {
      // Wrapped (320px, after the "@"): an inline-block that wraps takes its
      // column's width, which still ends before the copy button.
      expect(geometry.boxWidth).toBeLessThanOrEqual(geometry.columnWidth + 0.5);
    }
    expect(geometry.textHits).toBe(true);
    expect(geometry.gapHit).toBeNull();
    expect(geometry.buttonHit).toBe("Copiar e-mail");

    // Keyboard: Tab from the link reaches the copy button.
    await link.focus();
    await expect(link).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(button).toBeFocused();
  });
}
