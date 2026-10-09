import { describe, expect, it } from "vitest";

import {
  assertServerTableSpec,
  facetOptions,
  readColumnFilters,
  readSorting,
  writeColumnFilters,
  writeSorting,
  type ServerTableSpec,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

/**
 * Edges of the server-side table state left alive by the 06/10 mutation run:
 * a spec without a default sort, padded facet values, values a facet does not
 * accept on the way out, and the page's own searchParams object (a record,
 * not a URLSearchParams) as the source of a new URL.
 */

const spec: ServerTableSpec = {
  sortable: ["name", "created_at"],
  facets: { status: { param: "status", values: ["A", "B"] } },
};

describe("readSorting", () => {
  it("is no sort at all when the URL has none and the spec has no default", () => {
    expect(readSorting({}, spec)).toEqual([]);
  });
});

describe("readColumnFilters", () => {
  it("trims each value before checking it", () => {
    expect(readColumnFilters({ status: " A , B " }, spec)).toEqual([
      { id: "status", value: ["A", "B"] },
    ]);
  });
});

describe("writeSorting", () => {
  it("writes a sort for a spec without a default", () => {
    const params = writeSorting({}, [{ id: "name", desc: true }], spec);

    expect(params.toString()).toBe("sort=name&order=desc");
  });

  it("starts from the page's searchParams record, repeated values included", () => {
    const params = writeSorting(
      {
        search: "abc",
        page: "3",
        status: ["A", "B"],
        empty: undefined,
        blank: "",
      },
      [{ id: "name", desc: false }],
      spec,
    );

    expect(params.getAll("status")).toEqual(["A", "B"]);
    expect(params.get("search")).toBe("abc");
    expect(params.has("page")).toBe(false);
    expect(params.has("empty")).toBe(false);
    expect(params.has("blank")).toBe(false);
    expect(params.get("sort")).toBe("name");
  });
});

describe("writeColumnFilters", () => {
  it("drops values the facet does not accept", () => {
    const params = writeColumnFilters(
      {},
      [{ id: "status", value: ["A", "Z"] }],
      spec,
    );

    expect(params.get("status")).toBe("A");
  });
});

describe("facetOptions", () => {
  it("is empty without counts or labels", () => {
    expect(facetOptions(undefined)).toEqual([]);
  });

  it("labels a closed set with no counts yet", () => {
    expect(facetOptions(undefined, { A: "Ativo" })).toEqual([
      { value: "A", label: "Ativo", count: undefined },
    ]);
  });
});

describe("assertServerTableSpec", () => {
  it("accepts a facet with its own param", () => {
    expect(assertServerTableSpec(spec)).toBe(spec);
  });
});
