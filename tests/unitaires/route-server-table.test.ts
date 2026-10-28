import * as React from "react";
import { act, createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The routes board on the server-side table contract (decision 8.8).
 *
 * The toolbar's Status, Motorista and Veículo chips used to filter the ten
 * rows already loaded, and their options were whatever those rows held,
 * while the pager counted the whole company. Now every sort and filter is a
 * new URL the page forwards to the API, and the options and counts are the
 * server's.
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
  usePathname: () => "/dashboard/routes",
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// The row menu opens dialogs backed by server actions; the table around it
// is what is proven here.
vi.mock("@/features/routes/row-actions", () => ({
  RouteRowActions: () => null,
}));

import { RoutesTable } from "@/features/routes/table";
import { LIST_QUERY_DEBOUNCE_MS } from "@/lib/search-params";
import { routesListQuery } from "@/features/routes/server-table";

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

/** A filter tick waits this long for the next one before it goes out. */
async function afterFilterPause(): Promise<void> {
  await act(async () => {
    await new Promise((done) => setTimeout(done, LIST_QUERY_DEBOUNCE_MS + 50));
  });
}

async function pressEnter(element: Element): Promise<void> {
  await act(async () => {
    element.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
  });
}

function option(label: string): Element {
  const item = Array.from(document.querySelectorAll('[role="option"]')).find(
    (node) => node.textContent?.includes(label),
  );

  if (!item) throw new Error(`sem a opção "${label}"`);

  return item;
}

function optionLabels(): string[] {
  return Array.from(document.querySelectorAll('[role="option"]')).map(
    (node) => node.textContent ?? "",
  );
}

function menuItem(label: string): Element {
  const item = Array.from(document.querySelectorAll('[role="menuitem"]')).find(
    (node) => node.textContent?.trim() === label,
  );

  if (!item) throw new Error(`sem o item "${label}"`);

  return item;
}

function filterButton(host: HTMLElement, title: string): HTMLButtonElement {
  const toolbar = host.querySelector('[data-tutorial="routes-filters"]');
  const button = Array.from(toolbar?.querySelectorAll("button") ?? []).find(
    (node) => node.textContent?.startsWith(title),
  );

  if (!button) throw new Error(`sem o filtro "${title}"`);

  return button as HTMLButtonElement;
}

function headerButton(
  host: HTMLElement,
  title: string,
): HTMLButtonElement | null {
  return (
    (Array.from(host.querySelectorAll("thead button")).find(
      (node) => node.textContent?.trim() === title,
    ) as HTMLButtonElement | undefined) ?? null
  );
}

const ANA = "018fe200-0000-7000-8000-0000000000d1";
const BRUNO = "018fe200-0000-7000-8000-0000000000d2";
const ONLY_ON_PAGE = "018fe200-0000-7000-8000-0000000000d7";
const TRUCK = "018fe200-0000-7000-8000-0000000000e1";

function route(code: number, driverId: string, driverName: string) {
  return {
    id: `018fe200-0000-7000-8000-${String(code).padStart(12, "0")}`,
    code,
    name: null,
    status: "PLANNED",
    scheduled_date: "2026-09-17T00:00:00.000Z",
    destination: null,
    planned_departure_at: null,
    planned_arrival_at: null,
    started_at: null,
    completed_at: null,
    cancellation_reason: null,
    driverId,
    vehicleId: null,
    driver: { id: driverId, name: driverName },
    vehicle: null,
    stops: [],
    created_at: "2026-09-16T12:00:00.000Z",
    updated_at: "2026-09-16T12:00:00.000Z",
  };
}

// Both rows on screen are PLANNED and one belongs to a driver the server
// does not list: a page-side filter would offer exactly that.
const rows = [
  route(2, ANA, "Ana"),
  route(1, ONLY_ON_PAGE, "Somente nesta página"),
];

const searchMeta = {
  statusCounts: {
    PLANNED: 4,
    RELEASED: 2,
    IN_PROGRESS: 5,
    COMPLETED: 3,
    CANCELLED: 1,
  },
  facets: {
    status: [
      { value: "PLANNED", count: 4 },
      { value: "RELEASED", count: 2 },
      { value: "IN_PROGRESS", count: 5 },
      { value: "COMPLETED", count: 3 },
      { value: "CANCELLED", count: 1 },
    ],
    driverId: [
      { value: ANA, label: "Ana", count: 6 },
      { value: BRUNO, label: "Bruno", count: 9 },
    ],
    vehicleId: [{ value: TRUCK, label: "AAA1A11", count: 5 }],
  },
};

async function mountBoard(): Promise<HTMLElement> {
  return mount(
    createElement(RoutesTable, {
      data: rows,
      meta: { total: 15, page: 1, pageSize: 10 },
      responseError: { error: false, errorMessage: "" },
      searchMeta,
    }),
  );
}

describe("the routes board filters on the server", () => {
  it("counts the Status options on the server, not on the page", async () => {
    const host = await mountBoard();

    await click(filterButton(host, "Status"));

    // Red before: the page holds only PLANNED rows, so "Em andamento" had no
    // count and "Planejada" said 2.
    expect(option("Em andamento").textContent).toContain("5");
    expect(option("Planejada").textContent).toContain("4");
  });

  it("lists the drivers the server names, not the ones on the page", async () => {
    const host = await mountBoard();

    await click(filterButton(host, "Motorista"));

    expect(optionLabels().some((label) => label.includes("Bruno"))).toBe(true);
    expect(
      optionLabels().some((label) => label.includes("Somente nesta página")),
    ).toBe(false);
  });

  it("turns a driver choice into the API's driverId, back on page one", async () => {
    navigation.params = new URLSearchParams("page=3&search=zona");

    const host = await mountBoard();

    await click(filterButton(host, "Motorista"));
    await click(option("Bruno"));
    await afterFilterPause();

    expect(navigation.push).toHaveBeenCalledWith(
      `?search=zona&driverId=${BRUNO}`,
      {
        scroll: false,
      },
    );
  });

  it("offers the vehicle filter with the server's plates", async () => {
    const host = await mountBoard();

    await click(filterButton(host, "Veículo"));
    await click(option("AAA1A11"));
    await afterFilterPause();

    expect(navigation.push).toHaveBeenCalledWith(`?vehicleId=${TRUCK}`, {
      scroll: false,
    });
  });

  it("keeps every row the server sent: it already filtered", async () => {
    navigation.params = new URLSearchParams(`driverId=${BRUNO}`);

    const host = await mountBoard();

    expect(host.querySelectorAll("tbody tr")).toHaveLength(2);
  });
});

describe("the routes board sorts on the server", () => {
  it("sorts by driver through the URL and leaves derived columns unsortable", async () => {
    navigation.params = new URLSearchParams("page=2");

    const host = await mountBoard();

    // Red before: no column of the board was sortable at all.
    await pressEnter(headerButton(host, "Motorista")!);
    await click(menuItem("Decrescente"));

    expect(navigation.push).toHaveBeenCalledWith(
      "?sort=driverName&order=desc",
      {
        scroll: false,
      },
    );

    // "Paradas" and "Previsto" are computed from several fields: no order.
    expect(headerButton(host, "Paradas")).toBeNull();
    expect(headerButton(host, "Previsto")).toBeNull();
  });

  it("forwards only the declared sort and facets to the API", () => {
    expect(
      routesListQuery({
        sort: "vehiclePlate",
        order: "desc",
        status: "IN_PROGRESS,DRAFT",
        driverId: [ANA, "abc"],
        vehicleId: TRUCK,
        tab: "ignored",
      }),
    ).toEqual({
      sort: "vehiclePlate",
      order: "desc",
      status: "IN_PROGRESS",
      driverId: ANA,
      vehicleId: TRUCK,
    });

    // A column the API cannot order by never reaches it.
    expect(routesListQuery({ sort: "progress" })).toEqual({});
  });
});
