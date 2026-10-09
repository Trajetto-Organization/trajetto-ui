import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  businessIdQuery,
  firstParam,
  scopedBusinessId,
} from "@/features/branch/lib/scope";
import {
  BRANCH_STATUSES,
  BRANCH_TABLE,
  BRAZILIAN_UFS,
  branchListQuery,
} from "@/features/branch/lib/server-table";
import {
  branchStatsData,
  countWithShare,
} from "@/features/branch/lib/stats-data";

/**
 * Filiais, one implementation for /admin and /dashboard (decision 8.7).
 *
 * The two old screens drifted: the admin one listed every company's branches
 * mixed, asked for the company inside the create dialog, and both counted
 * "Com código ERP" and "Com nome fantasia" on the ten rows on screen. The
 * scope decides the company; the cards and filters are the server's.
 */

const COMPANY = "018fed00-0000-7000-8000-00000000000a";
const OTHER = "018fed00-0000-7000-8000-00000000000b";

describe("the scope decides the company", () => {
  it("on /admin, the selector's company from the URL, never the session's", () => {
    expect(scopedBusinessId("admin", COMPANY, OTHER)).toBe(COMPANY);
    // No company picked yet: the empty state, not the MASTER's own session.
    expect(scopedBusinessId("admin", null, OTHER)).toBeUndefined();
    // A value that is not a company id is not carried to the API.
    expect(scopedBusinessId("admin", "not-a-uuid", OTHER)).toBeUndefined();
  });

  it("on /dashboard, the session's company, whatever the URL says", () => {
    expect(scopedBusinessId("dashboard", OTHER, COMPANY)).toBe(COMPANY);
    expect(scopedBusinessId("dashboard", OTHER, null)).toBeUndefined();
  });

  it("only the MASTER names the company in the list request", () => {
    expect(businessIdQuery("admin", COMPANY)).toEqual({ businessId: COMPANY });
    expect(businessIdQuery("dashboard", COMPANY)).toEqual({});
    expect(businessIdQuery("admin", undefined)).toEqual({});
  });

  it("reads the first value of a repeated search param", () => {
    expect(firstParam(["2", "3"])).toBe("2");
    expect(firstParam("4")).toBe("4");
    expect(firstParam(undefined)).toBeUndefined();
  });
});

describe("the cards read the server's numbers only (decision 8.8)", () => {
  it("maps searchMeta, and shows zero while the list failed", () => {
    expect(
      branchStatsData({
        total: 40,
        active: 30,
        withErpCode: 12,
        withFantasyName: 7,
      }),
    ).toEqual({
      totalBranches: 40,
      active: 30,
      activeBase: 40,
      withErpCode: 12,
      withFantasyName: 7,
    });

    expect(branchStatsData(undefined)).toEqual({
      totalBranches: 0,
      active: 0,
      activeBase: 0,
      withErpCode: 0,
      withFantasyName: 0,
    });
  });

  it("takes the Ativas share over every status, not over the status-filtered total", () => {
    // "Inativa" picked: the table and the total card hold the one inactive
    // branch; the API counts "Ativas" without the status filter.
    const data = branchStatsData({
      total: 1,
      active: 11,
      withErpCode: 0,
      withFantasyName: 0,
      facets: {
        status: [
          { value: "active", count: 11 },
          { value: "inactive", count: 1 },
        ],
      },
    });

    expect(countWithShare(data.active, data.activeBase)).toBe("11 (92%)");
  });

  it("prints the share of the company, not of the page", () => {
    expect(countWithShare(12, 40)).toBe("12 (30%)");
    expect(countWithShare(0, 0)).toBe("0");
  });
});

describe("the table's server contract", () => {
  it("forwards the order and the facets, and drops what the API refuses", () => {
    const query = branchListQuery({
      sort: "city",
      order: "desc",
      status: "active",
      uf: "SP,XX,AM",
      page: "2",
    });

    expect(query).toMatchObject({
      sort: "city",
      order: "desc",
      status: "active",
      uf: "SP,AM",
    });
    expect(query).not.toHaveProperty("page");
  });

  it("does not forward an order the API does not offer", () => {
    expect(branchListQuery({ sort: "telephone" })).not.toHaveProperty("sort");
  });
});

const API_BRANCH_LIST = join(
  process.cwd(),
  "..",
  "trajetto-api",
  "src",
  "modules",
  "branch",
  "usecases",
  "list-branch",
  "branch-list.ts",
);

const hasApi = existsSync(API_BRANCH_LIST);

function apiList(constant: string): string[] {
  const source = readFileSync(API_BRANCH_LIST, "utf8");
  const block = new RegExp(
    `const ${constant} = \\[([\\s\\S]*?)\\] as const`,
  ).exec(source);

  if (!block) throw new Error(`${constant} not found in branch-list.ts`);

  return [...block[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

describe.skipIf(!hasApi)(
  `the web spec matches the API's list${hasApi ? "" : " — skipped: ../trajetto-api is not checked out"}`,
  () => {
    it("the same sort keys, statuses and UFs", () => {
      expect([...BRANCH_TABLE.sortable].sort()).toEqual(
        apiList("BRANCH_SORT_KEYS").sort(),
      );
      expect([...BRANCH_STATUSES]).toEqual(apiList("BRANCH_STATUSES"));
      expect([...BRAZILIAN_UFS]).toEqual(apiList("BRAZILIAN_UFS"));
    });
  },
);
