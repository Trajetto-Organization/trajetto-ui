import * as React from "react";
import { act, createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ColumnDef, Table } from "@tanstack/react-table";

/**
 * Filters and search of a server-side list, clicked faster than the server
 * answers.
 *
 * Every tick pushed a URL at once, computed from `useSearchParams()`, which
 * only moves when the server's rows arrive. A second filter ticked before the
 * first came back was written over the old URL and erased the first; a term
 * typed just before a click went out from the URL it saw at the keystroke and
 * dropped the filter; and a checkbox stayed unchecked, under a skeleton that
 * replaced the whole table, until the round trip ended. The list now keeps
 * what was asked, shows it at once, and sends it in one request.
 *
 * The URL below never moves by itself, like a server that has not answered.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

const navigation = vi.hoisted(() => ({
  params: new URLSearchParams(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => navigation.params,
  useRouter: () => ({ push: navigation.push, refresh: () => {} }),
  usePathname: () => "/dashboard/deliveries",
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";
import { DataTableServerFilters } from "@/app/(protected)/_components/shared/tanstack-table/data-table-server-filters";
import { LIST_QUERY_DEBOUNCE_MS, useSearch } from "@/lib/search-params";

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

beforeEach(() => {
  navigation.params = new URLSearchParams();
  navigation.push.mockClear();
});

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

async function settle(ms: number): Promise<void> {
  await act(async () => {
    await new Promise((done) => setTimeout(done, ms));
  });
}

async function type(input: HTMLInputElement, text: string): Promise<void> {
  const setValue = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )!.set!;

  await act(async () => {
    setValue.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function option(label: string): HTMLElement {
  const item = Array.from(
    document.querySelectorAll<HTMLElement>('[role="option"]'),
  ).find((node) => node.textContent?.includes(label));

  if (!item) throw new Error(`sem a opção "${label}"`);

  return item;
}

/** Whether the option's box is drawn ticked. */
const isTicked = (label: string) =>
  option(label).querySelector("div")!.className.includes("bg-primary");

function filterButton(host: HTMLElement): HTMLButtonElement {
  const toolbar = host.querySelector("[data-tutorial=probe-filters]");
  const button = Array.from(
    toolbar?.querySelectorAll<HTMLButtonElement>("button") ?? [],
  ).find((node) => node.textContent?.startsWith("Status"));

  if (!button) throw new Error("sem o filtro Status");

  return button;
}

type Delivery = { id: string; recipient: string; status: string };

const ROWS: Delivery[] = [
  { id: "delivery-ana", recipient: "Ana", status: "PENDING" },
  { id: "delivery-bruno", recipient: "Bruno", status: "DELIVERED" },
];

const COLUMNS: ColumnDef<Delivery, unknown>[] = [
  { accessorKey: "recipient", header: "Destinatário" },
  { accessorKey: "status", header: "Status" },
];

const SERVER = {
  sortable: [],
  facets: {
    status: {
      param: "status",
      values: ["PENDING", "IN_TRANSIT", "DELIVERED"],
    },
  },
};

/** The page's toolbar: the search box and the server filters, side by side. */
function Toolbar({ table }: { table?: Table<Delivery> }) {
  const { handleSearch } = useSearch();

  return createElement(
    "div",
    null,
    createElement("input", { "aria-label": "Buscar", onChange: handleSearch }),
    createElement(DataTableServerFilters<Delivery>, {
      table,
      dataTutorial: "probe-filters",
      filters: [
        {
          columnId: "status",
          title: "Status",
          options: [
            { value: "PENDING", label: "Pendente", count: 4 },
            { value: "IN_TRANSIT", label: "Em trânsito", count: 2 },
            { value: "DELIVERED", label: "Entregue", count: 9 },
          ],
        },
      ],
    }),
  );
}

const list = () =>
  createElement(DataTable<Delivery, unknown>, {
    columns: COLUMNS,
    data: ROWS,
    meta: { total: 15, page: 1, pageSize: 10 },
    responseError: { error: false, errorMessage: "" },
    server: SERVER,
    toolbar: createElement(Toolbar),
  });

describe("two filters ticked before the server answers", () => {
  it("shows both ticked at once and sends both, in one request", async () => {
    navigation.params = new URLSearchParams("page=3");

    const host = await mount(list());

    await click(filterButton(host));
    await click(option("Pendente"));
    await click(option("Em trânsito"));

    // Optimistic: both boxes are ticked while the URL has not moved.
    expect(isTicked("Pendente")).toBe(true);
    expect(isTicked("Em trânsito")).toBe(true);
    expect(isTicked("Entregue")).toBe(false);

    // The old rows stay on screen, marked busy, instead of a skeleton.
    expect(host.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(host.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(host.querySelector('[role="status"]')?.textContent).toBe(
      "Atualizando resultados…",
    );

    await settle(LIST_QUERY_DEBOUNCE_MS + 50);

    expect(navigation.push).toHaveBeenCalledTimes(1);
    expect(navigation.push).toHaveBeenCalledWith(
      "?status=PENDING%2CIN_TRANSIT",
      { scroll: false },
    );
  });

  it("goes out as soon as the popover closes", async () => {
    const host = await mount(list());

    await click(filterButton(host));
    await click(option("Entregue"));

    expect(navigation.push).not.toHaveBeenCalled();

    // Closing the popover (its trigger again) means "done".
    await click(filterButton(host));

    expect(navigation.push).toHaveBeenCalledTimes(1);
    expect(navigation.push).toHaveBeenCalledWith("?status=DELIVERED", {
      scroll: false,
    });

    await settle(LIST_QUERY_DEBOUNCE_MS + 50);

    expect(navigation.push).toHaveBeenCalledTimes(1);
  });

  it("asks nothing when a tick is undone before the pause ends", async () => {
    const host = await mount(list());

    await click(filterButton(host));
    await click(option("Pendente"));
    await click(option("Pendente"));
    await settle(LIST_QUERY_DEBOUNCE_MS + 50);

    expect(navigation.push).not.toHaveBeenCalled();
    expect(host.querySelector('[aria-busy="true"]')).toBeNull();
  });
});

describe("a term typed just before a filter is ticked", () => {
  it("keeps both: one request with the search and the filter", async () => {
    const host = await mount(list());

    await type(host.querySelector<HTMLInputElement>("input")!, "ana");
    await click(filterButton(host));
    await click(option("Pendente"));

    expect(navigation.push).not.toHaveBeenCalled();

    await settle(LIST_QUERY_DEBOUNCE_MS + 50);

    expect(navigation.push).toHaveBeenCalledTimes(1);
    expect(navigation.push).toHaveBeenCalledWith("?search=ana&status=PENDING", {
      scroll: false,
    });
  });
});

describe("Resetar", () => {
  it("clears every filter in a single request, sent at once", async () => {
    navigation.params = new URLSearchParams("status=PENDING%2CDELIVERED");

    const host = await mount(list());

    const reset = Array.from(host.querySelectorAll("button")).find((node) =>
      node.textContent?.includes("Resetar"),
    );

    await click(reset!);

    expect(navigation.push).toHaveBeenCalledTimes(1);
    expect(navigation.push).toHaveBeenCalledWith("?", { scroll: false });
  });
});
