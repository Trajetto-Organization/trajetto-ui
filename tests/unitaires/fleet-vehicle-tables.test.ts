import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  VEHICLE_TABLE,
  vehicleListQuery,
} from "@/features/vehicle/server-table";
import { VEHICLE_TYPE_TABLE } from "@/features/vehicle-type/server-table";
import {
  CHECKLIST_TABLE,
  checklistListQuery,
} from "@/features/vehicle-checklist/server-table";

import { asShare, vehicleStatsData } from "@/features/vehicle/lib/stats";
import { checklistStatsData } from "@/features/vehicle-checklist/stats";

/**
 * The fleet lists on the server-side table contract (decision 8.8): the web
 * spec must say exactly what the API sorts and filters by, and the cards
 * read the API's tally, never the loaded rows (FLEET-STATS-1).
 */

describe("the list query forwarded to the API", () => {
  it("forwards a declared sort and the facets, and drops what the API refuses", () => {
    const query = vehicleListQuery({
      page: "2",
      sort: "current_mileage",
      order: "desc",
      status: "BLOCKED,INACTIVE,QUEBRADO",
      branchId: ["018f0000-0000-7000-8000-0000000000b1", "nao-e-uuid"],
    });

    expect(query).toEqual({
      sort: "current_mileage",
      order: "desc",
      status: "BLOCKED,INACTIVE",
      branchId: "018f0000-0000-7000-8000-0000000000b1",
    });
  });

  it("never forwards a column the API does not order by", () => {
    expect(vehicleListQuery({ sort: "renavam" })).toEqual({});
  });

  it("forwards the checklist facets under the API's names", () => {
    expect(
      checklistListQuery({
        overall_condition: "rejected",
        vehicleId: "018f0000-0000-7000-8000-0000000000c1",
      }),
    ).toEqual({
      overall_condition: "rejected",
      vehicleId: "018f0000-0000-7000-8000-0000000000c1",
    });
  });
});

describe("the cards", () => {
  it("read the API's tally over the company, not the page", () => {
    const data = vehicleStatsData(
      {
        total: 40,
        statusCounts: { ACTIVE: 30, INACTIVE: 4, BLOCKED: 2, IN_ROUTE: 4 },
      },
      // The pager total (status filter applied) is not the cards' base.
      2,
    );

    expect(data).toEqual({
      totalVehicles: 40,
      activeVehicles: 30,
      inRoute: 4,
      outOfOperation: 6,
    });
    expect(asShare(data.activeVehicles, data.totalVehicles)).toBe("30 (75%)");
  });

  it("say “—” instead of a confident zero when the tally did not come", () => {
    const data = vehicleStatsData(undefined, 12);

    expect(data.totalVehicles).toBe(12);
    expect(asShare(data.activeVehicles, data.totalVehicles)).toBe("—");
  });

  it("count checklists by condition from the server", () => {
    expect(
      checklistStatsData({
        total: 12,
        approved: 4,
        approvedWithRestrictions: 4,
        rejected: 4,
      }),
    ).toEqual({
      total: 12,
      approved: 4,
      approvedWithRestrictions: 4,
      rejected: 4,
    });
  });
});

/**
 * The API's keys, read from its source so the two cannot drift. Skipped,
 * and said so in the title, when the sibling repository is not checked out.
 */
const API_ROOT = join(process.cwd(), "..", "trajetto-api", "src", "modules");

function apiKeys(file: string, constant: string): string[] {
  const source = readFileSync(join(API_ROOT, file), "utf8");
  const block = new RegExp(
    `const ${constant} = \\[([\\s\\S]*?)\\] as const`,
  ).exec(source);

  if (!block) throw new Error(`${constant} not found in ${file}`);

  return [...block[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

const hasApi = existsSync(API_ROOT);

describe.skipIf(!hasApi)(
  `the web specs match the API's lists${hasApi ? "" : " — skipped: ../trajetto-api is not checked out"}`,
  () => {
    it("vehicles: the same sort keys", () => {
      expect([...VEHICLE_TABLE.sortable].sort()).toEqual(
        apiKeys(
          "vehicle/usecases/list-vehicle/vehicle-list.ts",
          "VEHICLE_SORT_KEYS",
        ).sort(),
      );
      expect(VEHICLE_TABLE.facets.status.values).toEqual([
        "ACTIVE",
        "INACTIVE",
        "BLOCKED",
        "IN_ROUTE",
      ]);
    });

    it("vehicle types: the same sort keys", () => {
      expect([...VEHICLE_TYPE_TABLE.sortable].sort()).toEqual(
        apiKeys(
          "vehicle-type/usecases/list-vehicle-type/vehicle-type-list.ts",
          "VEHICLE_TYPE_SORT_KEYS",
        ).sort(),
      );
    });

    it("checklists: the same sort keys and conditions", () => {
      const file =
        "vehicle-checklist/usecases/list-vehicle-checklist/checklist-list.ts";

      expect([...CHECKLIST_TABLE.sortable].sort()).toEqual(
        apiKeys(file, "CHECKLIST_SORT_KEYS").sort(),
      );
      expect(CHECKLIST_TABLE.facets.overall_condition.values).toEqual(
        apiKeys(file, "CHECKLIST_CONDITIONS"),
      );
    });
  },
);
