import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  PAUSE_FLAG_LABELS,
  formatClock,
  formatDayAndClock,
  formatMinutes,
  formatWorkdayDay,
  pauseLine,
} from "@/features/driver-pauses/lib/pause-format";
import {
  PAUSE_TABLE,
  pauseReportQuery,
  rangeIssue,
  readDayParam,
} from "@/features/driver-pauses/server-table";
import {
  PAUSE_FLAG_CODES,
  type ReportPauseEntry,
} from "@/features/driver-pauses/types";
import { canAccessPath, type RouteAccessContext } from "@/lib/route-access";

/**
 * The pause report's wording and query (decision 6.1). Hours are the
 * company's (the report's `timeZone`), whatever zone the browser is in; the
 * period and filters that reach the API are only the ones it accepts.
 */

const SP = "America/Sao_Paulo";
const RIO_BRANCO = "America/Rio_Branco";

const API_RULES = resolve(
  process.cwd(),
  "..",
  "trajetto-api/src/modules/driver-pause/rules/pause-report-rules.ts",
);

function entry(overrides: Partial<ReportPauseEntry>): ReportPauseEntry {
  return {
    id: "p1",
    kind: "MEAL",
    status: "ENDED",
    started_at: "2026-09-28T15:02:00.000Z",
    ended_at: "2026-09-28T16:10:00.000Z",
    duration_minutes: 68,
    note: null,
    routeId: null,
    ...overrides,
  };
}

describe("the report's wording", () => {
  it("says durations the way the API's alerts say them", () => {
    expect(formatMinutes(40)).toBe("40 min");
    expect(formatMinutes(60)).toBe("1 h");
    expect(formatMinutes(68)).toBe("1 h 08 min");
    expect(formatMinutes(null)).toBe("—");
  });

  it("reads hours in the company's zone, not the browser's", () => {
    // 15:02 UTC is 12:02 in São Paulo and 10:02 in Rio Branco.
    expect(formatClock("2026-09-28T15:02:00.000Z", SP)).toBe("12:02");
    expect(formatClock("2026-09-28T15:02:00.000Z", RIO_BRANCO)).toBe("10:02");
    expect(formatDayAndClock("2026-09-29T01:30:00.000Z", SP)).toBe(
      "28/09 às 22:30",
    );
  });

  it("reads the workday as a civil day, never shifted by a zone", () => {
    expect(formatWorkdayDay("2026-09-28")).toMatch(/^28\/09\/2026 \(seg\.?\)$/);
  });

  it("words each state of a pause", () => {
    expect(pauseLine(entry({}), SP)).toBe("Refeição 12:02–13:10 · 1 h 08 min");

    expect(
      pauseLine(
        entry({
          kind: "REST",
          status: "ONGOING",
          ended_at: null,
          duration_minutes: 20,
        }),
        SP,
      ),
    ).toBe("Descanso desde 12:02 · em andamento (20 min)");

    expect(
      pauseLine(
        entry({ status: "NOT_ENDED", ended_at: null, duration_minutes: null }),
        SP,
      ),
    ).toBe("Refeição às 12:02 · não encerrada");

    // Across the company's midnight, the end names its day.
    expect(
      pauseLine(
        entry({
          kind: "OTHER",
          started_at: "2026-09-29T02:40:00.000Z",
          ended_at: "2026-09-29T03:20:00.000Z",
          duration_minutes: 40,
        }),
        SP,
      ),
    ).toBe("Outra 23:40–29/09 às 00:20 · 40 min");

    // Closed only the next morning: shown, but out of every sum.
    expect(
      pauseLine(
        entry({
          status: "TOO_LONG",
          started_at: "2026-09-20T15:00:00.000Z",
          ended_at: "2026-09-21T10:50:00.000Z",
          duration_minutes: 1190,
        }),
        SP,
      ),
    ).toBe("Refeição 12:00–21/09 às 07:50 · 19 h 50 min · fora dos cálculos");
  });

  it("labels every alert the API can send", () => {
    expect(Object.keys(PAUSE_FLAG_LABELS).sort()).toEqual(
      [...PAUSE_FLAG_CODES].sort(),
    );
  });

  // The web list mirrors the API's: an alert added there and not here was
  // refused by the filter's URL reader and shown as a bare code.
  it.skipIf(!existsSync(API_RULES))(
    "mirrors the API's alert codes, in its order",
    () => {
      const source = readFileSync(API_RULES, "utf8");
      const block =
        /const PAUSE_FLAG_CODES = \[([^\]]*)\]/.exec(source)?.[1] ?? "";
      const apiCodes = [...block.matchAll(/"([A-Z_]+)"/g)].map(
        (match) => match[1],
      );

      expect(apiCodes.length).toBeGreaterThan(0);
      expect([...PAUSE_FLAG_CODES]).toEqual(apiCodes);
    },
  );
});

describe("the report's query", () => {
  it("accepts only real calendar days", () => {
    expect(readDayParam("2026-09-28")).toBe("2026-09-28");
    expect(readDayParam("2026-02-30")).toBeUndefined();
    expect(readDayParam("28/09/2026")).toBeUndefined();
    expect(readDayParam(["2026-09-01", "2026-09-02"])).toBe("2026-09-01");
  });

  it("keeps days outside the years the API answers out of the URL's query", () => {
    // The API refuses them (to=9999-12-31 used to be its 500); the page
    // falls back to the default week instead of showing an error.
    expect(readDayParam("9999-12-31")).toBeUndefined();
    expect(readDayParam("0001-01-01")).toBeUndefined();
    expect(readDayParam("1999-12-31")).toBeUndefined();
    expect(readDayParam("2000-01-01")).toBe("2000-01-01");
    expect(readDayParam("2099-12-31")).toBe("2099-12-31");

    expect(pauseReportQuery({ to: "9999-12-31" })).toEqual({
      page: "1",
      pageSize: "10",
    });
    expect(rangeIssue("2026-09-01", "9999-12-31")).toBe(
      "Escolha datas entre 2000 e 2099.",
    );
  });

  it("refuses an inverted period or one longer than 31 days, like the API", () => {
    expect(rangeIssue("2026-09-01", "2026-10-01")).toBeNull();
    expect(rangeIssue("2026-09-01", "2026-10-02")).toBe(
      "O período pode ter no máximo 31 dias.",
    );
    expect(rangeIssue("2026-09-10", "2026-09-09")).toBe(
      "A data inicial deve ser anterior ou igual à final.",
    );
    expect(rangeIssue(undefined, "2026-09-09")).toBeNull();
  });

  it("forwards the period, the facets and the page, and drops what the API would refuse", () => {
    expect(
      pauseReportQuery({
        from: "2026-09-01",
        to: "2026-09-07",
        driverId: "018f0000-0000-7000-8000-0000000000a1,not-a-uuid",
        flag: "MEAL_SHORT,TIRED",
        page: "2",
        pageSize: "20",
        businessId: "ignored-here",
      }),
    ).toEqual({
      from: "2026-09-01",
      to: "2026-09-07",
      driverId: "018f0000-0000-7000-8000-0000000000a1",
      flag: "MEAL_SHORT",
      page: "2",
      pageSize: "20",
    });

    // An impossible period falls back to the API's default week.
    expect(pauseReportQuery({ from: "2026-09-10", to: "2026-09-01" })).toEqual({
      page: "1",
      pageSize: "10",
    });
  });

  it("opens the page to the key the API asks for, and to no other", () => {
    // The API reads the report with delivery_manage:read only (decision 4.2):
    // a drivers-only profile must neither see the entry nor reach the page.
    const withKeys = (
      permissions: RouteAccessContext["permissions"],
    ): RouteAccessContext => ({
      role: "BUSINESS_USER",
      permissions,
      enabledModules: ["FLEET", "DELIVERIES"],
    });

    expect(
      canAccessPath("/dashboard/driver-pauses", withKeys(["delivery_manage"])),
    ).toBe(true);
    expect(
      canAccessPath("/dashboard/driver-pauses", withKeys(["driver_manage"])),
    ).toBe(false);
    expect(
      canAccessPath("/dashboard/driver-pauses", {
        ...withKeys(["delivery_manage"]),
        enabledModules: ["FLEET"],
      }),
    ).toBe(false);
  });

  it("sorts nothing on the page: the report's order is the API's", () => {
    expect(PAUSE_TABLE.sortable).toEqual([]);
    expect(
      Object.values(PAUSE_TABLE.facets).map((facet) => facet.param),
    ).toEqual(["driverId", "flag"]);
  });
});

describe("the pause type the driver chose (decision 14.4)", () => {
  it("names the company's type beside its legal nature, and the nature alone when they match", () => {
    expect(
      pauseLine(entry({ kind: "REST", occurrence_type_name: "Lanche" }), SP),
    ).toBe("Lanche (Descanso) 12:02–13:10 · 1 h 08 min");
    expect(
      pauseLine(entry({ kind: "MEAL", occurrence_type_name: "Refeição" }), SP),
    ).toBe("Refeição 12:02–13:10 · 1 h 08 min");
    // A report from an API before the pause types.
    expect(
      pauseLine(entry({ kind: "MEAL", occurrence_type_name: undefined }), SP),
    ).toBe("Refeição 12:02–13:10 · 1 h 08 min");
  });
});
