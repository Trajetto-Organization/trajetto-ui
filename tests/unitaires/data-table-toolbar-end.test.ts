import { createElement } from "react";

import { describe, expect, it } from "vitest";

import { renderHtml } from "./helpers/render-html";

import { DataTableToolbarEnd } from "@/app/(protected)/_components/shared/tanstack-table/data-table-toolbar-end";

/**
 * The right end of a table toolbar (decision of 28/10/2026): what frames the
 * whole list (a period) and Visualizar, as one group that sits on the
 * filters' line while it fits and moves down whole when it does not.
 */
const table = { getAllColumns: () => [] } as never;

describe("the toolbar's end group", () => {
  it("holds the period and then Visualizar, pushed right and wrapping as one", () => {
    const html = renderHtml(
      createElement(
        DataTableToolbarEnd,
        { table },
        createElement("div", { "data-period": "" }),
      ),
    );

    expect(html).toMatch(/^<div data-toolbar-end/);
    expect(html).toContain("sm:ml-auto");
    expect(html).toContain("flex-wrap");
    // Full width on a phone, its own width from `sm`.
    expect(html).toContain("w-full");
    expect(html).toContain("sm:w-auto");

    expect(html.indexOf("data-period")).toBeLessThan(
      html.indexOf('data-tutorial="view-options"'),
    );
  });

  it("keeps the period and drops Visualizar when the read failed", () => {
    const html = renderHtml(
      createElement(
        DataTableToolbarEnd,
        { table, error: true },
        createElement("div", { "data-period": "" }),
      ),
    );

    expect(html).toContain("data-period");
    expect(html).not.toContain("Visualizar");
  });

  it("draws nothing when it has nothing to hold", () => {
    expect(
      renderHtml(createElement(DataTableToolbarEnd, { error: true })),
    ).toBe("");
  });
});
