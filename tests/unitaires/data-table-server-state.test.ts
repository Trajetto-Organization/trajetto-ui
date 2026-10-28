import * as React from "react";
import { act, createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ColumnDef, Table } from "@tanstack/react-table";

/**
 * The DataTable's sort and filters answered by the server (decision 8.8,
 * CRIT-10, DLV-OCC-1).
 *
 * Every DataTable here is paged by the API, so sorting or filtering in the
 * browser worked on the ten loaded rows while the pager still counted the
 * whole company. A table either declares what the server can do — and then
 * sorting and filtering become a new URL, which the page turns into a new API
 * request — or its columns do not sort at all.
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

// The row menu opens the delivery detail (server actions, react-query); what
// is proven here is the table around it.
vi.mock("@/features/deliveries/occurrences/row-actions", () => ({
  OccurrenceRowActions: () => null,
}));

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";
import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";

import { OccurrencesTable } from "@/features/deliveries/occurrences/table";
import { buildOccurrenceColumns } from "@/features/deliveries/occurrences/table-columns";
import type { OccurrenceRow } from "@/features/deliveries/lib/panels";

import { formatNotificationDate } from "@/lib/format-values";
import { LIST_QUERY_DEBOUNCE_MS } from "@/lib/search-params";

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

/** Renders again into the same root: the DataTable stays mounted, as in Next. */
async function rerender(element: ReactElement): Promise<void> {
  await act(async () => {
    root!.render(element);
  });
}

async function pressEnter(element: Element): Promise<void> {
  await act(async () => {
    element.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
  });
}

async function click(element: Element): Promise<void> {
  await act(async () => {
    (element as HTMLElement).click();
  });
}

/** Lets the list's filter pause (LIST_QUERY_DEBOUNCE_MS) run out. */
async function settle(ms: number): Promise<void> {
  await act(async () => {
    await new Promise((done) => setTimeout(done, ms));
  });
}

function menuItem(label: string): Element {
  const item = Array.from(document.querySelectorAll('[role="menuitem"]')).find(
    (node) => node.textContent?.trim() === label,
  );

  if (!item) throw new Error(`sem o item "${label}"`);

  return item;
}

function option(label: string): Element {
  const item = Array.from(document.querySelectorAll('[role="option"]')).find(
    (node) => node.textContent?.includes(label),
  );

  if (!item) throw new Error(`sem a opção "${label}"`);

  return item;
}

/** The toolbar's filter trigger, not the column header of the same name. */
function filterButton(host: HTMLElement, title: string): HTMLButtonElement {
  const toolbar = host.querySelector('[data-tutorial="deliveries-filters"]');
  const button = Array.from(toolbar?.querySelectorAll("button") ?? []).find(
    (node) => node.textContent?.startsWith(title),
  );

  if (!button) throw new Error(`sem o filtro "${title}"`);

  return button as HTMLButtonElement;
}

function buttonNamed(host: HTMLElement, text: string): HTMLButtonElement {
  const button = Array.from(host.querySelectorAll("button")).find((node) =>
    node.textContent?.includes(text),
  );

  if (!button) throw new Error(`sem o botão "${text}"`);

  return button as HTMLButtonElement;
}

function headerButton(host: HTMLElement, title: string): HTMLButtonElement {
  const button = Array.from(host.querySelectorAll("thead button")).find(
    (node) => node.textContent?.trim() === title,
  );

  if (!button) throw new Error(`sem o cabeçalho ordenável "${title}"`);

  return button as HTMLButtonElement;
}

interface Person {
  name: string;
  city: string;
}

const PEOPLE: Person[] = [
  { name: "Bruno", city: "Recife" },
  { name: "Ana", city: "Natal" },
];

const PEOPLE_COLUMNS: ColumnDef<Person>[] = [
  {
    accessorKey: "name",
    header: ({ column }) =>
      createElement(DataTableColumnHeader, {
        column: column as never,
        title: "Nome",
      }),
  },
  {
    accessorKey: "city",
    header: ({ column }) =>
      createElement(DataTableColumnHeader, {
        column: column as never,
        title: "Cidade",
      }),
  },
];

const META = { total: 40, page: 1, pageSize: 2 };
const NO_ERROR = { error: false, errorMessage: "" };

const renderedNames = (host: HTMLElement) =>
  Array.from(host.querySelectorAll("tbody tr")).map(
    (row) => row.querySelector("td")?.textContent,
  );

describe("a table the server does not sort", () => {
  it("offers no sorting at all — sorting ten of forty rows is not sorting", async () => {
    const host = await mount(
      createElement(DataTable<Person, unknown>, {
        columns: PEOPLE_COLUMNS,
        data: PEOPLE,
        meta: META,
        responseError: NO_ERROR,
      }),
    );

    const header = host.querySelector("thead");

    expect(header?.querySelectorAll("button")).toHaveLength(0);
    expect(header?.textContent).toContain("Nome");
  });
});

describe("a table the server sorts", () => {
  const server = {
    sortable: ["name"],
    defaultSort: { id: "name", desc: false },
    facets: {},
  };

  it("makes sortable only the columns the API orders by", async () => {
    const host = await mount(
      createElement(DataTable<Person, unknown>, {
        columns: PEOPLE_COLUMNS,
        data: PEOPLE,
        meta: META,
        responseError: NO_ERROR,
        server,
      }),
    );

    const headers = Array.from(host.querySelectorAll("th"));

    expect(headers[0].querySelector("button")).not.toBeNull();
    expect(headers[1].querySelector("button")).toBeNull();
    expect(headers[0].getAttribute("aria-sort")).toBe("ascending");
  });

  it("turns a sort into a new URL, i.e. a new request to the API", async () => {
    navigation.params = new URLSearchParams("tab=occurrences&page=3");

    const host = await mount(
      createElement(DataTable<Person, unknown>, {
        columns: PEOPLE_COLUMNS,
        data: PEOPLE,
        meta: META,
        responseError: NO_ERROR,
        server,
      }),
    );

    await pressEnter(headerButton(host, "Nome"));
    await click(menuItem("Decrescente"));

    expect(navigation.push).toHaveBeenCalledWith(
      "?tab=occurrences&sort=name&order=desc",
      { scroll: false },
    );
  });

  it("shows the rows in the server's order, never re-sorted in the browser", async () => {
    navigation.params = new URLSearchParams("sort=name&order=asc");

    const host = await mount(
      createElement(DataTable<Person, unknown>, {
        columns: PEOPLE_COLUMNS,
        data: PEOPLE,
        meta: META,
        responseError: NO_ERROR,
        server,
      }),
    );

    expect(renderedNames(host)).toEqual(["Bruno", "Ana"]);
  });
});

const TYPE_RECUSA = "018f0000-0000-7000-8000-0000000000e2";
const TYPE_AVARIA = "018f0000-0000-7000-8000-0000000000e3";

function occurrence(
  recipient: string,
  typeName: string,
  blocks: boolean,
): OccurrenceRow {
  return {
    id: `occ-${recipient}`,
    description: null,
    latitude: null,
    longitude: null,
    photos: [],
    created_at: "2026-09-28T12:00:00.000Z",
    occurred_at: null,
    occurrenceType: {
      id: `type-${typeName}`,
      name: typeName,
      blocks_delivery: blocks,
      requires_photo: false,
    },
    reportedBy: { id: "user", name: "Relator" },
    delivery: {
      id: `delivery-${recipient}`,
      recipient_name: recipient,
      status: "IN_TRANSIT",
      city: "São Paulo",
      uf: "SP",
      code: null,
    },
  };
}

describe("the occurrence feed (pilot)", () => {
  const rows = [
    occurrence("Carla", "Destinatário ausente", false),
    occurrence("Ana", "Somente nesta página", false),
  ];

  const searchMeta = {
    total: 12,
    blocking: 7,
    informational: 5,
    facets: {
      severity: [
        { value: "blocking", count: 7 },
        { value: "informational", count: 5 },
      ],
      occurrenceTypeId: [
        { value: TYPE_AVARIA, label: "Avaria", count: 3 },
        { value: TYPE_RECUSA, label: "Recusa", count: 4 },
      ],
    },
  };

  async function mountFeed() {
    return mount(
      createElement(OccurrencesTable, {
        data: rows,
        meta: { total: 12, page: 1, pageSize: 10 },
        responseError: NO_ERROR,
        searchMeta,
      }),
    );
  }

  it("counts the Gravidade options on the server, not on the page", async () => {
    const host = await mountFeed();

    await click(filterButton(host, "Gravidade"));

    // Both rows on screen are informational; the server says 7 blocking.
    expect(option("Impeditiva").textContent).toContain("7");
    expect(option("Informativa").textContent).toContain("5");
  });

  it("lists the Tipo options the server sends, not the types on the page", async () => {
    const host = await mountFeed();

    await click(filterButton(host, "Tipo"));

    const labels = Array.from(document.querySelectorAll('[role="option"]')).map(
      (node) => node.textContent,
    );

    expect(labels.some((label) => label?.includes("Recusa"))).toBe(true);
    expect(
      labels.some((label) => label?.includes("Somente nesta página")),
    ).toBe(false);
  });

  it("turns a filter into the API's param, back on page one", async () => {
    navigation.params = new URLSearchParams("tab=occurrences&page=2");

    const host = await mountFeed();

    await click(filterButton(host, "Gravidade"));
    await click(option("Impeditiva"));

    // A tick waits a moment for the next one, then goes out alone.
    expect(navigation.push).not.toHaveBeenCalled();

    await settle(LIST_QUERY_DEBOUNCE_MS + 50);

    expect(navigation.push).toHaveBeenCalledTimes(1);
    expect(navigation.push).toHaveBeenCalledWith(
      "?tab=occurrences&severity=blocking",
      { scroll: false },
    );
  });

  it("keeps rows the URL filter would exclude: the server already filtered", async () => {
    navigation.params = new URLSearchParams("severity=blocking");

    const host = await mountFeed();

    expect(host.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(buttonNamed(host, "Resetar")).toBeDefined();
  });

  it("shows in the sortable date column the instant the server sorts by", async () => {
    // The API orders this column by created_at. Bruno's report was written
    // offline three days before it arrived, so it is the newest by arrival
    // and the oldest by occurred_at: the column must read in arrival order.
    const offline: OccurrenceRow = {
      ...occurrence("Bruno", "Recusa", true),
      created_at: "2026-09-28T13:00:00.000Z",
      occurred_at: "2026-09-25T10:05:00.000Z",
    };
    // The app dates every report by the tap, online too. Carla's tap came
    // 30 s before the arrival (GPS fix and photo upload) and the two fall in
    // different minutes: an ordinary send, no second line and no claim that
    // it was sent without signal.
    const online: OccurrenceRow = {
      ...occurrence("Carla", "Destinatário ausente", false),
      created_at: "2026-09-28T12:00:10.000Z",
      occurred_at: "2026-09-28T11:59:40.000Z",
    };

    navigation.params = new URLSearchParams("sort=created_at&order=desc");

    const host = await mount(
      createElement(OccurrencesTable, {
        data: [offline, online],
        meta: { total: 2, page: 1, pageSize: 10 },
        responseError: NO_ERROR,
        searchMeta,
      }),
    );

    const dateColumn = buildOccurrenceColumns().findIndex(
      (column) =>
        (column as { accessorKey?: string }).accessorKey === "created_at",
    );

    const cells = Array.from(host.querySelectorAll("tbody tr")).map(
      (row) => row.querySelectorAll("td")[dateColumn],
    );

    // The first line of each cell is the sort key, in the server's order.
    expect(cells.map((cell) => cell.querySelector("p")?.textContent)).toEqual([
      formatNotificationDate(offline.created_at, "pt-BR"),
      formatNotificationDate(online.created_at, "pt-BR"),
    ]);

    // When the delayed one happened is still on screen, as a second line.
    const happened = cells[0].querySelectorAll("p")[1];

    expect(happened?.textContent).toBe(
      `Ocorreu em ${formatNotificationDate(offline.occurred_at!, "pt-BR")}`,
    );
    expect(happened?.getAttribute("title")).toBe(
      "Hora registrada no aparelho; a ocorrência chegou depois.",
    );

    // Precondition: at minute precision the online row's two instants differ.
    expect(formatNotificationDate(online.occurred_at!, "pt-BR")).not.toBe(
      formatNotificationDate(online.created_at, "pt-BR"),
    );
    expect(cells[1].querySelectorAll("p")).toHaveLength(1);

    const header = host.querySelectorAll("thead th")[dateColumn];

    expect(header.textContent).toBe("Recebida em");
    expect(header.getAttribute("aria-sort")).toBe("descending");
  });

  // Decision 14.3: every proof is a DELIVERED row of this feed. It must
  // read as a delivery, never as an "Informativa" problem.
  it("shows a proof as Entrega, without a severity", async () => {
    const proof: OccurrenceRow = {
      ...occurrence("Diana", "Entrega normal", false),
      id: "proof-1",
      category: "DELIVERED",
    };

    const host = await mount(
      createElement(OccurrencesTable, {
        data: [proof],
        meta: { total: 1, page: 1, pageSize: 10 },
        responseError: NO_ERROR,
        searchMeta,
      }),
    );

    const columns = buildOccurrenceColumns();
    const cellOf = (id: string) =>
      host.querySelectorAll("tbody tr td")[
        columns.findIndex((column) => column.id === id)
      ];

    expect(cellOf("category").textContent).toBe("Entrega");
    expect(cellOf("blocking").textContent).not.toContain("Informativa");
  });

  it("sorts the feed by type through the URL", async () => {
    const host = await mountFeed();

    await pressEnter(headerButton(host, "Tipo"));
    await click(menuItem("Crescente"));

    expect(navigation.push).toHaveBeenCalledWith("?sort=typeName&order=asc", {
      scroll: false,
    });
  });
});

interface Assignable {
  id?: string;
  name: string;
  status: "PENDING" | "ASSIGNED";
}

describe("the row selection across server queries", () => {
  // A sort, a filter, a page or a revalidation brings a new array while the
  // DataTable stays mounted (Next keys the segment without search params).
  // The selection must stay on the records the user checked, or the batch
  // "Atribuir motorista" goes to deliveries nobody checked.
  const server = {
    sortable: ["name"],
    defaultSort: { id: "name", desc: false },
    facets: { status: { param: "status", values: ["PENDING", "ASSIGNED"] } },
  };

  const ANA: Assignable = {
    id: "delivery-ana",
    name: "Ana",
    status: "PENDING",
  };
  const BRUNO: Assignable = {
    id: "delivery-bruno",
    name: "Bruno",
    status: "PENDING",
  };
  const CARLA: Assignable = {
    id: "delivery-carla",
    name: "Carla",
    status: "ASSIGNED",
  };

  const columns: ColumnDef<Assignable>[] = [
    { accessorKey: "name", header: "Nome" },
  ];

  let table: Table<Assignable> | null = null;
  let batch: Assignable[] = [];

  // The toolbar slot receives the table instance; the bulk actions receive
  // the checked rows, like "Adicionar à rota" on the deliveries tab.
  function TableProbe(props: { table?: Table<Assignable> }) {
    table = props.table ?? null;

    return null;
  }

  const element = (data: Assignable[]) =>
    createElement(DataTable<Assignable, unknown>, {
      columns,
      data,
      meta: { total: 30, page: 1, pageSize: 10 },
      responseError: NO_ERROR,
      server,
      toolbar: createElement(TableProbe),
      bulkActions: {
        render: ({ rows }) => {
          batch = rows;

          return null;
        },
      },
    });

  const selected = () =>
    table!.getSelectedRowModel().rows.map((row) => row.original.name);

  const checkedOnScreen = (host: HTMLElement) =>
    Array.from(host.querySelectorAll('tbody tr[data-state="selected"]')).map(
      (row) => row.querySelectorAll("td")[1]?.textContent,
    );

  const check = (host: HTMLElement, name: string) => {
    const row = Array.from(host.querySelectorAll("tbody tr")).find(
      (candidate) => candidate.textContent?.includes(name),
    );

    return click(row!.querySelector('[role="checkbox"]')!);
  };

  it("keeps the checked delivery checked when the server reorders the page", async () => {
    const host = await mount(element([ANA, BRUNO]));

    await check(host, "Ana");

    // "Decrescente": a new URL, and the server answers Bruno first.
    navigation.params = new URLSearchParams("sort=name&order=desc");
    await rerender(element([BRUNO, ANA]));

    expect(selected()).toEqual(["Ana"]);
    expect(checkedOnScreen(host)).toEqual(["Ana"]);
    expect(batch.map((row) => row.name)).toEqual(["Ana"]);
  });

  it("drops a checked delivery the new filter leaves out, and checks no other", async () => {
    const host = await mount(element([ANA, BRUNO]));

    await check(host, "Ana");

    navigation.params = new URLSearchParams("status=ASSIGNED");
    await rerender(element([CARLA, BRUNO]));

    expect(selected()).toEqual([]);
    expect(checkedOnScreen(host)).toEqual([]);
    expect(batch).toEqual([]);
    // Nothing out of sight stays selected (the header's "some selected").
    expect(table!.getState().rowSelection).toEqual({});
    expect(table!.getIsSomeRowsSelected()).toBe(false);

    // Clearing the filter brings Ana back unchecked: she left the selection.
    navigation.params = new URLSearchParams();
    await rerender(element([ANA, BRUNO]));

    expect(selected()).toEqual([]);
  });

  it("keeps the checked record through a revalidation that reorders it", async () => {
    const host = await mount(element([ANA, BRUNO]));

    await check(host, "Ana");

    // Same URL, fresh rows (another dispatcher acted): Ana is now second.
    await rerender(element([{ ...BRUNO }, { ...ANA, status: "ASSIGNED" }]));

    expect(selected()).toEqual(["Ana"]);
    expect(checkedOnScreen(host)).toEqual(["Ana"]);
  });

  it("clears a selection by position when the rows carry no id", async () => {
    const withoutId = (row: Assignable): Assignable => ({
      name: row.name,
      status: row.status,
    });

    const host = await mount(element([withoutId(ANA), withoutId(BRUNO)]));

    await check(host, "Ana");

    navigation.params = new URLSearchParams("sort=name&order=desc");
    await rerender(element([withoutId(CARLA), withoutId(BRUNO)]));

    expect(selected()).toEqual([]);
    expect(checkedOnScreen(host)).toEqual([]);
  });
});
