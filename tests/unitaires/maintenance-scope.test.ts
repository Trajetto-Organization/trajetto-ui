import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The unified maintenance screens (decision 8.7) and their two scopes: /admin
 * acts on the company picked at the top (the URL), /dashboard on the
 * session's — each reads only its own source, so a `?businessId=` typed into
 * a /dashboard URL never redirects a write. Plus the contract between each
 * table's columns and its server-side spec: every key the API sorts or
 * filters by is a column id (else the header cannot sort and the filter
 * cannot show its chips).
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

const navigation = vi.hoisted(() => ({ params: new URLSearchParams() }));
const session = vi.hoisted(() => ({ businessId: null as string | null }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => navigation.params,
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
  usePathname: () => "/dashboard/service-order",
}));

vi.mock("@/store/auth-store", () => ({
  useAuthStore: (select: (state: { businessId: string | null }) => unknown) =>
    select({ businessId: session.businessId }),
}));

// The menus open dialogs backed by server actions; the columns are what is
// proven here.
vi.mock("@/features/service-order/row-actions", () => ({
  ServiceOrderRowActions: () => null,
}));
vi.mock("@/features/part/row-actions", () => ({ PartRowActions: () => null }));
vi.mock("@/features/service-order/order-parts/row-actions", () => ({
  OrderPartRowActions: () => null,
}));

import { useFleetBusinessId } from "@/features/service-order/hooks/use-fleet-business-id";

import { buildServiceOrderColumns } from "@/features/service-order/table-columns";
import { SERVICE_ORDER_TABLE } from "@/features/service-order/server-table";
import { buildPartColumns } from "@/features/part/table-columns";
import { PART_TABLE } from "@/features/part/server-table";
import { buildOrderPartColumns } from "@/features/service-order/order-parts/table-columns";
import { ORDER_PART_TABLE } from "@/features/service-order/order-parts/server-table";

import type { ServerTableSpec } from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";
import type { ColumnDef } from "@tanstack/react-table";

(globalThis as { React?: typeof React }).React = React;

const URL_COMPANY = "018f0000-0000-7000-8000-0000000000aa";
const SESSION_COMPANY = "018f0000-0000-7000-8000-0000000000bb";

let root: Root | null = null;

async function businessIdSeenBy(
  scope: "admin" | "dashboard",
): Promise<string | undefined> {
  let seen: string | undefined = "not rendered";

  const Probe = () => {
    seen = useFleetBusinessId(scope);

    return null;
  };

  const host = document.createElement("div");
  root = createRoot(host);

  await act(async () => {
    root!.render(createElement(Probe));
  });

  return seen;
}

afterEach(() => {
  act(() => root?.unmount());
  root = null;
});

describe("which company a maintenance screen acts on", () => {
  it("is the selector's on /admin, never the session's", async () => {
    navigation.params = new URLSearchParams({ businessId: URL_COMPANY });
    session.businessId = SESSION_COMPANY;

    expect(await businessIdSeenBy("admin")).toBe(URL_COMPANY);
  });

  it("is none on /admin until one is picked, and a malformed id is none", async () => {
    session.businessId = SESSION_COMPANY;

    navigation.params = new URLSearchParams();
    expect(await businessIdSeenBy("admin")).toBeUndefined();

    navigation.params = new URLSearchParams({ businessId: "../../user" });
    expect(await businessIdSeenBy("admin")).toBeUndefined();
  });

  it("is the session's on /dashboard, whatever the URL says", async () => {
    navigation.params = new URLSearchParams({ businessId: URL_COMPANY });
    session.businessId = SESSION_COMPANY;

    expect(await businessIdSeenBy("dashboard")).toBe(SESSION_COMPANY);
  });
});

function columnIds<T>(columns: ColumnDef<T>[]): string[] {
  return columns.map(
    (column) =>
      column.id ??
      String((column as { accessorKey?: string }).accessorKey ?? ""),
  );
}

describe("each table's columns and its server spec", () => {
  const cases: Array<[string, string[], ServerTableSpec]> = [
    [
      "service orders",
      columnIds(buildServiceOrderColumns("dashboard")),
      SERVICE_ORDER_TABLE,
    ],
    ["parts", columnIds(buildPartColumns("dashboard")), PART_TABLE],
    [
      "order parts",
      columnIds(buildOrderPartColumns("dashboard")),
      ORDER_PART_TABLE,
    ],
  ];

  it.each(cases)(
    "%s: every sort key and facet is a column",
    (_name, ids, spec) => {
      for (const key of spec.sortable) expect(ids, key).toContain(key);
      for (const key of Object.keys(spec.facets))
        expect(ids, key).toContain(key);
    },
  );

  it("the same columns in both scopes", () => {
    expect(columnIds(buildServiceOrderColumns("admin"))).toEqual(
      columnIds(buildServiceOrderColumns("dashboard")),
    );
  });
});
