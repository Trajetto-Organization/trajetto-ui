import { createElement } from "react";

import { describe, expect, it } from "vitest";

import { renderHtml } from "./helpers/render-html";

import { DeliveriesSkeleton } from "@/features/deliveries/skeleton";

/**
 * The Entregas loading state against its action row (decision 3.6).
 *
 * The row stopped drawing icon squares on a phone: Exportar, Importar,
 * Atualizar and Nova entrega stack at full width with their labels, h-9 on
 * /admin and /dashboard alike (decision 16.61). The skeleton still drew four 36px
 * squares in one line, so every arrival on a phone jumped.
 */
function actionBars(html: string): string[] {
  // The group's children: consecutive empty skeleton bars.
  const group =
    /data-skeleton-actions[^>]*>((?:<div class="[^"]*"><\/div>)+)/.exec(
      html,
    )?.[1] ?? "";

  return [...group.matchAll(/class="([^"]*)"/g)].map((match) => match[1]);
}

describe("the Entregas skeleton's action row", () => {
  it.each([
    ["admin", "h-9"],
    ["dashboard", "h-9"],
  ] as const)(
    "on %s: full-width bars at %s, stacked on a phone",
    (mode, height) => {
      const html = renderHtml(createElement(DeliveriesSkeleton, { mode }));

      expect(html).toMatch(
        /data-skeleton-actions[^>]*class="[^"]*flex-col[^"]*sm:flex-row/,
      );

      const bars = actionBars(html);

      expect(bars).toHaveLength(4);

      for (const bar of bars) {
        expect(bar).toContain("w-full");
        expect(bar.split(/\s+/)).toContain(height);
        expect(bar).not.toMatch(/\bw-9\b/);
      }
    },
  );
});
