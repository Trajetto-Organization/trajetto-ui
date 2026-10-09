/**
 * Date-and-time values for the DateTimePickerField (decision 1.4).
 *
 * The person picks a moment on THEIR clock; the API receives an ISO instant
 * with an offset (`toISOString()` of that local value) and refuses a time
 * without one. Displaying goes the other way, in the browser's time zone. No
 * `datetime-local` string ever leaves the component: that format has no
 * offset, and the server would read it in its own zone (UTC in the container).
 */
interface LocalDateTimeParts {
  /** Midnight of the chosen day, local time. */
  date: Date;
  hour: number;
  minute: number;
}

/** The instant a local day + hour + minute names, as ISO with offset (`Z`). */
function toIsoFromLocalParts({
  date,
  hour,
  minute,
}: LocalDateTimeParts): string {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hour,
    minute,
    0,
    0,
  ).toISOString();
}

/**
 * The local day, hour and minute of an ISO value; `null` for an empty or
 * unreadable one. An ISO without offset is refused rather than guessed, for
 * the same reason the API refuses it.
 */
function localPartsFromIso(value?: string | null): LocalDateTimeParts | null {
  if (!value) return null;

  const hasOffset = /(Z|[+-]\d{2}:?\d{2})$/i.test(value.trim());

  if (!hasOffset) return null;

  const instant = new Date(value);

  if (Number.isNaN(instant.getTime())) return null;

  return {
    date: new Date(
      instant.getFullYear(),
      instant.getMonth(),
      instant.getDate(),
    ),
    hour: instant.getHours(),
    minute: instant.getMinutes(),
  };
}

const pad = (value: number): string => String(value).padStart(2, "0");

/** "17/09/2026 às 08:30", in the browser's zone. */
function formatLocalDateTime(parts: LocalDateTimeParts | null): string {
  if (!parts) return "";

  const { date, hour, minute } = parts;

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} às ${pad(hour)}:${pad(minute)}`;
}

const HOURS: readonly number[] = Array.from({ length: 24 }, (_, hour) => hour);

/**
 * Minutes in `step` increments, plus the current minute when it is off the
 * grid — a value saved as 08:07 must still show as 08:07, not as a blank
 * select that silently rewrites it on the next save.
 */
function minuteOptions(step: number, current?: number | null): number[] {
  const safeStep = Math.min(60, Math.max(1, Math.floor(step)));

  const options = Array.from(
    { length: Math.ceil(60 / safeStep) },
    (_, index) => index * safeStep,
  );

  if (
    current !== undefined &&
    current !== null &&
    current >= 0 &&
    current < 60 &&
    !options.includes(current)
  ) {
    options.push(current);
    options.sort((a, b) => a - b);
  }

  return options;
}

/** "08:00" → { hour: 8, minute: 0 }; anything else falls back to 08:00. */
function parseTimeOfDay(value: string | undefined): {
  hour: number;
  minute: number;
} {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value ?? "");

  if (match) {
    const hour = Number(match[1]);
    const minute = Number(match[2]);

    if (hour < 24 && minute < 60) return { hour, minute };
  }

  return { hour: 8, minute: 0 };
}

export {
  HOURS,
  formatLocalDateTime,
  localPartsFromIso,
  minuteOptions,
  pad,
  parseTimeOfDay,
  toIsoFromLocalParts,
};
export type { LocalDateTimeParts };
