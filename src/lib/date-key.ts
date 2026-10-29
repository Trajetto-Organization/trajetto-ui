/**
 * Civil days as the wire speaks them: "YYYY-MM-DD", no zone, no instant.
 *
 * A period filter sends the days the person picked, and the API resolves
 * them in the company's zone. Turning a key into a `Date` and back through
 * the browser's zone is how a day slides to the previous one, so nothing
 * here does Date arithmetic in the local zone: the checks run in UTC, where
 * a day is always 24 hours, and the labels are cut from the string.
 *
 * No directive: server components, actions and client fields all read it.
 */

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

const DAY_MS = 24 * 60 * 60 * 1000;

/** A real calendar day as "YYYY-MM-DD" (not 2026-02-30). */
function isDateKey(value: string | undefined | null): value is string {
  const match = value ? DATE_KEY.exec(value) : null;

  if (!match) return false;

  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ];
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Days from `from` to `to`, both included (1 for the same day). */
function daysInclusive(from: string, to: string): number {
  return (
    Math.round(
      (Date.parse(`${to}T00:00:00.000Z`) -
        Date.parse(`${from}T00:00:00.000Z`)) /
        DAY_MS,
    ) + 1
  );
}

/** The key `days` after (or before, when negative) `key`. */
function shiftDateKey(key: string, days: number): string {
  return new Date(Date.parse(`${key}T00:00:00.000Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/**
 * The day an instant falls on in a zone (the company's): "YYYY-MM-DD".
 * An unknown or absent zone reads the browser's.
 */
function dayKeyIn(instant: Date, timeZone?: string): string {
  const format = (zone: string | undefined) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(instant);

  let parts: Intl.DateTimeFormatPart[];

  try {
    parts = format(timeZone || undefined);
  } catch {
    // RangeError: a zone this browser does not know.
    parts = format(undefined);
  }

  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

/** "28/10/2026" from "2026-10-28", without any zone moving it. */
function formatDateKey(key: string): string {
  const [year, month, day] = key.split("-");

  return `${day}/${month}/${year}`;
}

/**
 * A range as the toolbars show it: "01/10/2026 a 28/10/2026", or the one
 * day when both ends are the same.
 */
function formatDateKeyRange(from: string, to: string): string {
  return from === to
    ? formatDateKey(from)
    : `${formatDateKey(from)} a ${formatDateKey(to)}`;
}

export {
  dayKeyIn,
  daysInclusive,
  formatDateKey,
  formatDateKeyRange,
  isDateKey,
  shiftDateKey,
};
