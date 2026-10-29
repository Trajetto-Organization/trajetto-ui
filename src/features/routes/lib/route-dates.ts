/**
 * The route's two kinds of time, each read the way it is stored
 * (decisions 1.3 and 1.4):
 *
 * - the DAY is a civil date, served as UTC midnight: shown with
 *   `formatDateOnly` (UTC, no hour) and picked as "YYYY-MM-DD";
 * - the planned DEPARTURE and RETURN are instants: shown on the browser's
 *   clock.
 */

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Local midnight of the route's day, for the calendars that bound the
 * planned times to it. Undefined for an empty or malformed key, which leaves
 * the calendar unbounded rather than broken.
 */
function routeDayAsLocalDate(key: string | null | undefined): Date | undefined {
  const match = DATE_KEY.exec((key ?? "").trim());

  if (!match) return undefined;

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );

  return Number.isNaN(date.getTime()) ? undefined : date;
}

const pad = (value: number): string => String(value).padStart(2, "0");

/** Wall time in `timeZone` minus UTC, in ms, at an instant. Throws on an unknown zone. */
function zoneOffsetMs(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));

  const part = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((entry) => entry.type === type)?.value ?? 0);

  const wall = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour") % 24,
    part("minute"),
    part("second"),
  );

  return wall - Math.floor(instant / 1000) * 1000;
}

/** The instant the civil day [y, m, d] starts in `timeZone`. */
function dayStartIn(
  year: number,
  month: number,
  day: number,
  timeZone: string,
): number {
  const midnightAsUtc = Date.UTC(year, month - 1, day);

  // A second pass settles a zone whose offset changes that night.
  const first = midnightAsUtc - zoneOffsetMs(midnightAsUtc, timeZone);

  return midnightAsUtc - zoneOffsetMs(first, timeZone);
}

/** "YYYY-MM-DD" of an instant on a zone's calendar. */
function dayKeyInZone(instant: number, timeZone: string): string {
  const shifted = new Date(instant + zoneOffsetMs(instant, timeZone));

  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/**
 * The days of the VIEWER's calendar that the company's civil day `key`
 * covers: the same day when both zones agree, two days when they differ.
 * The route's day is the company's (decision 1.1), while the date-time
 * pickers show the viewer's clock; a MASTER in São Paulo planning for a
 * company in Rio Branco has the route's day from 02:00 of the 17th to 01:59
 * of the 18th on their own screen.
 *
 * Undefined for a malformed key or an unknown zone.
 */
function companyDayOnViewerCalendar(
  key: string | null | undefined,
  companyTimeZone: string,
  viewerTimeZone: string,
): { first: string; last: string } | undefined {
  const match = DATE_KEY.exec((key ?? "").trim());

  if (!match) return undefined;

  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ];

  try {
    const start = dayStartIn(year, month, day, companyTimeZone);
    const next = dayStartIn(year, month, day + 1, companyTimeZone);

    return {
      first: dayKeyInZone(start, viewerTimeZone),
      last: dayKeyInZone(next - 1, viewerTimeZone),
    };
  } catch {
    // An unknown zone name: no bounds rather than wrong ones.
    return undefined;
  }
}

/**
 * The first and last days the planned-time pickers offer, as local
 * midnights: every day of the viewer's calendar the route's day touches in
 * the company's zone. The hours outside it are left to the shared day rule,
 * which refuses them with its own sentence, as the API does.
 *
 * Bounding by the route's day on the viewer's calendar blocked 23:00 of a
 * company west of the viewer (the next day locally, valid for the API) and
 * offered the viewer's first hours of the day, which belong to the previous
 * day there.
 */
function routeDayPickerBounds(
  key: string | null | undefined,
  companyTimeZone: string | null | undefined,
): { fromDate: Date | undefined; toDate: Date | undefined } {
  const viewerTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const span = companyTimeZone
    ? companyDayOnViewerCalendar(key, companyTimeZone, viewerTimeZone)
    : undefined;

  if (!span) {
    const day = routeDayAsLocalDate(key);

    return { fromDate: day, toDate: day };
  }

  return {
    fromDate: routeDayAsLocalDate(span.first),
    toDate: routeDayAsLocalDate(span.last),
  };
}

/** "08:00" on the browser's clock, or null for an empty/invalid instant. */
function formatClock(instant: string | null | undefined): string | null {
  if (!instant) return null;

  const date = new Date(instant);

  if (Number.isNaN(date.getTime())) return null;

  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * The planned window as one short phrase: "08:00 – 18:30", "saída 08:00",
 * "retorno 18:30", or null when nothing was planned. A return on another
 * day than the departure keeps its date ("08:00 – 18/09 02:00").
 */
function formatPlannedWindow(
  departure: string | null | undefined,
  arrival: string | null | undefined,
): string | null {
  const out = formatClock(departure);
  const back = formatClock(arrival);

  if (!out && !back) return null;
  if (out && !back) return `saída ${out}`;
  if (!out && back) return `retorno ${back}`;

  const start = new Date(departure!);
  const end = new Date(arrival!);

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  return sameDay
    ? `${out} – ${back}`
    : `${out} – ${pad(end.getDate())}/${pad(end.getMonth() + 1)} ${back}`;
}

export {
  companyDayOnViewerCalendar,
  formatClock,
  formatPlannedWindow,
  routeDayAsLocalDate,
  routeDayPickerBounds,
};
