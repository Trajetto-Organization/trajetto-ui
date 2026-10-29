/** Short date + time, or an em dash — the two states a nullable moment has. */
const formatMoment = (value: string | null | undefined): string =>
  value
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";

/**
 * Milliseconds as somebody reads them.
 *
 * Under a second stays in milliseconds because that is the unit anybody
 * debugging a slow endpoint thinks in; above it, "2,4 s" is what they say out
 * loud.
 */
const formatDuration = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "—";

  if (value < 1000) return `${Math.round(value)} ms`;

  return `${(value / 1000).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })} s`;
};

/**
 * A usage day ("YYYY-MM-DD", the company's calendar day) as "15/09".
 *
 * Split, never parsed into a Date: `new Date("2026-09-15")` is UTC midnight
 * and a browser in Brazil would print the 14th. The chart used to show the
 * raw ISO string (DLVB-33).
 */
const formatDayKey = (
  key: string | null | undefined,
  withYear = false,
): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key ?? "");

  if (!match) return key ?? "";

  const [, year, month, day] = match;

  return withYear ? `${day}/${month}/${year}` : `${day}/${month}`;
};

export { formatDayKey, formatDuration, formatMoment };
