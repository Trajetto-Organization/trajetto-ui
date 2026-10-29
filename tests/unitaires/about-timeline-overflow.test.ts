import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { AboutTimeline } from "@/components/about/timeline";

import { hasChromium, measureInChromium } from "./helpers/measure-in-chromium";

/**
 * /sobre must not scroll sideways because of its timeline.
 *
 * The old timeline (found by tests/responsive/admin-and-public.spec.ts, 6px
 * at 768 and 800) started its right-hand cards translated 30px to the right
 * and pushed the page wide until each was revealed. The redesign's timeline
 * (Sobre · Linha do tempo) is wider than the screen on purpose: from 760px
 * its cards sit in one row. Whatever row is wider than the viewport must be
 * clipped or scroll inside its own box, never widen the document. Measured
 * as the server renders it (the row scrolls inside itself; the pinned mode
 * only starts after hydration, inside a box that clips).
 */
describe.skipIf(!hasChromium)(
  `the /sobre timeline does not scroll the page sideways${hasChromium ? "" : " — skipped: Chromium is not installed"}`,
  () => {
    for (const width of [768, 800, 1000, 1440]) {
      it(`at ${width}px`, async () => {
        const layout = await measureInChromium(
          createElement(AboutTimeline),
          () => {
            const cards = Array.from(
              document.querySelectorAll("section#timeline article"),
            )
              .map((card) => card.getBoundingClientRect())
              .filter((box) => box.width > 0);

            return {
              viewport: document.documentElement.clientWidth,
              scrollWidth: document.documentElement.scrollWidth,
              cards: cards.length,
              widestRight: Math.max(...cards.map((box) => box.right)),
            };
          },
          { width, height: 900 },
        );

        // The row really is wider than the screen, so the check means something.
        expect(layout.cards).toBe(4);
        expect(layout.widestRight).toBeGreaterThan(layout.viewport);
        expect(
          layout.scrollWidth,
          `documento com ${layout.scrollWidth}px em ${layout.viewport}px`,
        ).toBeLessThanOrEqual(layout.viewport);
      }, 60_000);
    }
  },
);
