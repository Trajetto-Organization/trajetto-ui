import {
  assertServerTableSpec,
  serverTableQuery,
  type ServerTableSpec,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import { PAUSE_FLAG_CODES } from "./types";

/**
 * The pause report on the server-side table contract (decision 8.8): the
 * API computes each driver-day, so it also filters and counts them; nothing
 * here filters the loaded page. No column sorts: the report's order is fixed
 * (newest day first, then the driver's name), computed with the day itself.
 *
 * No directive: the server component that asks the API imports this too.
 */
const PAUSE_TABLE: ServerTableSpec = assertServerTableSpec({
  sortable: [],
  facets: {
    driverName: { param: "driverId", values: "uuid" },
    flags: { param: "flag", values: PAUSE_FLAG_CODES },
  },
});

/** The longest period the API answers, inclusive (PAUSE_REPORT_MAX_DAYS). */
const PAUSE_REPORT_MAX_DAYS = 31;

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The years the API answers (PAUSE_REPORT_YEARS); outside, its default week. */
const PAUSE_REPORT_YEARS = { first: 2000, last: 2099 } as const;

/**
 * A real calendar day as "YYYY-MM-DD" in the years the API answers, or
 * undefined. 2026-02-30 is not one, and neither is 9999-12-31 (the API
 * refuses it; the URL falls back to the default week instead of an error).
 */
function readDayParam(
  value: string | string[] | undefined | null,
): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;

  if (typeof raw !== "string") return undefined;

  const match = DAY_KEY.exec(raw.trim());

  if (!match) return undefined;

  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ];

  if (year < PAUSE_REPORT_YEARS.first || year > PAUSE_REPORT_YEARS.last)
    return undefined;

  const date = new Date(Date.UTC(year, month - 1, day));

  const real =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return real ? match[0] : undefined;
}

/** Days from `from` to `to`, inclusive, for two valid keys. */
function daysBetween(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00.000Z`);
  const end = Date.parse(`${to}T00:00:00.000Z`);

  return Math.round((end - start) / 86_400_000) + 1;
}

/**
 * Why a period cannot be asked for, in the words the API would use, or null.
 * Checked before the URL changes, so a picked period never becomes a 400.
 */
function rangeIssue(
  from: string | undefined,
  to: string | undefined,
): string | null {
  if (!from || !to) return null;

  if (!readDayParam(from) || !readDayParam(to)) {
    return `Escolha datas entre ${PAUSE_REPORT_YEARS.first} e ${PAUSE_REPORT_YEARS.last}.`;
  }

  if (from > to) return "A data inicial deve ser anterior ou igual à final.";

  if (daysBetween(from, to) > PAUSE_REPORT_MAX_DAYS) {
    return `O período pode ter no máximo ${PAUSE_REPORT_MAX_DAYS} dias.`;
  }

  return null;
}

type ParamSource = Record<string, string | string[] | undefined>;

/**
 * The report's query, read from the page's searchParams: the period (only
 * valid days, and only a period the API accepts: otherwise its default week),
 * the filters the spec declares, and the page.
 */
function pauseReportQuery(searchParams: ParamSource): Record<string, string> {
  const from = readDayParam(searchParams.from);
  const to = readDayParam(searchParams.to);

  const period = rangeIssue(from, to) === null ? { from, to } : {};

  const page = Number(
    Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page,
  );
  const pageSize = Number(
    Array.isArray(searchParams.pageSize)
      ? searchParams.pageSize[0]
      : searchParams.pageSize,
  );

  return {
    ...(period.from && { from: period.from }),
    ...(period.to && { to: period.to }),
    ...serverTableQuery(searchParams, PAUSE_TABLE),
    page: String(Number.isInteger(page) && page >= 1 ? page : 1),
    pageSize: String(
      Number.isInteger(pageSize) && pageSize >= 1 && pageSize <= 100
        ? pageSize
        : 10,
    ),
  };
}

export {
  PAUSE_REPORT_MAX_DAYS,
  PAUSE_REPORT_YEARS,
  PAUSE_TABLE,
  daysBetween,
  pauseReportQuery,
  rangeIssue,
  readDayParam,
};
