import { resolve } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import { inTimeZone } from "./helpers/in-time-zone";

/**
 * A fleet day in a DatePickerField without `dateOnly` (service orders,
 * fuelings, kanban cards).
 *
 * Those fields send the browser's local midnight, but an API client's
 * "YYYY-MM-DD" is stored as 00:00 UTC. The picker read that instant in the
 * browser's zone, so in Brazil a service order of the 17th opened its edit
 * form on the 16th — while its table, which reads the picked day, said 17.
 * An instant at any other time is still read in the browser's zone.
 *
 * Each zone is its own Node process (see `inTimeZone`): a vitest worker
 * cannot change its zone.
 */
const HELPERS = {
  day: resolve(
    __dirname,
    "../../src/app/(protected)/_components/shared/custom/date-picker-field/helpers.ts",
  ),
};

interface Reading {
  zone: string;
  utcMidnight: string;
  localMidnight: string;
  afternoon: string;
  untouched: string;
}

const READ = `
  const pad = (value) => String(value).padStart(2, "0");
  const shown = (date) => pad(date.getDate()) + "/" + pad(date.getMonth() + 1) + " " + pad(date.getHours()) + ":" + pad(date.getMinutes());

  return {
    zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    utcMidnight: shown(day.parseDateValue("2026-09-17T00:00:00.000Z", false)),
    localMidnight: shown(day.parseDateValue(new Date(2026, 8, 17).toISOString(), false)),
    afternoon: shown(day.parseDateValue("2026-09-17T15:00:00.000Z", false)),
    untouched: day.serializeDate(day.parseDateValue("2026-09-17", false), false),
  };
`;

const ZONES = [
  {
    zone: "America/Sao_Paulo",
    afternoon: "17/09 12:00",
    untouched: "2026-09-17T03:00:00.000Z",
  },
  {
    zone: "America/Rio_Branco",
    afternoon: "17/09 10:00",
    untouched: "2026-09-17T05:00:00.000Z",
  },
  {
    zone: "UTC",
    afternoon: "17/09 15:00",
    untouched: "2026-09-17T00:00:00.000Z",
  },
  {
    zone: "Asia/Tokyo",
    afternoon: "18/09 00:00",
    untouched: "2026-09-16T15:00:00.000Z",
  },
];

const readings = new Map<string, Reading>();

beforeAll(async () => {
  await Promise.all(
    ZONES.map(async ({ zone }) => {
      readings.set(zone, await inTimeZone<Reading>(zone, HELPERS, READ));
    }),
  );
}, 60_000);

describe("the date field without dateOnly, in real time zones", () => {
  it.each(ZONES)("$zone: the process really runs in that zone", ({ zone }) => {
    expect(readings.get(zone)!.zone).toBe(zone);
  });

  it.each(ZONES)(
    "$zone: a day stored as 00:00 UTC opens on that same day",
    ({ zone }) => {
      expect(readings.get(zone)!.utcMidnight).toBe("17/09 00:00");
    },
  );

  it.each(ZONES)(
    "$zone: the local midnight the field sends comes back on the same day",
    ({ zone }) => {
      expect(readings.get(zone)!.localMidnight).toBe("17/09 00:00");
    },
  );

  it.each(ZONES)(
    "$zone: an instant at another hour stays in the browser's zone ($afternoon)",
    ({ zone, afternoon }) => {
      expect(readings.get(zone)!.afternoon).toBe(afternoon);
    },
  );

  it.each(ZONES)(
    "$zone: the picked day still goes out as local midnight ($untouched)",
    ({ zone, untouched }) => {
      expect(readings.get(zone)!.untouched).toBe(untouched);
    },
  );
});
