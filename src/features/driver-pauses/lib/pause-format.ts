import type { PauseFlagCode, PauseKind, ReportPauseEntry } from "../types";

/**
 * How the pause report words its numbers. Pure, so what a manager reads is
 * decided by a test rather than by a render. Hours are shown in the
 * COMPANY's zone (the report's `timeZone`), like the tower: the day of a
 * workday is the company's day, and a browser elsewhere must not move it.
 */

const PAUSE_KIND_LABELS: Record<PauseKind, string> = {
  MEAL: "Refeição",
  REST: "Descanso",
  OTHER: "Outra",
};

/** Short names for the filter and the badges; the API sends the explanation. */
const PAUSE_FLAG_LABELS: Record<PauseFlagCode, string> = {
  MEAL_MISSING: "Sem refeição",
  MEAL_SHORT: "Refeição curta",
  DRIVING_REST_SHORT: "Direção sem descanso",
  INTERJORNADA_SHORT: "Interjornada curta",
  PAUSE_NOT_ENDED: "Pausa não encerrada",
  PAUSE_TOO_LONG: "Pausa acima de 12 h",
};

/** "40 min", "1 h", "1 h 05 min", "12 h 30 min". Mirrors the API's wording. */
function formatMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes))
    return "—";

  const whole = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;

  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} h`;

  return `${hours} h ${String(rest).padStart(2, "0")} min`;
}

/** "12:02" in the company's zone; "—" for a missing or unreadable instant. */
function formatClock(
  instant: string | null | undefined,
  timeZone: string,
): string {
  if (!instant) return "—";

  const date = new Date(instant);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

/** "27/09 às 22:10" in the company's zone. */
function formatDayAndClock(
  instant: string | null | undefined,
  timeZone: string,
): string {
  if (!instant) return "—";

  const date = new Date(instant);

  if (Number.isNaN(date.getTime())) return "—";

  const day = new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
  }).format(date);

  return `${day} às ${formatClock(instant, timeZone)}`;
}

/**
 * The workday's civil day, "28/09/2026 (seg.)". A date-only key is a day,
 * not an instant (decision 1.3): read in UTC, never in the browser's zone.
 */
function formatWorkdayDay(day: string): string {
  const date = new Date(`${day}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) return day;

  const date10 = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);

  const weekday = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    weekday: "short",
  }).format(date);

  return `${date10} (${weekday})`;
}

/**
 * One pause as a line of the row: "Refeição 12:02–13:10 · 1 h 08 min",
 * "Descanso desde 15:30 · em andamento (20 min)", "Refeição às 12:00 ·
 * não encerrada". The end is the company's clock too; a pause that crossed
 * midnight shows the end's date.
 */
function pauseLine(entry: ReportPauseEntry, timeZone: string): string {
  const kind = pauseTypeLabel(entry);
  const start = formatClock(entry.started_at, timeZone);

  if (entry.status === "NOT_ENDED")
    return `${kind} às ${start} · não encerrada`;

  if (entry.status === "ONGOING" || !entry.ended_at) {
    return `${kind} desde ${start} · em andamento (${formatMinutes(entry.duration_minutes)})`;
  }

  const line = `${kind} ${start}–${clockOrDay(entry.started_at, entry.ended_at, timeZone)} · ${formatMinutes(
    entry.duration_minutes,
  )}`;

  // Closed only after 12 h: the record is shown, but it counts for nothing.
  return entry.status === "TOO_LONG" ? `${line} · fora dos cálculos` : line;
}

/**
 * The pause's name in a line (decision 14.4): the company's type, with the
 * legal nature beside it when they differ ("Lanche (Descanso)"), since the
 * alerts count by nature. Without a type name, the nature alone.
 */
function pauseTypeLabel(
  entry: Pick<ReportPauseEntry, "kind" | "occurrence_type_name">,
): string {
  const nature = PAUSE_KIND_LABELS[entry.kind] ?? entry.kind;
  const name = entry.occurrence_type_name?.trim();

  if (
    !name ||
    name.toLocaleLowerCase("pt-BR") === nature.toLocaleLowerCase("pt-BR")
  ) {
    return nature;
  }

  return `${name} (${nature})`;
}

/**
 * The end's clock, or its day and clock when it falls on another day than
 * the start, in the company's zone: "13:10", "29/09 às 00:20".
 */
function clockOrDay(start: string, end: string, timeZone: string): string {
  const sameDay =
    formatDayAndClock(start, timeZone).slice(0, 5) ===
    formatDayAndClock(end, timeZone).slice(0, 5);

  return sameDay
    ? formatClock(end, timeZone)
    : formatDayAndClock(end, timeZone);
}

export {
  PAUSE_FLAG_LABELS,
  PAUSE_KIND_LABELS,
  pauseTypeLabel,
  clockOrDay,
  formatClock,
  formatDayAndClock,
  formatMinutes,
  formatWorkdayDay,
  pauseLine,
};
