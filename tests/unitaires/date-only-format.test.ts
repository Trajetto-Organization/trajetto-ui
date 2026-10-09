import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { formatDateOnly, localDateKey } from "@/lib/format-values";
import { inTimeZone } from "./helpers/in-time-zone";

/**
 * A civil day (decision 1.3: a delivery's expected date, a route's day, a CNH
 * expiry) formatted as a day, whatever zone the browser is in.
 *
 * The API stores the 17th as `2026-09-17T00:00:00.000Z`. Formatted as an
 * instant in São Paulo that is "16/09/2026 às 21:00" — the evidence in the
 * inventory (DLVB-12, DLVP-ROUTE-4). The zone-specific assertions run in a
 * child Node process started in that zone: a vitest worker cannot change its
 * own (see helpers/in-time-zone).
 */
const FORMAT_VALUES = join(
  __dirname,
  "..",
  "..",
  "src",
  "lib",
  "format-values.ts",
);

describe("formatting a date-only value", () => {
  it("shows the stored day in São Paulo, where the instant formatter shows the day before", async () => {
    const result = await inTimeZone<Record<string, string>>(
      "America/Sao_Paulo",
      { lib: FORMAT_VALUES },
      `return {
        midnightUtc: lib.formatDateOnly("2026-09-17T00:00:00.000Z"),
        localMidnight: lib.formatDateOnly("2026-09-17T03:00:00.000Z"),
        key: lib.formatDateOnly("2026-09-17"),
        date: lib.formatDateOnly(new Date("2026-09-17T00:00:00.000Z")),
        short: lib.formatDateOnly("2026-09-17", { withYear: false }),
        asInstant: lib.formatNotificationDate("2026-09-17T00:00:00.000Z"),
      };`,
    );

    expect(result).toEqual({
      midnightUtc: "17/09/2026",
      localMidnight: "17/09/2026",
      key: "17/09/2026",
      date: "17/09/2026",
      short: "17/09",
      // Why the helper exists: the instant formatter moves the day and
      // invents an hour.
      asInstant: "16/09/2026 às 21:00",
    });
  });

  it("does not move the day east of UTC either", async () => {
    const result = await inTimeZone<string[]>(
      "Asia/Tokyo",
      { lib: FORMAT_VALUES },
      `return [
        lib.formatDateOnly("2026-09-17T00:00:00.000Z"),
        lib.formatDateOnly("2026-09-17"),
      ];`,
    );

    expect(result).toEqual(["17/09/2026", "17/09/2026"]);
  });

  it("says nothing usable for nothing", () => {
    expect(formatDateOnly(null)).toBe("N/A");
    expect(formatDateOnly(undefined)).toBe("N/A");
    expect(formatDateOnly("")).toBe("N/A");
    expect(formatDateOnly("não é data")).toBe("N/A");
    expect(formatDateOnly(null, { fallback: "—" })).toBe("—");
  });
});

describe("today's date-only key on the viewer's calendar", () => {
  it("is still today at 22:30 in São Paulo, when the UTC day is tomorrow", async () => {
    const result = await inTimeZone<{ local: string; utc: string }>(
      "America/Sao_Paulo",
      { lib: FORMAT_VALUES },
      `const lateEvening = new Date("2026-09-18T01:30:00.000Z"); // 22:30 on the 17th
      return {
        local: lib.localDateKey(lateEvening),
        utc: lateEvening.toISOString().slice(0, 10),
      };`,
    );

    expect(result).toEqual({ local: "2026-09-17", utc: "2026-09-18" });
  });

  it("reads the local calendar of a local date", () => {
    expect(localDateKey(new Date(2026, 8, 7))).toBe("2026-09-07");
  });
});
