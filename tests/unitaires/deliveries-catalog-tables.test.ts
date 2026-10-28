import * as React from "react";
import { act, createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

/**
 * The Entregas catalog tabs on the server (decision 8.8): Embarcadores,
 * Tipos de ocorrência, Motivos and Importações.
 *
 * Their Status/Impeditiva/Foto/Origem filters ran over the ten rows on
 * screen while the pager counted the whole company. With the page forwarding
 * their params, a filter is a new URL (a new API request) and its options
 * carry the server's counts. Without that forwarding the tab stays on the old
 * page filters: a chip over a table the request never filtered would lie.
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

// The row menus open dialogs with server actions; what is proven here is the
// table and its toolbar.
vi.mock("@/features/deliveries/shippers/row-actions", () => ({
  ShipperRowActions: () => null,
}));
vi.mock("@/features/routes/add-to-route-dialog", () => ({
  AddToRouteDialog: () => null,
}));
vi.mock("@/features/deliveries/hooks/use-deliveries-business-id", () => ({
  useDeliveriesBusinessId: () => undefined,
}));
vi.mock("@/lib/check-multiple-permissions", () => ({
  useCheckMultiplePermissions: () => ({
    hasAllPermissions: true,
    tooltipMessage: "",
  }),
  getPermissionName: () => "Gerenciar Entregas",
}));

import { DeliveriesTable } from "@/features/deliveries/table";
import { LIST_QUERY_DEBOUNCE_MS } from "@/lib/search-params";
import {
  catalogListQuery,
  CATALOG_TABLES,
} from "@/features/deliveries/lib/catalog-tables";
import { deliveryTabListQuery } from "@/features/deliveries/lib/list-query";

(globalThis as { React?: typeof React }).React = React;

let root: Root | null = null;

async function mount(element: ReactElement): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root!.render(element);
  });

  // Each tab's table is its own chunk (table/index.tsx): wait for it to
  // replace the placeholder. It is in the module cache already (beforeAll),
  // so this is a few ticks; the deadline only bounds a broken load, and
  // that fails here, by name, instead of later over a skeleton.
  const deadline = performance.now() + MOUNT_DEADLINE_MS;

  while (
    host.querySelector('[data-tutorial="loading"]') &&
    performance.now() < deadline
  ) {
    await act(async () => {
      await new Promise((done) => setTimeout(done, 10));
    });
  }

  if (host.querySelector('[data-tutorial="loading"]')) {
    throw new Error(
      `a tabela da aba não substituiu o placeholder em ${MOUNT_DEADLINE_MS} ms`,
    );
  }

  return host;
}

/*
  The shippers tab's chunk, loaded before any test mounts it. The mount used
  to give the tab's dynamic import 5 s, which a parallel run spends on
  transforming that module tree alone: the loop gave up silently and the
  test failed on "sem o filtro Status" over the skeleton. Loaded here, with
  a hook deadline sized for a loaded machine, the dynamic import inside the
  component resolves from the module cache.
*/
const MOUNT_DEADLINE_MS = 20_000;
const CHUNK_LOAD_TIMEOUT_MS = 120_000;
const MOUNTED_TEST_TIMEOUT_MS = 30_000;

beforeAll(async () => {
  await import("@/features/deliveries/table/shippers");
}, CHUNK_LOAD_TIMEOUT_MS);

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

beforeEach(() => {
  navigation.params = new URLSearchParams("tab=shippers&page=2");
  navigation.push.mockClear();
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

const SHIPPERS = [
  {
    id: "018f0000-0000-7000-8000-0000000000f1",
    name: "Atacado Sul",
    cnpj: null,
    email: null,
    telephone: null,
    is_active: true,
    businessId: "018f0000-0000-7000-8000-00000000000b",
    created_at: "2026-09-01T12:00:00.000Z",
    updated_at: "2026-09-01T12:00:00.000Z",
  },
];

const SEARCH_META = {
  total: 42,
  active: 30,
  withCnpj: 10,
  facets: {
    status: [
      { value: "active", count: 30 },
      { value: "inactive", count: 12 },
    ],
  },
};

function shippersTable(catalogServerMode: boolean) {
  return createElement(DeliveriesTable, {
    activeTab: "shippers",
    data: SHIPPERS,
    meta: { total: 42, page: 2, pageSize: 10 },
    responseError: { error: false, errorMessage: "" },
    searchMeta: SEARCH_META,
    catalogServerMode,
  });
}

function statusFilter(host: HTMLElement): HTMLButtonElement {
  const toolbar = host.querySelector('[data-tutorial="deliveries-filters"]');
  const button = Array.from(toolbar?.querySelectorAll("button") ?? []).find(
    (node) => node.textContent?.startsWith("Status"),
  );

  if (!button) throw new Error("sem o filtro Status");

  return button as HTMLButtonElement;
}

function option(label: string): Element {
  const item = Array.from(document.querySelectorAll('[role="option"]')).find(
    (node) => node.textContent?.includes(label),
  );

  if (!item) throw new Error(`sem a opção "${label}"`);

  return item;
}

describe("the shippers tab answered on the server", () => {
  it(
    "turns the Status filter into a new URL, with the server's counts",
    async () => {
      const host = await mount(shippersTable(true));

      await click(statusFilter(host));

      // The options carry the company-wide counts, not the loaded page's.
      expect(option("Inativo").textContent).toContain("12");

      await click(option("Inativo"));
      await afterFilterPause();

      expect(navigation.push).toHaveBeenCalledWith(
        "?tab=shippers&status=inactive",
        {
          scroll: false,
        },
      );
    },
    MOUNTED_TEST_TIMEOUT_MS,
  );

  it(
    "keeps the page filters while the page does not forward the params",
    async () => {
      const host = await mount(shippersTable(false));

      await click(statusFilter(host));

      // The loaded page's values, no server counts, and no new request.
      expect(() => option("Inativo")).toThrow();

      await click(option("Ativo"));

      expect(navigation.push).not.toHaveBeenCalled();
    },
    MOUNTED_TEST_TIMEOUT_MS,
  );
});

describe("the params each tab forwards", () => {
  it("maps the URL to the listing's sort and filters, dropping unknown values", () => {
    expect(
      catalogListQuery(
        "occurrence-types",
        new URLSearchParams(
          "sort=name&order=desc&status=inactive&blocking=yes,maybe&photo=no",
        ),
      ),
    ).toEqual({
      sort: "name",
      order: "desc",
      status: "inactive",
      blocking: "yes",
      photo: "no",
    });

    expect(
      catalogListQuery(
        "imports",
        new URLSearchParams("status=REVERSED&source=NFE_XML"),
      ),
    ).toEqual({ status: "REVERSED", source: "NFE_XML" });
  });

  it("covers every Entregas table from one call", () => {
    const params = new URLSearchParams("sort=name&order=asc&status=active");

    expect(deliveryTabListQuery("shippers", params)).toEqual({
      sort: "name",
      order: "asc",
      status: "active",
    });
    expect(deliveryTabListQuery("status-change-reasons", params)).toEqual({
      sort: "name",
      order: "asc",
      status: "active",
    });
    expect(deliveryTabListQuery("monitoring", params)).toEqual({});
  });

  it.each(["constructor", "toString", "__proto__", "hasOwnProperty"])(
    "treats ?tab=%s as no table, not as an inherited key",
    (tab) => {
      // `tab in CATALOG_TABLES` was true for these, and Object's own
      // function reached serverTableQuery as a spec.
      expect(() =>
        deliveryTabListQuery(
          tab,
          new URLSearchParams("sort=name&status=active"),
        ),
      ).not.toThrow();
      expect(
        deliveryTabListQuery(
          tab,
          new URLSearchParams("sort=name&status=active"),
        ),
      ).toEqual({});
    },
  );

  it("uses the API's sort keys and filter params (trajetto-api *-list.ts)", () => {
    expect(CATALOG_TABLES.shippers.sortable).toEqual([
      "name",
      "created_at",
      "updated_at",
    ]);
    expect(CATALOG_TABLES.imports.sortable).toEqual([
      "created_at",
      "filename",
      "imported",
      "duplicated",
      "invalid",
    ]);
    expect(
      Object.values(CATALOG_TABLES["occurrence-types"].facets).map(
        (facet) => facet.param,
      ),
    ).toEqual(["status", "blocking", "photo", "category"]);
  });
});
