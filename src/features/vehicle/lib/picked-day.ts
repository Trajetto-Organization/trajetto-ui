/**
 * Fleet timestamps that mean a DAY: a vehicle's acquisition and last
 * maintenance, a checklist's date. No directive and no imports: pure, and
 * loadable by a plain Node process in another zone, which is how the tests
 * check it (tests/unitaires/helpers/in-time-zone).
 *
 * The date picker stores the user's local midnight (03:00 UTC in São Paulo)
 * and the app the moment of the inspection: both read right in the browser's
 * zone. An API client's "YYYY-MM-DD" is stored as 00:00 UTC, which no
 * Brazilian midnight is (the zones are UTC-2 to UTC-5): read in the browser's
 * zone it showed the previous day, so it is read as the UTC day it is. The
 * API's exports, dashboard and "not in the future" check apply the same rule
 * (trajetto-api shared/vehicle/record-dates pickedDayKey).
 */
const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(value: string | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

const isUtcMidnight = (date: Date): boolean => date.getTime() % DAY_MS === 0;

const pad = (value: number): string => String(value).padStart(2, "0");

/** "2026-09-17" for the day a stored value means; null for nothing or garbage. */
function pickedDayKey(value: string | Date | null | undefined): string | null {
  const date = toDate(value);

  if (!date) return null;

  return isUtcMidnight(date)
    ? `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
    : `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "17/09/2026"; "N/A" for nothing or garbage. */
function formatPickedDay(value: string | Date | null | undefined): string {
  const key = pickedDayKey(value);

  if (!key) return "N/A";

  const [year, month, day] = key.split("-");

  return `${day}/${month}/${year}`;
}

/**
 * A stored day as the date picker should open on it: a 00:00 UTC value
 * opens on local midnight of that same day (the picker reads the browser's
 * zone and showed the day before). Anything else is already an instant the
 * picker reads right, and is handed over untouched.
 */
function asPickerDay(value: string | Date | null | undefined): string {
  const date = toDate(value);

  if (!date) return "";
  if (!isUtcMidnight(date))
    return typeof value === "string" ? value : date.toISOString();

  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  ).toISOString();
}

/** Whether the picked day differs from the stored one (the edit's dirty check). */
function pickedDayChanged(
  original: string | Date | null | undefined,
  current: string | Date | null | undefined,
): boolean {
  return pickedDayKey(original) !== pickedDayKey(current);
}

/**
 * What an edit sends for a day field: the stored value itself while the day
 * is unchanged. The picker speaks local midnight: a date-only value it
 * opened through asPickerDay, or the same day picked again on an inspection
 * made at 14:32, would go out as another instant of that day. The record
 * would move in time on an edit that did not change its day, and the API
 * checks a moved date against the vehicle's odometer history.
 *
 * A changed day keeps the time of day the record had: the 18:00 inspection
 * moved to the day before goes out at 18:00 of that day, not at its
 * midnight, where it sat before every record of the day (a 10:00 fueling
 * with a lower km then looked like it came after it, and the API refused
 * the move as out of order). A date-only value has no time of day: the
 * picked day goes out as picked.
 */
function dayToSend(
  stored: string | Date | null | undefined,
  picked: string | null | undefined,
): string {
  if (stored && picked && !pickedDayChanged(stored, picked)) {
    return typeof stored === "string" ? stored : stored.toISOString();
  }

  const storedDate = toDate(stored);
  const pickedKey = pickedDayKey(picked);

  if (!storedDate || !pickedKey || isUtcMidnight(storedDate))
    return picked ?? "";

  const [year, month, day] = pickedKey.split("-").map(Number);

  return new Date(
    year,
    month - 1,
    day,
    storedDate.getHours(),
    storedDate.getMinutes(),
    storedDate.getSeconds(),
    storedDate.getMilliseconds(),
  ).toISOString();
}

export {
  asPickerDay,
  dayToSend,
  formatPickedDay,
  pickedDayChanged,
  pickedDayKey,
};
