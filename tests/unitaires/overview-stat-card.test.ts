import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { beforeAll, describe, expect, it, vi } from "vitest";

/**
 * The overview count cards.
 *
 * At 1024px with the sidebar open (visual sweep, wave 4b) the coloured band
 * was `w-1/4` with `p-4`, so on a 150px card it left the icon 6px wide — a
 * dot. Later (08/10/2026) the cards captioned "em relação ao mesmo período do
 * mês passado" wrapped to three lines and stood taller than their neighbours:
 * the grid now gives every row one height. The owner's polish round of the
 * same day took the reserved second caption line back out (it left an empty
 * strip under every one-line caption) and widened the band to w-14.
 */
import {
  StatCard,
  StatCardGrid,
} from "@/app/(protected)/_components/overview-dashboard/stat-card";
import { comparisonDescription, comparisonLabel } from "@/lib/dashboard-counts";

import { hasChromium, measureInChromium } from "./helpers/measure-in-chromium";

vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

(globalThis as { React?: typeof React }).React = React;

const card = (props: {
  title: string;
  change: number;
  basis: "total" | "month_to_date";
}) =>
  createElement(StatCard, {
    key: props.title,
    title: props.title,
    value: 20042,
    change: props.change,
    comparison: comparisonLabel(props.basis),
    comparisonTitle: comparisonDescription(props.basis),
    icon: createElement("svg", { className: "h-6 w-6" }),
    color: "#6366f1",
  });

describe("StatCard", () => {
  const html = renderToStaticMarkup(
    card({ title: "Fornecedores", change: 100, basis: "month_to_date" }),
  );

  it("keeps a fixed-width band that does not shrink, so the icon fits", () => {
    const band =
      /<div data-stat-card-band="[^"]*" class="([^"]*)"/.exec(html)?.[1] ?? "";

    expect(band.split(/\s+/)).toEqual(
      expect.arrayContaining(["w-14", "md:w-12", "lg:w-14", "shrink-0"]),
    );
    expect(band).not.toMatch(/\bw-1\/4\b/);
    expect(band).not.toMatch(/\bp-4\b/);
  });

  it("lets the text take the rest and shrink without pushing the band", () => {
    expect(html).toContain('class="min-w-0 flex-1"');
  });

  it("clamps the caption to two lines without reserving the second, and keeps the full sentence on hover", () => {
    const caption =
      /<p data-stat-card-caption="[^"]*" aria-hidden="true" title="([^"]*)" class="([^"]*)"/.exec(
        html,
      );

    expect(caption?.[2].split(/\s+/)).toEqual(
      expect.arrayContaining(["line-clamp-2", "leading-4"]),
    );
    expect(caption?.[2].split(/\s+/)).not.toContain("min-h-8");
    expect(caption?.[1]).toBe(
      "+100% em relação ao mesmo período do mês anterior",
    );
    expect(html).toContain("+100% vs. mês anterior");
  });

  it("gives screen readers the full sentence, kept out of a copy of the card", () => {
    expect(html).toContain(
      '<span data-stat-card-sr="true" class="sr-only select-none">+100% em relação ao mesmo período do mês anterior</span>',
    );
  });
});

interface Measured {
  heights: number[];
  captionLines: number[];
  /** Captions and titles whose text does not fit (cut with "…"). */
  clipped: string[];
}

const measureCards = (): Measured => {
  const cards = Array.from(
    document.querySelectorAll<HTMLElement>("[data-stat-card]"),
  );
  const captions = Array.from(
    document.querySelectorAll<HTMLElement>("[data-stat-card-caption]"),
  );

  return {
    heights: cards.map((element) =>
      Math.round(element.getBoundingClientRect().height),
    ),
    captionLines: captions.map((element) =>
      Math.round(
        element.getBoundingClientRect().height /
          parseFloat(getComputedStyle(element).lineHeight),
      ),
    ),
    clipped: [
      ...captions,
      ...Array.from(
        document.querySelectorAll<HTMLElement>("[data-stat-card] [title]"),
      ),
    ]
      // scrollWidth rounds to whole pixels and hid a 117.4px title in a
      // 116.9px box; a Range measures the laid-out text exactly.
      .filter((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        const text = range.getBoundingClientRect();
        const style = getComputedStyle(element);
        const box =
          element.getBoundingClientRect().width -
          parseFloat(style.paddingLeft) -
          parseFloat(style.paddingRight);

        return (
          element.scrollHeight > element.clientHeight + 1 ||
          text.width > box + 0.1
        );
      })
      .map((element) => element.textContent ?? ""),
  };
};

describe.skipIf(!hasChromium)(
  "the count card grid, measured in Chromium (skipped without an installed browser)",
  () => {
    // A long title, short and long captions, a negative change: everything
    // that used to give one card its own height.
    const grid = createElement(
      StatCardGrid,
      null,
      card({ title: "Veículos", change: 0, basis: "total" }),
      card({ title: "Ordens de Serviço", change: 100, basis: "month_to_date" }),
      card({ title: "Multas", change: -67, basis: "month_to_date" }),
      card({ title: "Usuários", change: 25, basis: "total" }),
      card({ title: "Entregas", change: 100, basis: "month_to_date" }),
    );

    const widths = [1440, 1024, 768, 390, 320];
    const measured = new Map<number, Measured>();

    beforeAll(async () => {
      for (const width of widths) {
        // The page's content column at that width, as measured in the app:
        // from 768px the sidebar (256px) and gutters take 368px, below it the
        // gutters take 64px (1072/656/400/326/256px).
        const content = width >= 768 ? width - 368 : width - 64;

        measured.set(
          width,
          await measureInChromium(
            createElement("div", { style: { width: content } }, grid),
            measureCards,
            { width },
          ),
        );
      }
    }, 120_000);

    it.each(widths)("gives every card the same height at %ipx", (width) => {
      const { heights } = measured.get(width)!;

      expect(heights).toHaveLength(5);
      expect(new Set(heights).size).toBe(1);
    });

    it.each(widths)(
      "never lets a caption take more than two lines at %ipx",
      (width) => {
        const { captionLines } = measured.get(width)!;

        for (const lines of captionLines) expect(lines).toBeLessThanOrEqual(2);
      },
    );

    // Red before: "vs. mesmo período do mês anterior" was cut at 1024px and
    // 768px, and "Ordens de Serviço" at 768px (band w-14, px-4).
    it.each(widths)("never cuts a caption or a title at %ipx", (width) => {
      expect(measured.get(width)!.clipped).toEqual([]);
    });
  },
);
