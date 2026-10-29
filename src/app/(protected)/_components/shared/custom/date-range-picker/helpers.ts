import { daysInclusive, isDateKey } from "@/lib/date-key";

import { parseDateValue, serializeDate } from "../date-picker-field/helpers";

/**
 * The range picker's rules, apart from the widget so a test decides them.
 *
 * The range travels as two civil-day keys ("YYYY-MM-DD"); the calendar
 * speaks local-midnight `Date`s. The conversions are the date field's own
 * (`dateOnly`), which never pass through UTC — the day picked is the day
 * sent, in any zone.
 */

interface DateKeyRange {
  from?: string;
  to?: string;
}

/** The calendar's day for a key, or undefined for an absent/invalid one. */
function keyToDate(key: string | undefined): Date | undefined {
  if (!isDateKey(key)) return undefined;

  return parseDateValue(key, true) ?? undefined;
}

/** The key of a day the calendar handed over. */
function dateToKey(date: Date): string {
  return serializeDate(date, true);
}

/**
 * The range after a click on `day`.
 *
 * - nothing picked yet, or a complete range: the click starts a new one.
 *   react-day-picker v8 would instead move the nearer end of a complete
 *   range, or clear it when its first day is clicked — a third click that
 *   shrinks a range nobody meant to shrink.
 * - only the first day picked: the click closes the range; a day before the
 *   first one becomes the start, so the order never has to be fixed by hand.
 *   The same day twice is a one-day range.
 */
function pickRangeDay(range: DateKeyRange, day: string): DateKeyRange {
  const { from, to } = range;

  if (!from || to) return { from: day, to: undefined };

  return day < from ? { from: day, to: from } : { from, to: day };
}

/** The first day of the month of a key, as a calendar date. */
function monthOf(key: string): Date {
  const [year, month] = key.split("-").map(Number);

  return new Date(year, month - 1, 1);
}

/** `month` moved by `count` months (first day). */
function addMonthsTo(month: Date, count: number): Date {
  return new Date(month.getFullYear(), month.getMonth() + count, 1);
}

/**
 * The LAST month on screen when the panel opens: the one holding the
 * range's last day (or the latest day that may be picked, or today), so the
 * end of the range is in view and nothing past the bound is. With two
 * months the one before sits on its left.
 */
function lastShownMonth(range: DateKeyRange, fallbackKey: string): Date {
  const anchor = isDateKey(range.to)
    ? range.to
    : isDateKey(range.from)
      ? range.from
      : fallbackKey;

  return monthOf(anchor);
}

/**
 * Keeps the months on screen inside the bounds: the last one never past the
 * month of `maxDate`, the first never before the month of `minDate`.
 */
function clampLastShownMonth(
  last: Date,
  months: number,
  minDate?: string,
  maxDate?: string,
): Date {
  let clamped = last;

  if (isDateKey(maxDate) && clamped > monthOf(maxDate)) {
    clamped = monthOf(maxDate);
  }

  if (isDateKey(minDate)) {
    const earliestLast = addMonthsTo(monthOf(minDate), months - 1);

    if (clamped < earliestLast) clamped = earliestLast;
  }

  return clamped;
}

/** How many days the range covers, both ends included; null while open. */
function rangeLength(range: DateKeyRange): number | null {
  return isDateKey(range.from) && isDateKey(range.to)
    ? daysInclusive(range.from, range.to)
    : null;
}

export {
  addMonthsTo,
  clampLastShownMonth,
  dateToKey,
  keyToDate,
  lastShownMonth,
  monthOf,
  pickRangeDay,
  rangeLength,
  type DateKeyRange,
};
