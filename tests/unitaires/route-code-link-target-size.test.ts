import { createElement } from "react";

import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/routes",
  useSearchParams: () => new URLSearchParams(),
}));

import { RouteCodeLink } from "@/features/routes/route-code-link";

import { hasChromium, measureInChromium } from "./helpers/measure-in-chromium";

/**
 * "Rota 12" in the Rotas table is the way to the route's page, and on a phone
 * it is tapped with a finger.
 *
 * Found by tests/a11y/accessibility.spec.ts at 390px: the link was a block of
 * one line of text-sm, 20px tall — under the 24x24 CSS pixels of WCAG 2.5.8
 * (AA). A link inside a sentence is exempt; this one is a control of its own
 * in a table cell, so it is not. Measured in Chromium with the Tailwind the
 * app ships, inside a cell as narrow as the table's.
 */

vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

function measureLink(): { width: number; height: number } {
  const box = document.querySelector("a")!.getBoundingClientRect();

  return { width: box.width, height: box.height };
}

describe.skipIf(!hasChromium)(
  `the route link in the table${hasChromium ? "" : " — skipped: Chromium is not installed"}`,
  () => {
    it("is at least 24x24 for a finger (WCAG 2.5.8)", async () => {
      const size = await measureInChromium(
        createElement(
          "div",
          { className: "w-[160px] text-sm" },
          createElement(RouteCodeLink, {
            routeId: "018f0000-0000-7000-8000-0000000000a7",
            code: 12,
          }),
        ),
        measureLink,
        { width: 390, height: 844 },
      );

      expect(size.height, `altura ${size.height}px`).toBeGreaterThanOrEqual(24);
      expect(size.width, `largura ${size.width}px`).toBeGreaterThanOrEqual(24);
    }, 60_000);
  },
);
