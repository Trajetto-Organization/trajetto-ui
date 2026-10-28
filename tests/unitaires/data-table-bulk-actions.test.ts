import * as React from "react";
import { act, createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "@tanstack/react-table";

/**
 * Row selection exists only where something acts on it.
 *
 * Seventeen lists drew a checkbox column by hand and only Entregas did
 * anything with the checked rows ("Adicionar à rota"): everywhere else the
 * user could tick rows, read "2 de 10 linha(s) selecionadas" and find no
 * action at all. The DataTable now draws the checkboxes only when it is given
 * `bulkActions`, and hands those actions the checked rows.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
  usePathname: () => "/dashboard/deliveries",
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import {
  DataTable,
  type TableSelection,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table";

// This runner compiles JSX with the classic runtime.
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

async function click(element: Element): Promise<void> {
  await act(async () => {
    (element as HTMLElement).click();
  });
}

type Delivery = { id: string; recipient: string };

const ROWS: Delivery[] = [
  { id: "delivery-ana", recipient: "Ana" },
  { id: "delivery-bruno", recipient: "Bruno" },
];

const COLUMNS: ColumnDef<Delivery, unknown>[] = [
  { accessorKey: "recipient", header: "Destinatário" },
];

const NO_ERROR = { error: false, errorMessage: "" };

function checkboxOf(host: HTMLElement, recipient: string): Element {
  const row = Array.from(host.querySelectorAll("tbody tr")).find((candidate) =>
    candidate.textContent?.includes(recipient),
  );
  const checkbox = row?.querySelector('[role="checkbox"]');

  if (!checkbox) throw new Error(`sem a caixa de ${recipient}`);

  return checkbox;
}

describe("a DataTable without bulk actions", () => {
  it("draws no checkbox and counts rows instead of a selection", async () => {
    const host = await mount(
      createElement(DataTable<Delivery, unknown>, {
        columns: COLUMNS,
        data: ROWS,
        meta: { total: 2, page: 1, pageSize: 10 },
        responseError: NO_ERROR,
      }),
    );

    expect(host.querySelectorAll('[role="checkbox"]')).toHaveLength(0);
    expect(host.querySelectorAll("thead th")).toHaveLength(1);
    expect(host.textContent).toContain("2 linha(s) nesta página.");
    expect(host.textContent).not.toContain("selecionadas");
  });
});

describe("a DataTable with bulk actions", () => {
  let reported: TableSelection<Delivery> | null = null;

  const element = (data: Delivery[] = ROWS) =>
    createElement(DataTable<Delivery, unknown>, {
      columns: COLUMNS,
      data,
      meta: { total: data.length, page: 1, pageSize: 10 },
      responseError: NO_ERROR,
      bulkActions: {
        dataTutorial: "deliveries-select-all",
        render: (selection) => {
          reported = selection;

          return selection.rows.length > 0
            ? createElement(
                "button",
                { type: "button", "data-bulk": "" },
                `Adicionar ${selection.rows.length} à rota`,
              )
            : null;
        },
      },
    });

  it("puts a checkbox column first, with the tour anchor on select-all", async () => {
    const host = await mount(element());

    const headers = host.querySelectorAll("thead th");

    expect(headers).toHaveLength(2);

    const selectAll = headers[0].querySelector('[role="checkbox"]');

    expect(selectAll?.getAttribute("aria-label")).toBe(
      "Selecionar todas as linhas",
    );
    expect(selectAll?.getAttribute("data-tutorial")).toBe(
      "deliveries-select-all",
    );
    const rowBox = checkboxOf(host, "Ana");

    expect(rowBox.getAttribute("aria-label")).toBe("Selecionar linha");
  });

  it("hands the checked rows to the actions, and clears them on request", async () => {
    const host = await mount(element());

    expect(reported?.rows).toEqual([]);
    expect(host.querySelector("[data-bulk]")).toBeNull();

    await click(checkboxOf(host, "Bruno"));

    expect(reported?.rows).toEqual([ROWS[1]]);
    expect(host.querySelector("[data-bulk]")?.textContent).toBe(
      "Adicionar 1 à rota",
    );
    expect(host.textContent).toContain("1 de 2 linha(s) selecionadas.");

    await act(async () => reported!.clear());

    expect(reported?.rows).toEqual([]);
    expect(host.querySelector("[data-bulk]")).toBeNull();
  });

  it("spans the empty row over the checkbox column too", async () => {
    const host = await mount(element([]));

    const emptyCell = host.querySelector('td[data-tutorial="table-empty"]');

    expect(emptyCell?.getAttribute("colspan")).toBe("2");
  });
});
