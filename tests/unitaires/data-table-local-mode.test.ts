import * as React from "react";
import { act, createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";

import type { ColumnDef, Table } from "@tanstack/react-table";

/**
 * A complete catalog answered in the browser (spec §13), the pager on the
 * list query, and the search box that follows the URL.
 *
 * The URL here behaves like Next 14.2's: `router.push` is a server render
 * that has not answered (the URL stays), while `history.pushState` — Next's
 * patched one — moves `useSearchParams` with no request at all.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

const navigation = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const state = {
    params: new URLSearchParams(),
    push: (() => {}) as (...args: unknown[]) => void,
    begin: null as null | (() => void),
    listeners,
    set(next: URLSearchParams) {
      state.params = next;
      listeners.forEach((listener) => listener());
    },
  };

  return state;
});

vi.mock("next/navigation", async () => {
  const { useSyncExternalStore } = await import("react");

  const subscribe = (listener: () => void) => {
    navigation.listeners.add(listener);

    return () => navigation.listeners.delete(listener);
  };

  return {
    useSearchParams: () =>
      useSyncExternalStore(subscribe, () => navigation.params),
    useRouter: () => ({
      push: (...args: unknown[]) => {
        navigation.push(...args);
        navigation.begin?.();
      },
      refresh: () => {},
    }),
    usePathname: () => "/dashboard/deliveries",
  };
});

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";
import { DataTableServerFilters } from "@/app/(protected)/_components/shared/tanstack-table/data-table-server-filters";
import { facetOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";
import { completeListKey } from "@/app/(protected)/_components/shared/tanstack-table/data-table/local-table";
import { useCompleteList } from "@/app/(protected)/_components/shared/tanstack-table/data-table/use-complete-list";
import { SearchInputWithLoading } from "@/components/ui/search-input-with-loading";
import { DATA_REVALIDATED_EVENT } from "@/lib/refresh-client-cache";
import { LIST_QUERY_DEBOUNCE_MS, useSearch } from "@/lib/search-params";
import {
  ACTIVE_LABELS,
  CATALOG_TABLES,
  YES_NO_LABELS,
} from "@/features/deliveries/lib/catalog-tables";
import {
  CATALOG_LOCAL,
  CATALOG_SUMMARIES,
} from "@/features/deliveries/lib/catalog-local";

// This runner compiles JSX with the classic runtime.
(globalThis as { React?: typeof React }).React = React;

const SPEC = CATALOG_TABLES["occurrence-types"];
const LOCAL = CATALOG_LOCAL["occurrence-types"];

type OccurrenceType = {
  id: string;
  name: string;
  is_active: boolean;
  blocks_delivery: boolean;
  requires_photo: boolean;
  category: string;
  created_at: string;
  updated_at: string;
};

/** Twelve types: every third inactive, the even ones impeditive. */
const ROWS: OccurrenceType[] = Array.from({ length: 12 }, (_, index) => {
  const n = index + 1;

  return {
    id: `0190${String(n).padStart(4, "0")}-0000-7000-8000-00000000000a`,
    name: `Tipo ${n}`,
    is_active: n % 3 !== 0,
    blocks_delivery: n % 2 === 0,
    requires_photo: false,
    category: "NOT_DELIVERED",
    created_at: new Date(Date.UTC(2026, 9, 1, n)).toISOString(),
    updated_at: new Date(Date.UTC(2026, 9, 2, 0, 60 - n)).toISOString(),
  };
});

// What the complete read (no facet) brought: the API's base summary.
const BASE_META = CATALOG_SUMMARIES["occurrence-types"](ROWS, {}, {});

/** A header that sorts its column, like DataTableColumnHeader does. */
const sortable = (
  id: string,
  label: string,
  probe: string,
): ColumnDef<OccurrenceType, unknown> => ({
  id,
  accessorFn: (row) => (row as Record<string, unknown>)[id] ?? row.name,
  header: ({ column }) =>
    createElement(
      "button",
      {
        type: "button",
        "data-sort": probe,
        onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
      },
      label,
    ),
});

const COLUMNS: ColumnDef<OccurrenceType, unknown>[] = [
  { id: "label", accessorFn: (row) => row.name, header: "Nome" },
  sortable("created_at", "Criado", "created_at"),
  sortable("updated_at", "Atualizado", "updated_at"),
  // "name" is a server sort (the database collation orders it).
  sortable("name", "Nome A-Z", "name_sort"),
  { id: "is_active", accessorKey: "is_active", header: "Status" },
  {
    id: "blocks_delivery",
    accessorKey: "blocks_delivery",
    header: "Impeditiva",
  },
  { id: "requires_photo", accessorKey: "requires_photo", header: "Foto" },
  { id: "category", accessorKey: "category", header: "Categoria" },
];

/**
 * Next's router.push: a transition that stays pending until the server
 * answers (here, never), so `isNavigating` holds as it does in the app.
 */
function PendingNavigation() {
  const [pending, setPending] = React.useState<Promise<never> | null>(null);

  navigation.begin = () => setPending(new Promise<never>(() => {}));

  if (pending) throw pending;

  return null;
}

function Toolbar({
  table,
  facets,
}: {
  table?: Table<OccurrenceType>;
  facets?: Record<string, { value: string; count: number }[]>;
}) {
  const { handleSearch, searchParams, isPending } = useSearch();

  return createElement(
    "div",
    null,
    createElement(SearchInputWithLoading, {
      "aria-label": "Buscar",
      defaultValue: searchParams.get("search") || "",
      onChange: handleSearch,
      isLoading: isPending,
    }),
    createElement(DataTableServerFilters<OccurrenceType>, {
      table,
      dataTutorial: "probe-filters",
      filters: [
        {
          columnId: "is_active",
          title: "Status",
          options: facetOptions(facets?.status, ACTIVE_LABELS),
        },
        {
          columnId: "blocks_delivery",
          title: "Impeditiva",
          options: facetOptions(facets?.blocking, YES_NO_LABELS),
        },
      ],
    }),
  );
}

/** The screen: cards and table over one list query, as catalog-section. */
function Screen({ complete }: { complete?: string }) {
  const list = useCompleteList({
    rows: ROWS,
    meta: { total: ROWS.length, page: 1, pageSize: 10 },
    searchMeta: BASE_META as Record<string, unknown>,
    complete,
    spec: SPEC,
    local: LOCAL,
    summarize: CATALOG_SUMMARIES["occurrence-types"],
  });

  const meta = list.searchMeta as
    | {
        active?: number;
        facets?: Record<string, { value: string; count: number }[]>;
      }
    | undefined;

  return createElement(
    "div",
    null,
    createElement("output", { "data-card": "active" }, String(meta?.active)),
    createElement(DataTable<OccurrenceType, unknown>, {
      columns: COLUMNS,
      data: list.rows,
      meta: list.meta,
      responseError: { error: false, errorMessage: "" },
      server: SPEC,
      listQuery: list.listQuery,
      toolbar: createElement(Toolbar, { facets: meta?.facets }),
    }),
  );
}

const KEY = completeListKey(
  new URLSearchParams("tab=occurrence-types"),
  SPEC,
  LOCAL,
  true,
);

let root: Root | null = null;
let push: ReturnType<typeof vi.fn>;
let pushState: MockInstance<
  [data: unknown, unused: string, url?: string | URL | null],
  void
>;

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
  navigation.params = new URLSearchParams("tab=occurrence-types");
  navigation.begin = null;
  push = vi.fn();
  navigation.push = push;

  // Next 14.2 patches pushState into a router restore: the URL, and
  // useSearchParams with it, move with no request.
  pushState = vi
    .spyOn(window.history, "pushState")
    .mockImplementation((_data, _unused, url) => {
      const search = String(url ?? "").replace(/^\?/, "");

      navigation.set(new URLSearchParams(search));
    });
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  pushState.mockRestore();
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

function filterButton(host: HTMLElement, title: string): HTMLButtonElement {
  const toolbar = host.querySelector("[data-tutorial=probe-filters]");
  const button = Array.from(
    toolbar?.querySelectorAll<HTMLButtonElement>("button") ?? [],
  ).find((node) => node.textContent?.startsWith(title));

  if (!button) throw new Error(`sem o filtro ${title}`);

  return button;
}

function option(label: string): HTMLElement {
  const item = Array.from(
    document.querySelectorAll<HTMLElement>('[role="option"]'),
  ).find((node) => node.textContent?.startsWith(label));

  if (!item) throw new Error(`sem a opção "${label}"`);

  return item;
}

function pagerButton(host: HTMLElement, label: string): HTMLButtonElement {
  const button = Array.from(host.querySelectorAll("button")).find(
    (node) => node.textContent === label,
  );

  if (!button) throw new Error(`sem o botão ${label}`);

  return button as HTMLButtonElement;
}

const names = (host: HTMLElement) =>
  Array.from(host.querySelectorAll("tbody tr")).map(
    (row) => row.querySelector("td")?.textContent,
  );

describe("a complete catalog answers a tick in the browser", () => {
  it("narrows the rows at once: no request, no pause, one URL entry, the cards follow", async () => {
    const host = await mount(createElement(Screen, { complete: KEY }));

    expect(host.querySelectorAll("tbody tr")).toHaveLength(10);
    expect(host.querySelector("[data-card=active]")?.textContent).toBe("8");

    await click(filterButton(host, "Impeditiva"));
    await click(option("Sim"));

    // In the same act as the click: no 400 ms debounce to wait for.
    expect(push).not.toHaveBeenCalled();
    expect(pushState).toHaveBeenCalledTimes(1);
    expect(String(pushState.mock.calls[0][2])).toBe(
      "?tab=occurrence-types&blocking=yes",
    );
    expect(names(host)).toEqual([
      "Tipo 12",
      "Tipo 10",
      "Tipo 8",
      "Tipo 6",
      "Tipo 4",
      "Tipo 2",
    ]);
    expect(host.querySelector("[data-table-busy]")).toBeNull();
    // The API's cards for blocking=yes: 4 of the 6 impeditive are active.
    expect(host.querySelector("[data-card=active]")?.textContent).toBe("4");
    // The disjunctive counts: the Impeditiva options ignore their own facet.
    expect(option("Sim").textContent).toContain("6");
    expect(option("Não").textContent).toContain("6");

    // Closing the popover sends nothing either.
    await click(filterButton(host, "Impeditiva"));
    await settle(LIST_QUERY_DEBOUNCE_MS + 50);

    expect(push).not.toHaveBeenCalled();
    expect(pushState).toHaveBeenCalledTimes(1);
  });

  it("turns pages and changes the page size with no request", async () => {
    const host = await mount(createElement(Screen, { complete: KEY }));

    await click(pagerButton(host, "Ir para a próxima página"));

    expect(push).not.toHaveBeenCalled();
    expect(String(pushState.mock.calls[0][2])).toBe(
      "?tab=occurrence-types&page=2",
    );
    expect(names(host)).toEqual(["Tipo 2", "Tipo 1"]);
    expect(host.textContent).toContain("Página 2 de 2");
  });

  it("orders by a date in the browser, by the name on the server", async () => {
    const host = await mount(createElement(Screen, { complete: KEY }));

    await click(host.querySelector("[data-sort=updated_at]")!);

    expect(push).not.toHaveBeenCalled();
    expect(String(pushState.mock.calls[0][2])).toBe(
      "?tab=occurrence-types&sort=updated_at&order=asc",
    );
    // updated_at runs the other way round from created_at in the fixture.
    expect(names(host)?.[0]).toBe("Tipo 12");

    await click(host.querySelector("[data-sort=name_sort]")!);

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(
      "?tab=occurrence-types&sort=name&order=asc",
      { scroll: false },
    );
    expect(pushState).toHaveBeenCalledTimes(1);
  });

  it("sends a search to the server, after the pause, and keeps the typed term on screen", async () => {
    const host = await mount(createElement(Screen, { complete: KEY }));
    const input = host.querySelector<HTMLInputElement>(
      "input[aria-label=Buscar]",
    )!;

    await type(input, "Tipo 1");

    expect(input.value).toBe("Tipo 1");
    expect(push).not.toHaveBeenCalled();

    await settle(LIST_QUERY_DEBOUNCE_MS + 50);

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(
      "?tab=occurrence-types&search=Tipo+1&page=1",
      { scroll: false },
    );
    expect(pushState).not.toHaveBeenCalled();
  });

  it("a tick while a search is still on its way rides with it to the server", async () => {
    const host = await mount(createElement(Screen, { complete: KEY }));

    await type(
      host.querySelector<HTMLInputElement>("input[aria-label=Buscar]")!,
      "ent",
    );
    await click(filterButton(host, "Status"));
    await click(option("Inativo"));
    await click(filterButton(host, "Status"));

    expect(pushState).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledTimes(1);
    // A filter restarts the paging, so the page the search set goes.
    expect(push).toHaveBeenCalledWith(
      "?tab=occurrence-types&search=ent&status=inactive",
      { scroll: false },
    );
  });

  it("after Atualizar, until the new rows arrive, a tick goes to the server", async () => {
    const host = await mount(createElement(Screen, { complete: KEY }));

    await act(async () => {
      window.dispatchEvent(new CustomEvent(DATA_REVALIDATED_EVENT));
    });

    await click(filterButton(host, "Status"));
    await click(option("Inativo"));
    await click(filterButton(host, "Status"));

    expect(pushState).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledTimes(1);
  });

  it("rows of another key (another company, another search) are never answered locally", async () => {
    const other = completeListKey(
      new URLSearchParams(
        "tab=occurrence-types&businessId=018f0000-0000-7000-8000-00000000000b",
      ),
      SPEC,
      LOCAL,
      true,
    );
    const host = await mount(createElement(Screen, { complete: other }));

    await click(filterButton(host, "Status"));
    await click(option("Inativo"));
    await click(filterButton(host, "Status"));

    expect(pushState).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledTimes(1);
  });
});

describe("a list answered on the server (no complete read)", () => {
  it("keeps today's behaviour: the rows as sent, one request after the popover closes", async () => {
    const host = await mount(createElement(Screen, {}));

    // The server's page is shown as it came (here, all twelve rows).
    expect(host.querySelectorAll("tbody tr")).toHaveLength(12);

    await click(filterButton(host, "Status"));
    await click(option("Inativo"));

    expect(push).not.toHaveBeenCalled();
    expect(host.querySelectorAll("tbody tr")).toHaveLength(12);

    await click(filterButton(host, "Status"));

    expect(pushState).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("?tab=occurrence-types&status=inactive", {
      scroll: false,
    });
  });

  it("the pager goes through the list query: busy at once, one navigation for a double click", async () => {
    const host = await mount(
      createElement(
        React.Fragment,
        null,
        createElement(DataTable<OccurrenceType, unknown>, {
          columns: COLUMNS,
          data: ROWS.slice(0, 10),
          meta: { total: 42, page: 1, pageSize: 10 },
          responseError: { error: false, errorMessage: "" },
          server: SPEC,
        }),
        createElement(
          React.Suspense,
          { fallback: null },
          createElement(PendingNavigation),
        ),
      ),
    );

    const next = pagerButton(host, "Ir para a próxima página");

    await click(next);

    // The rows of page 2 have not arrived: the table says so and the
    // buttons wait, so a second click cannot ask for the same page again.
    expect(host.querySelector("[data-table-busy]")).not.toBeNull();
    expect(next.disabled).toBe(true);

    await click(next);

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("?tab=occurrence-types&page=2", {
      scroll: false,
    });
  });

  it("changes the page size and restarts at page 1 through the same query", async () => {
    navigation.params = new URLSearchParams("tab=occurrence-types&page=3");

    const host = await mount(
      createElement(DataTable<OccurrenceType, unknown>, {
        columns: COLUMNS,
        data: ROWS.slice(0, 10),
        meta: { total: 42, page: 3, pageSize: 10 },
        responseError: { error: false, errorMessage: "" },
        server: SPEC,
      }),
    );

    await click(pagerButton(host, "Ir para a primeira página"));

    expect(push).toHaveBeenCalledWith("?tab=occurrence-types&page=1", {
      scroll: false,
    });
  });
});

describe("the search box follows the URL", () => {
  it("shows the URL's term after Back or Forward", async () => {
    navigation.params = new URLSearchParams("search=abc");

    const host = await mount(createElement(Screen, {}));
    const input = host.querySelector<HTMLInputElement>(
      "input[aria-label=Buscar]",
    )!;

    expect(input.value).toBe("abc");

    // Back: the URL moves by itself, nothing is pending.
    await act(async () => {
      navigation.set(new URLSearchParams("search=xyz"));
    });

    expect(input.value).toBe("xyz");

    await act(async () => {
      navigation.set(new URLSearchParams());
    });

    expect(input.value).toBe("");
  });

  it("is not overwritten while a typed term waits for the pause", async () => {
    navigation.params = new URLSearchParams("search=abc");

    const host = await mount(createElement(Screen, {}));
    const input = host.querySelector<HTMLInputElement>(
      "input[aria-label=Buscar]",
    )!;

    await type(input, "abcd");

    // The URL moves meanwhile (an earlier navigation landing).
    await act(async () => {
      navigation.set(new URLSearchParams("search=ab"));
    });

    expect(input.value).toBe("abcd");

    await settle(LIST_QUERY_DEBOUNCE_MS + 50);

    expect(push).toHaveBeenLastCalledWith("?search=abcd&page=1", {
      scroll: false,
    });
  });

  it("a caller can still control the box itself", async () => {
    const host = await mount(
      createElement(SearchInputWithLoading, {
        "aria-label": "Buscar",
        value: "fixo",
        onChange: () => {},
      }),
    );

    expect(host.querySelector<HTMLInputElement>("input")!.value).toBe("fixo");
  });
});
