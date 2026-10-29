import { describe, expect, it } from "vitest";

import {
  MAX_FACET_VALUES,
  assertServerTableSpec,
  facetOptions,
  readColumnFilters,
  readSorting,
  serverTableQuery,
  writeColumnFilters,
  writeSorting,
  type ServerTableSpec,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import {
  CATEGORY_LABELS,
  OCCURRENCE_TABLE,
  occurrenceCategory,
  occurrencesListQuery,
} from "@/features/deliveries/occurrences/server-table";

/**
 * The URL half of the list contract (decision 8.8): what a server-side table
 * reads from the address bar, writes back into it, and forwards to the API.
 * The API half is trajetto-api/tests/unitaires/pagination/list-query.test.ts.
 */
const SPEC: ServerTableSpec = {
  sortable: ["created_at", "recipient"],
  defaultSort: { id: "created_at", desc: true },
  facets: {
    status: { param: "status", values: ["OPEN", "CLOSED"] },
    typeName: { param: "typeId", values: "uuid" },
  },
};

const ID_A = "018f0000-0000-7000-8000-00000000000a";
const ID_B = "018f0000-0000-7000-8000-00000000000b";

const url = (query: string) => new URLSearchParams(query);

describe("reading the URL", () => {
  it("honours a sort the list declares", () => {
    expect(readSorting(url("sort=recipient&order=asc"), SPEC)).toEqual([
      { id: "recipient", desc: false },
    ]);
  });

  it("falls back to the default for a column it does not sort", () => {
    expect(readSorting(url("sort=password&order=asc"), SPEC)).toEqual([
      { id: "created_at", desc: true },
    ]);
  });

  it("reads each facet, split, known values only, without repeats", () => {
    expect(
      readColumnFilters(
        url(`status=OPEN,DELETED,OPEN&typeId=${ID_A},nope&typeId=${ID_B}`),
        SPEC,
      ),
    ).toEqual([
      { id: "status", value: ["OPEN"] },
      { id: "typeName", value: [ID_A, ID_B] },
    ]);
  });

  it("caps a facet at the API's limit, so an edited URL never turns into a 400", () => {
    // trajetto-api/src/shared/pagination/list-query.ts answers 400 above 50
    // values per facet (its MAX_FACET_VALUES); the two numbers must agree.
    expect(MAX_FACET_VALUES).toBe(50);

    const ids = Array.from(
      { length: MAX_FACET_VALUES + 5 },
      (_, index) =>
        `018f0000-0000-7000-8000-${String(index).padStart(12, "0")}`,
    );
    const source = { typeId: ids.join(",") };

    expect(readColumnFilters(source, SPEC)).toEqual([
      { id: "typeName", value: ids.slice(0, MAX_FACET_VALUES) },
    ]);
    expect(serverTableQuery(source, SPEC).typeId.split(",")).toHaveLength(
      MAX_FACET_VALUES,
    );
  });

  it("reads the plain object a server component receives", () => {
    expect(
      readColumnFilters({ status: ["OPEN", "CLOSED"], tab: "x" }, SPEC),
    ).toEqual([{ id: "status", value: ["OPEN", "CLOSED"] }]);
  });
});

describe("writing the URL", () => {
  it("sets sort and order and goes back to the first page", () => {
    const next = writeSorting(
      url("tab=occurrences&page=4&search=ana"),
      [{ id: "recipient", desc: true }],
      SPEC,
    );

    expect(next.toString()).toBe(
      "tab=occurrences&search=ana&sort=recipient&order=desc",
    );
  });

  it("leaves the default order out of the URL", () => {
    const next = writeSorting(
      url("sort=recipient&order=asc"),
      [{ id: "created_at", desc: true }],
      SPEC,
    );

    expect(next.has("sort")).toBe(false);
    expect(next.has("order")).toBe(false);
  });

  it("writes a facet as one comma list, and removes a cleared one", () => {
    const set = writeColumnFilters(
      url("page=3"),
      [{ id: "status", value: ["OPEN", "CLOSED"] }],
      SPEC,
    );

    expect(set.get("status")).toBe("OPEN,CLOSED");
    expect(set.has("page")).toBe(false);

    const cleared = writeColumnFilters(set, [], SPEC);

    expect(cleared.has("status")).toBe(false);
  });
});

describe("forwarding to the API", () => {
  it("sends only what the spec declares and accepts", () => {
    expect(
      serverTableQuery(
        {
          sort: "recipient",
          order: "desc",
          status: "OPEN,BOGUS",
          typeId: "not-an-id",
          businessId: ID_A,
        },
        SPEC,
      ),
    ).toEqual({ sort: "recipient", order: "desc", status: "OPEN" });
  });

  it("leaves an undeclared sort to the API's default", () => {
    expect(serverTableQuery({ sort: "password" }, SPEC)).toEqual({});
  });

  it("maps the occurrence page's URL to the feed's params", () => {
    expect(
      occurrencesListQuery({
        tab: "occurrences",
        sort: "typeName",
        order: "asc",
        severity: "blocking",
        occurrenceTypeId: ID_A,
        deliveryStatus: "FAILED,DELIVERED",
      }),
    ).toEqual({
      sort: "typeName",
      order: "asc",
      severity: "blocking",
      occurrenceTypeId: ID_A,
      deliveryStatus: "FAILED,DELIVERED",
    });
  });
});

// Decision 14.3: proofs are DELIVERED rows of the same feed; the tab filters
// them with the API's `category` facet (a value outside it never travels).
describe("the occurrence feed's category", () => {
  it("forwards the category facet and drops an unknown value", () => {
    expect(occurrencesListQuery({ category: "DELIVERED" })).toEqual({
      category: "DELIVERED",
    });
    expect(occurrencesListQuery({ category: "PAUSE" })).toEqual({});
  });

  it("reads a row without the field as a problem", () => {
    expect(occurrenceCategory({})).toBe("NOT_DELIVERED");
    expect(occurrenceCategory({ category: "DELIVERED" })).toBe("DELIVERED");
    expect(CATEGORY_LABELS).toEqual({
      DELIVERED: "Entrega",
      NOT_DELIVERED: "Não entrega",
    });
  });
});

describe("filter options", () => {
  it("labels a closed set here and keeps the server's counts", () => {
    expect(
      facetOptions([{ value: "OPEN", count: 3 }], {
        OPEN: "Aberta",
        CLOSED: "Fechada",
      }),
    ).toEqual([
      { value: "OPEN", label: "Aberta", count: 3 },
      { value: "CLOSED", label: "Fechada", count: undefined },
    ]);
  });

  it("takes a catalog's options, names and counts from the server", () => {
    expect(facetOptions([{ value: ID_A, label: "Recusa", count: 0 }])).toEqual([
      { value: ID_A, label: "Recusa", count: 0 },
    ]);
  });
});

describe("spec guard", () => {
  it("refuses a facet named like a param the page already uses", () => {
    expect(() =>
      assertServerTableSpec({
        sortable: [],
        facets: { status: { param: "page", values: ["a"] } },
      }),
    ).toThrow("Parâmetro de filtro reservado: page");
  });

  it("the occurrence spec sorts only by the API's keys", () => {
    expect(OCCURRENCE_TABLE.sortable).toEqual([
      "created_at",
      "typeName",
      "blocking",
      "recipient",
      "reporter",
    ]);
  });
});
