import { describe, expect, it, vi } from "vitest";

import {
  LOCAL_TABLE_MAX_ROWS,
  answersLocally,
  assertLocalTableSpec,
  completeListKey,
  completeReadQuery,
  listWindowOf,
  localListView,
  localSortsAllowed,
  readCompleteList,
  unfacetedLowerBound,
  type PagedRead,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table/local-table";
import { CATALOG_TABLES } from "@/features/deliveries/lib/catalog-tables";
import {
  CATALOG_LOCAL,
  isLocalCatalogTab,
} from "@/features/deliveries/lib/catalog-local";
import { BRANCH_TABLE } from "@/features/branch/lib/server-table";
import { BRANCH_LOCAL } from "@/features/branch/lib/local-table";

/**
 * Complete-set local mode (spec §13): when the browser may answer a list on
 * its own, and what it answers. The API parity of the answers is proven in
 * local-table-api-parity.test.ts; this file is about the DECISION: which
 * reads the server makes, which URL changes stay in the browser.
 */

const SPEC = CATALOG_TABLES["occurrence-types"];
const LOCAL = CATALOG_LOCAL["occurrence-types"];

const ID = (n: number) =>
  `0190${String(n).padStart(4, "0")}-0000-7000-8000-000000000000`;

function row(n: number, overrides: Record<string, unknown> = {}) {
  return {
    id: ID(n),
    name: `Tipo ${n}`,
    is_active: n % 3 !== 0,
    blocks_delivery: n % 2 === 0,
    requires_photo: false,
    category: n % 2 === 0 ? "NOT_DELIVERED" : "DELIVERED",
    created_at: new Date(Date.UTC(2026, 9, 1, n)).toISOString(),
    updated_at: new Date(Date.UTC(2026, 9, 2, 30 - n)).toISOString(),
    ...overrides,
  };
}

const ROWS = Array.from({ length: 12 }, (_, index) => row(index + 1));

function read(
  total: number,
  rows: unknown[],
  facets?: Record<string, { value: string; count: number }[]>,
): PagedRead & { ok: boolean } {
  return {
    ok: true,
    rows,
    meta: { total, page: 1, pageSize: rows.length },
    searchMeta: facets ? { facets } : {},
  };
}

describe("which catalogs may be answered in the browser", () => {
  it("only the small catalogs: Embarcadores, Tipos de ocorrência, Motivos (and Filiais)", () => {
    expect(
      ["shippers", "occurrence-types", "status-change-reasons"].every(
        isLocalCatalogTab,
      ),
    ).toBe(true);

    // Importações change while an upload runs; the operation lists are big.
    for (const tab of ["imports", "deliveries", "occurrences", "constructor"]) {
      expect(isLocalCatalogTab(tab)).toBe(false);
    }

    expect(Object.keys(BRANCH_LOCAL.facets).sort()).toEqual(
      Object.keys(BRANCH_TABLE.facets).sort(),
    );
  });

  it("refuses a local spec that misses one of the server's facets or orders by a column the API does not", () => {
    expect(() =>
      assertLocalTableSpec(SPEC, {
        ...LOCAL,
        facets: { is_active: LOCAL.facets.is_active },
      }),
    ).toThrow(/Filtro sem regra local/);

    expect(() =>
      assertLocalTableSpec(SPEC, {
        ...LOCAL,
        sorts: {
          ...LOCAL.sorts,
          description: { field: "description", kind: "instant" },
        },
      }),
    ).toThrow(/Ordem local/);
  });

  it("never orders text columns in the browser (their order is the database collation's)", () => {
    for (const local of [...Object.values(CATALOG_LOCAL), BRANCH_LOCAL]) {
      for (const sort of Object.values(local.sorts)) {
        expect(["instant", "boolean"]).toContain(sort.kind);
      }
    }
  });
});

describe("the read the server makes", () => {
  it("asks for page 1 of 100 with the URL's sort and no facet", () => {
    expect(
      completeReadQuery(
        {
          sort: "name",
          order: "desc",
          status: "inactive",
          page: "3",
          pageSize: "20",
        },
        SPEC,
      ),
    ).toEqual({
      page: "1",
      pageSize: String(LOCAL_TABLE_MAX_ROWS),
      sort: "name",
      order: "desc",
    });
  });

  it("no facet, whole set: one read, and the rows come back complete", async () => {
    const reader = vi.fn(async () => read(12, ROWS));

    const answer = await readCompleteList({
      source: { page: "2", pageSize: "10" },
      spec: SPEC,
      local: LOCAL,
      read: reader,
      isOk: (r) => r.ok,
    });

    expect(reader).toHaveBeenCalledTimes(1);
    expect(reader).toHaveBeenCalledWith({ complete: true });
    expect(answer.complete).toBeDefined();
    expect(answer.rows).toHaveLength(12);
    expect(answer.meta).toEqual({ total: 12, page: 2, pageSize: 10 });
  });

  it("no facet, a big catalog: still one read, sliced to the URL's page", async () => {
    const hundred = Array.from({ length: 100 }, (_, index) => row(index + 1));
    const reader = vi.fn(async () => read(340, hundred));

    const answer = await readCompleteList({
      source: { page: "3", pageSize: "20" },
      spec: SPEC,
      local: LOCAL,
      read: reader,
      isOk: (r) => r.ok,
    });

    expect(reader).toHaveBeenCalledTimes(1);
    expect(answer.complete).toBeUndefined();
    expect(answer.rows).toEqual(hundred.slice(40, 60));
    expect(answer.meta).toEqual({ total: 340, page: 3, pageSize: 20 });
  });

  it("no facet, a page past the first 100 rows: the URL's page, read as asked", async () => {
    const reader = vi.fn(async () => read(340, ROWS));

    const answer = await readCompleteList({
      source: { page: "11", pageSize: "10" },
      spec: SPEC,
      local: LOCAL,
      read: reader,
      isOk: (r) => r.ok,
    });

    expect(reader).toHaveBeenCalledTimes(1);
    expect(reader).toHaveBeenCalledWith({ complete: false });
    expect(answer.complete).toBeUndefined();
  });

  it("facets on a big catalog: one read, the server's answer (every tick of a big list)", async () => {
    // 140 inactive alone is already above 100: no complete read is tried.
    const reader = vi.fn(async () =>
      read(140, ROWS.slice(0, 10), {
        status: [
          { value: "active", count: 300 },
          { value: "inactive", count: 140 },
        ],
      }),
    );

    const answer = await readCompleteList({
      source: { status: "inactive" },
      spec: SPEC,
      local: LOCAL,
      read: reader,
      isOk: (r) => r.ok,
    });

    expect(reader).toHaveBeenCalledTimes(1);
    expect(reader).toHaveBeenCalledWith({ complete: false });
    expect(answer.complete).toBeUndefined();
  });

  it("facets on a small catalog: the server's answer first, then the complete read", async () => {
    const reader = vi.fn(async ({ complete }: { complete: boolean }) =>
      complete
        ? read(12, ROWS)
        : read(4, ROWS.slice(0, 4), {
            status: [
              { value: "active", count: 8 },
              { value: "inactive", count: 4 },
            ],
          }),
    );

    const answer = await readCompleteList({
      source: { status: "inactive" },
      spec: SPEC,
      local: LOCAL,
      read: reader,
      isOk: (r) => r.ok,
    });

    expect(reader.mock.calls.map(([query]) => query.complete)).toEqual([
      false,
      true,
    ]);
    expect(answer.complete).toBeDefined();
    expect(answer.rows).toHaveLength(12);
  });

  it("an error on the first read is the answer, on the URL's page", async () => {
    const reader = vi.fn(async () => ({ ...read(0, []), ok: false }));

    const answer = await readCompleteList({
      source: { pageSize: "20" },
      spec: SPEC,
      local: LOCAL,
      read: reader,
      isOk: (r) => r.ok,
    });

    expect(reader).toHaveBeenCalledTimes(1);
    expect(answer.ok).toBe(false);
    expect(answer.complete).toBeUndefined();
    expect(answer.meta).toEqual({ total: 0, page: 1, pageSize: 20 });
  });

  it("a page the API would refuse goes to the API as is (its 400, as before)", async () => {
    for (const source of [
      { page: "2.5" },
      { pageSize: "500" },
      { page: "-1" },
    ]) {
      const reader = vi.fn(async () => read(12, ROWS));

      const answer = await readCompleteList({
        source,
        spec: SPEC,
        local: LOCAL,
        read: reader,
        isOk: (r) => r.ok,
      });

      expect(reader).toHaveBeenCalledWith({ complete: false });
      expect(answer.complete).toBeUndefined();
    }
  });

  it("the lower bound of the unfaceted set is the largest facet sum or the total", () => {
    expect(
      unfacetedLowerBound(
        read(3, [], {
          status: [
            { value: "active", count: 60 },
            { value: "inactive", count: 50 },
          ],
          blocking: [{ value: "yes", count: 7 }],
        }),
      ),
    ).toBe(110);
    expect(unfacetedLowerBound(read(9, []))).toBe(9);
  });
});

describe("which URL changes the rows on screen answer", () => {
  const key = completeListKey(
    { tab: "occurrence-types", search: "ent" },
    SPEC,
    LOCAL,
    true,
  );
  const answers = (next: Record<string, string>) =>
    answersLocally(ROWS, key, new URLSearchParams(next), SPEC, LOCAL);

  it("facets, pages, page sizes and the date sorts", () => {
    expect(
      answers({ tab: "occurrence-types", search: "ent", status: "inactive" }),
    ).toBe(true);
    expect(
      answers({
        tab: "occurrence-types",
        search: "ent",
        blocking: "yes",
        photo: "no",
        page: "2",
        pageSize: "20",
      }),
    ).toBe(true);
    expect(
      answers({
        tab: "occurrence-types",
        search: "ent",
        sort: "updated_at",
        order: "asc",
      }),
    ).toBe(true);
    // An unknown sort reads as the default, which is a date.
    expect(
      answers({ tab: "occurrence-types", search: "ent", sort: "nope" }),
    ).toBe(true);
  });

  it("not another search, a name sort, another company or tab, or a page the API refuses", () => {
    expect(answers({ tab: "occurrence-types", search: "entr" })).toBe(false);
    expect(answers({ tab: "occurrence-types" })).toBe(false);
    expect(
      answers({
        tab: "occurrence-types",
        search: "ent",
        sort: "name",
        order: "asc",
      }),
    ).toBe(false);
    expect(
      answers({
        tab: "occurrence-types",
        search: "ent",
        businessId: "018f0000-0000-7000-8000-00000000000b",
      }),
    ).toBe(false);
    expect(answers({ tab: "shippers", search: "ent" })).toBe(false);
    expect(
      answers({ tab: "occurrence-types", search: "ent", page: "1.5" }),
    ).toBe(false);
    expect(
      answers({ tab: "occurrence-types", search: "ent", pageSize: "101" }),
    ).toBe(false);
  });

  it("nothing at all without a complete read", () => {
    expect(
      answersLocally(
        ROWS,
        undefined,
        new URLSearchParams({ status: "inactive" }),
        SPEC,
        LOCAL,
      ),
    ).toBe(false);
  });

  it("a server sort is part of the key: the rows hold that order, any facet keeps it", () => {
    const byName = completeListKey(
      { sort: "name", order: "asc" },
      SPEC,
      LOCAL,
      true,
    );

    expect(
      answersLocally(
        ROWS,
        byName,
        new URLSearchParams({ sort: "name", order: "asc", status: "active" }),
        SPEC,
        LOCAL,
      ),
    ).toBe(true);
    expect(
      answersLocally(
        ROWS,
        byName,
        new URLSearchParams({ sort: "name", order: "desc" }),
        SPEC,
        LOCAL,
      ),
    ).toBe(false);
  });

  it("an empty param is no param, as the server reads it", () => {
    expect(
      completeListKey({ tab: "shippers", search: "" }, SPEC, LOCAL, true),
    ).toBe(
      completeListKey(new URLSearchParams("tab=shippers"), SPEC, LOCAL, true),
    );
  });

  it("rows whose id or date the browser cannot order keep every sort on the server", () => {
    const seeded = [...ROWS, row(13, { id: "default-occurrence" })];

    expect(localSortsAllowed(ROWS, LOCAL)).toBe(true);
    expect(localSortsAllowed(seeded, LOCAL)).toBe(false);
    expect(
      localSortsAllowed(
        [row(1, { id: "0190ABCD-0000-7000-8000-00000000000F" })],
        LOCAL,
      ),
    ).toBe(false);
    expect(localSortsAllowed([row(1, { created_at: "ontem" })], LOCAL)).toBe(
      false,
    );

    const keyOfSeeded = completeListKey({}, SPEC, LOCAL, false);

    expect(
      answersLocally(
        seeded,
        keyOfSeeded,
        new URLSearchParams({ status: "active" }),
        SPEC,
        LOCAL,
      ),
    ).toBe(true);
    expect(
      answersLocally(
        seeded,
        keyOfSeeded,
        new URLSearchParams({ sort: "updated_at", order: "asc" }),
        SPEC,
        LOCAL,
      ),
    ).toBe(false);
  });
});

describe("what the browser shows", () => {
  it("filters, keeps the order the rows came in for a server sort, and pages", () => {
    const view = localListView(
      ROWS,
      new URLSearchParams({
        sort: "name",
        order: "asc",
        status: "active",
        pageSize: "5",
        page: "2",
      }),
      SPEC,
      LOCAL,
    );
    const active = ROWS.filter((entry) => entry.is_active);

    expect(view.meta).toEqual({ total: active.length, page: 2, pageSize: 5 });
    expect(view.rows).toEqual(active.slice(5, 10));
    expect(view.selection).toEqual({ status: ["active"] });
  });

  it("orders by a date sort with the API tiebreaker", () => {
    const tie = new Date(Date.UTC(2026, 9, 1)).toISOString();
    const tied = [
      row(1, { created_at: tie, id: ID(1) }),
      row(2, { created_at: tie, id: ID(9) }),
    ];

    const view = localListView(
      tied,
      new URLSearchParams({ sort: "created_at", order: "asc" }),
      SPEC,
      LOCAL,
    );

    // Same instant: id desc decides, whatever the column's direction.
    expect(view.rows.map((entry) => entry.id)).toEqual([ID(9), ID(1)]);
  });

  it("reads the page window the way the web server and the API do", () => {
    expect(listWindowOf({})).toEqual({ page: 1, pageSize: 10, valid: true });
    expect(listWindowOf({ page: "0", pageSize: "abc" })).toEqual({
      page: 1,
      pageSize: 10,
      valid: true,
    });
    expect(listWindowOf({ pageSize: "100" }).valid).toBe(true);
    expect(listWindowOf({ pageSize: "101" }).valid).toBe(false);
  });
});
