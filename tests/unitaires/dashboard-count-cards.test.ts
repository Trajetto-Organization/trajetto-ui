import { describe, expect, it } from "vitest";

import {
  comparisonDescription,
  comparisonLabel,
  countCard,
  percentChange,
} from "@/lib/dashboard-counts";

/**
 * The overview cards (Veículos, Motoristas, Usuários…) showed what was created
 * this month: twenty active drivers registered last year read "0, -100% em
 * relação ao mês passado". The card now shows the API's `value` and compares
 * it with `previous`.
 */
describe("countCard", () => {
  it("shows a catalogue's total and its growth since the month began", () => {
    // Red before: value 0 (nothing created this month) and -100%.
    expect(
      countCard({
        currentMonth: 0,
        lastMonth: 3,
        basis: "total",
        value: 20,
        previous: 20,
      }),
    ).toEqual({ value: 20, change: 0, basis: "total" });

    expect(
      countCard({
        currentMonth: 5,
        lastMonth: 0,
        basis: "total",
        value: 25,
        previous: 20,
      }),
    ).toEqual({ value: 25, change: 25, basis: "total" });
  });

  it("shows an operation's month so far against last month up to the same point", () => {
    expect(
      countCard({
        currentMonth: 30,
        lastMonth: 400,
        basis: "month_to_date",
        value: 30,
        previous: 40,
      }),
    ).toEqual({ value: 30, change: -25, basis: "month_to_date" });
  });

  it("keeps the monthly reading for an API that does not send value yet", () => {
    expect(countCard({ currentMonth: 4, lastMonth: 2 })).toEqual({
      value: 4,
      change: 100,
      basis: "month_to_date",
    });
  });
});

describe("percentChange", () => {
  it("is whole percent, and from zero any growth is +100%", () => {
    expect(percentChange(3, 2)).toBe(50);
    expect(percentChange(1, 3)).toBe(-67);
    expect(percentChange(5, 0)).toBe(100);
    expect(percentChange(0, 0)).toBe(0);
  });
});

describe("comparisonLabel", () => {
  it("is a short caption, so no card wraps or clips at any width", () => {
    // Red before: "em relação ao mesmo período do mês passado" (43 chars)
    // wrapped to three lines, then "vs. mesmo período do mês anterior" (33)
    // was clipped to "vs. mesmo período…" on the 1024px and 768px grids.
    expect(comparisonLabel("total")).toBe("vs. início do mês");
    expect(comparisonLabel("month_to_date")).toBe("vs. mês anterior");

    for (const basis of ["total", "month_to_date"] as const) {
      expect(comparisonLabel(basis).length).toBeLessThanOrEqual(18);
    }
  });

  it("keeps the full sentence for the tooltip", () => {
    expect(comparisonDescription("total")).toBe(
      "em relação ao total no início do mês",
    );
    expect(comparisonDescription("month_to_date")).toBe(
      "em relação ao mesmo período do mês anterior",
    );
  });
});
