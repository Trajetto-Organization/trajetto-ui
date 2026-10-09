import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  BRAZILIAN_UFS,
  BUSINESS_STATUSES,
  BUSINESS_TABLE,
  businessListQuery,
} from "@/app/(protected)/_components/admin/business/lib/server-table";
import {
  businessStatsData,
  placesText,
} from "@/app/(protected)/_components/admin/business/lib/stats-data";

/**
 * Empresas (/admin) on the server-side list contract (decision 8.8): the
 * cards came from the ten rows of the page ("Por Estado" named the states of
 * that page) and the filters narrowed the page.
 */

describe("the cards read the server's numbers only", () => {
  it("maps searchMeta, places included", () => {
    expect(
      businessStatsData({
        total: 14,
        withErpCode: 7,
        topStates: [
          { value: "SP", count: 6 },
          { value: "MT", count: 3 },
        ],
        topCities: [{ value: "São José/SC", count: 2 }],
      }),
    ).toEqual({
      totalBusiness: 14,
      withErpCode: 7,
      topStates: "SP (6), MT (3)",
      topCities: "São José/SC (2)",
    });
  });

  it("shows zero and a dash while the list failed", () => {
    expect(businessStatsData(undefined)).toEqual({
      totalBusiness: 0,
      withErpCode: 0,
      topStates: "—",
      topCities: "—",
    });
    expect(placesText([])).toBe("—");
  });
});

describe("the table's server contract", () => {
  it("forwards the order and the facets, and drops what the API refuses", () => {
    const query = businessListQuery({
      sort: "uf",
      order: "asc",
      status: "inactive",
      uf: "MT,ZZ",
      search: "ignored here",
    });

    expect(query).toEqual({
      sort: "uf",
      order: "asc",
      status: "inactive",
      uf: "MT",
    });
  });
});

const API_BUSINESS_LIST = join(
  process.cwd(),
  "..",
  "trajetto-api",
  "src",
  "modules",
  "business",
  "usecases",
  "list-business",
  "business-list.ts",
);

const hasApi = existsSync(API_BUSINESS_LIST);

function apiList(constant: string): string[] {
  const source = readFileSync(API_BUSINESS_LIST, "utf8");
  const block = new RegExp(
    `const ${constant} = \\[([\\s\\S]*?)\\] as const`,
  ).exec(source);

  if (!block) throw new Error(`${constant} not found in business-list.ts`);

  return [...block[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

describe.skipIf(!hasApi)(
  `the web spec matches the API's list${hasApi ? "" : " — skipped: ../trajetto-api is not checked out"}`,
  () => {
    it("the same sort keys, statuses and UFs", () => {
      expect([...BUSINESS_TABLE.sortable].sort()).toEqual(
        apiList("BUSINESS_SORT_KEYS").sort(),
      );
      expect([...BUSINESS_STATUSES]).toEqual(apiList("BUSINESS_STATUSES"));
      expect([...BRAZILIAN_UFS]).toEqual(apiList("BRAZILIAN_UFS"));
    });
  },
);
