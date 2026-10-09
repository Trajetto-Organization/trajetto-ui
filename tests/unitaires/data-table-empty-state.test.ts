import * as React from "react";
import { act, createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";

import { afterEach, describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "@tanstack/react-table";

/**
 * What an empty DataTable shows (visual sweep, wave 4b).
 *
 * Three defects seen in the screenshots: on a table wider than the screen the
 * "Nenhum resultado encontrado" text was centred on the full row, past the
 * right edge of a 768px tablet (an empty box); the pager read "Página 1 de 0";
 * and the page-size select arrived empty from the server until hydration.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
  usePathname: () => "/admin/quote",
}));

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";
import { DataTablePagination } from "@/app/(protected)/_components/shared/tanstack-table/data-table-pagination";

(globalThis as { React?: typeof React }).React = React;

let root: Root | null = null;

async function mount(element: ReactElement): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root!.render(element);
  });

  return host;
}

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

type Row = { id: string; name: string };

const COLUMNS: ColumnDef<Row, unknown>[] = [
  { accessorKey: "id", header: "Identificador" },
  { accessorKey: "name", header: "Nome" },
];

const table = (data: Row[], total: number) =>
  createElement(DataTable<Row, unknown>, {
    columns: COLUMNS,
    data,
    meta: { total, page: 1, pageSize: 10 },
    responseError: { error: false, errorMessage: "" },
  });

describe("empty DataTable", () => {
  it("draws the message outside the scroll area, at the visible width, and keeps the text in the cell for screen readers", async () => {
    const host = await mount(table([], 0));

    const overlay = host.querySelector("[data-table-empty-message]");

    expect(overlay?.textContent).toBe("Nenhum resultado encontrado");
    // A sibling of the scroll area, not inside the row that scrolls.
    expect(overlay?.closest("table")).toBeNull();
    expect(overlay?.className).toContain("inset-x-0");
    expect(overlay?.getAttribute("aria-hidden")).toBe("true");

    const cell = host.querySelector('[data-tutorial="table-empty"]')!;

    expect(cell.querySelector(".sr-only")?.textContent).toBe(
      "Nenhum resultado encontrado",
    );
  });

  it("with no rows, the pagination says 'Página 1 de 1', not 'de 0'", async () => {
    const host = await mount(table([], 0));

    expect(host.textContent).toContain("Página 1 de 1");
    expect(host.textContent).not.toContain("Página 1 de 0");

    // One line: at 768px with the sidebar it wrapped into "Página 1" / "de 1".
    const label = Array.from(host.querySelectorAll("div")).find((node) =>
      /^Página \d+ de \d+$/.test(node.textContent ?? ""),
    );

    expect(label?.className).toContain("whitespace-nowrap");
  });

  it("with rows, does not draw the empty message", async () => {
    const host = await mount(table([{ id: "a", name: "Ana" }], 1));

    expect(host.querySelector("[data-table-empty-message]")).toBeNull();
    expect(host.textContent).toContain("Página 1 de 1");
  });
});

describe("DataTable with nothing focusable in its rows", () => {
  it("the scroll area becomes a named Tab stop, so the keyboard can scroll", async () => {
    const host = await mount(table([{ id: "a", name: "Ana" }], 1));

    const viewport = host.querySelector("[data-radix-scroll-area-viewport]")!;

    expect(viewport.getAttribute("tabindex")).toBe("0");
    expect(viewport.getAttribute("aria-label")).toBe("Tabela de resultados");
  });

  it("with a selection or actions column, does not add another stop", async () => {
    const withSelect = createElement(DataTable<Row, unknown>, {
      columns: [{ id: "select", header: "" }, ...COLUMNS],
      data: [{ id: "a", name: "Ana" }],
      meta: { total: 1, page: 1, pageSize: 10 },
      responseError: { error: false, errorMessage: "" },
    });

    const host = await mount(withSelect);

    expect(
      host
        .querySelector("[data-radix-scroll-area-viewport]")!
        .hasAttribute("tabindex"),
    ).toBe(false);
  });
});

describe("DataTablePagination in the server HTML", () => {
  it("the rows-per-page selector already has its value before hydration", () => {
    const fakeTable = {
      getState: () => ({ pagination: { pageIndex: 0, pageSize: 20 } }),
      getAllColumns: () => [],
      getFilteredRowModel: () => ({ rows: [] }),
      getFilteredSelectedRowModel: () => ({ rows: [] }),
      getPageCount: () => 1,
      getCanPreviousPage: () => false,
      getCanNextPage: () => false,
      setPageSize: () => {},
      setPageIndex: () => {},
      previousPage: () => {},
      nextPage: () => {},
    };

    const html = renderToString(
      createElement(DataTablePagination as never, {
        table: fakeTable,
        error: false,
      }),
    );

    const trigger = html.match(
      /<button[^>]*id="pageSize"[^>]*>([\s\S]*?)<\/button>/,
    );

    expect(trigger?.[1]).toMatch(/>20</);
  });
});
