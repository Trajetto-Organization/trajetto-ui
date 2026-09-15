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

export { formatDuration, formatMoment };
