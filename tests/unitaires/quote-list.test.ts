import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  QUOTE_FLEET_SIZES,
  QUOTE_STATUSES,
  QUOTE_TABLE,
  quoteListQuery,
} from "@/app/(protected)/_components/admin/quote/lib/server-table";
import {
  countWithShare,
  quoteStatsData,
} from "@/app/(protected)/_components/admin/quote/lib/stats-data";
import { quoteSchema } from "@/schemas/quote-schema";

/**
 * Orçamentos (/admin) on the server-side list contract (decision 8.8): the
 * stage cards came from the ten rows of the page, and the filters narrowed
 * that page.
 */

describe("the cards read the server's numbers only", () => {
  it("maps searchMeta and takes a stage's share over every stage", () => {
    // "Pendente" picked: the total follows the filter, the stage cards not.
    const data = quoteStatsData({
      total: 3,
      pending: 3,
      contacted: 1,
      closed: 2,
      converted: 1,
    });

    expect(data).toEqual({
      totalQuotes: 3,
      pendingQuotes: 3,
      contactedQuotes: 1,
      convertedQuotes: 1,
      stageBase: 7,
    });
    expect(countWithShare(data.contactedQuotes, data.stageBase)).toBe(
      "1 (14%)",
    );
    expect(countWithShare(data.pendingQuotes, data.stageBase)).toBe("3 (43%)");
  });

  it("shows zeros while the list failed", () => {
    expect(quoteStatsData(undefined)).toEqual({
      totalQuotes: 0,
      pendingQuotes: 0,
      contactedQuotes: 0,
      convertedQuotes: 0,
      stageBase: 0,
    });
    expect(countWithShare(0, 0)).toBe("0");
  });
});

describe("the table's server contract", () => {
  it("forwards the order and the facets, and drops what the API refuses", () => {
    expect(
      quoteListQuery({
        sort: "contacted_at",
        order: "desc",
        status: "PENDING,LOST",
        fleet_size: "101+",
      }),
    ).toEqual({
      sort: "contacted_at",
      order: "desc",
      status: "PENDING",
      fleet_size: "101+",
    });
  });

  it("offers the fleet sizes the public form sends", () => {
    // The form's options live in the quote schema; the filter must know them all.
    expect([...QUOTE_FLEET_SIZES]).toEqual([
      ...quoteSchema.shape.fleet_size.options,
    ]);
  });
});

const API_QUOTE_LIST = join(
  process.cwd(),
  "..",
  "trajetto-api",
  "src",
  "modules",
  "quote",
  "usecases",
  "list-quotes",
  "quote-list.ts",
);

const hasApi = existsSync(API_QUOTE_LIST);

function apiList(constant: string): string[] {
  const source = readFileSync(API_QUOTE_LIST, "utf8");
  const block = new RegExp(
    `const ${constant} = \\[([\\s\\S]*?)\\] as const`,
  ).exec(source);

  if (!block) throw new Error(`${constant} not found in quote-list.ts`);

  return [...block[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

describe.skipIf(!hasApi)(
  `the web spec matches the API's list${hasApi ? "" : " — skipped: ../trajetto-api is not checked out"}`,
  () => {
    it("the same sort keys, stages and fleet sizes", () => {
      expect([...QUOTE_TABLE.sortable].sort()).toEqual(
        apiList("QUOTE_SORT_KEYS").sort(),
      );
      expect([...QUOTE_STATUSES]).toEqual(apiList("QUOTE_STATUSES"));
      expect([...QUOTE_FLEET_SIZES]).toEqual(apiList("QUOTE_FLEET_SIZES"));
    });
  },
);
