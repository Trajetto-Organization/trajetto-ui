import { format, isValid, parseISO } from "date-fns";

/**
 * Reading and writing the DatePickerField's value.
 *
 * Two kinds of value go through this field. The legacy fleet forms send an
 * instant (`toISOString()` of local midnight) and their API parses it as one;
 * that stays the default, because fifty-five forms and their schemas depend
 * on it.
 *
 * A DATE-ONLY value (decision 1.3: a delivery's expected date, a route's day)
 * is a civil day, stored as midnight UTC and sent as `YYYY-MM-DD`. Parsed as
 * an instant in the browser's zone, "2026-09-17T00:00:00Z" became 16/09 at
 * 21:00 in São Paulo — the route of the 17th opened its edit form on the 16th.
 * `dateOnly` reads the UTC calendar day and writes the day itself.
 *
 * Without `dateOnly`, an instant at exactly 00:00 UTC is still read as that
 * UTC day. It is how a fleet day arrives from an API client ("YYYY-MM-DD"),
 * and no Brazilian local midnight lands there (UTC-2 to UTC-5): read in the
 * browser's zone, a service order or a fueling of the 17th opened its edit
 * form on the 16th. Same rule as features/vehicle/lib/picked-day and the
 * API's shared/vehicle/record-dates pickedDayKey.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateValue(
  value: string | undefined | null,
  dateOnly = false,
): Date | null {
  if (!value) return null;

  if (dateOnly) {
    const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());

    if (day) {
      const parsed = new Date(
        Number(day[1]),
        Number(day[2]) - 1,
        Number(day[3]),
      );

      return isValid(parsed) ? parsed : null;
    }

    const instant = new Date(value);

    if (Number.isNaN(instant.getTime())) return null;

    // The calendar day the value names in UTC, as a local date for the picker.
    return new Date(
      instant.getUTCFullYear(),
      instant.getUTCMonth(),
      instant.getUTCDate(),
    );
  }

  try {
    const parsed = parseISO(value);

    if (!isValid(parsed)) return null;

    // A picked day stored as 00:00 UTC: the day it names, at local midnight.
    if (parsed.getTime() % DAY_MS === 0) {
      return new Date(
        parsed.getUTCFullYear(),
        parsed.getUTCMonth(),
        parsed.getUTCDate(),
      );
    }

    return parsed;
  } catch {
    return null;
  }
}

/** What the field hands to `onChange` for a picked day. */
function serializeDate(date: Date, dateOnly = false): string {
  return dateOnly ? format(date, "yyyy-MM-dd") : date.toISOString();
}

/** How far back the dropdown reaches: birth dates and old vehicles. */
const YEARS_BACK = 100;

/** How far ahead, for a field that takes future dates (due dates, CNH). */
const YEARS_AHEAD = 5;

/**
 * The years the dropdown offers, newest first. It used to stop at the
 * current year even on fields that take future dates, so next year's due
 * date could only be reached month by month, and a stored later year opened
 * with the dropdown blank. The year on screen is always listed.
 */
function pickerYears(
  currentYear: number,
  allowFutureDates: boolean,
  shownYear?: number,
): number[] {
  const newest = currentYear + (allowFutureDates ? YEARS_AHEAD : 0);
  const years: number[] = [];

  for (let year = newest; year >= currentYear - YEARS_BACK; year -= 1) {
    years.push(year);
  }

  if (
    shownYear !== undefined &&
    Number.isInteger(shownYear) &&
    !years.includes(shownYear)
  ) {
    years.push(shownYear);
    years.sort((a, b) => b - a);
  }

  return years;
}

export { parseDateValue, pickerYears, serializeDate };
