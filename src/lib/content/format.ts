/** "28 de setembro de 2026" for a calendar day, the same on server and browser. */
export function formatContentDate(
  day: string,
  month: "long" | "short" = "long",
): string {
  // UTC on both sides: in Brazil a local format would show the day before
  // and the hydration would disagree with the prerendered HTML.
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month,
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));
}
