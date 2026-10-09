/**
 * Support hours (Mon–Fri, 09:00–18:00, São Paulo time), shared by /about and
 * /contact. Pure: the caller passes the moment, so a prerendered page never
 * bakes the build's clock into its HTML (the client components compute it
 * after mount).
 */

const OPEN_MINUTE = 9 * 60;
const CLOSE_MINUTE = 18 * 60;

interface SupportStatus {
  open: boolean;
  /** When it opens again, in words: "hoje", "amanhã" or "segunda". */
  reopens: "hoje" | "amanhã" | "segunda";
}

/** Weekday (0 = Sunday) and minute of the day in São Paulo. */
function saoPauloClock(moment: Date): { weekday: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(moment);

  const read = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    read("weekday"),
  );

  return {
    weekday,
    minute: Number(read("hour")) * 60 + Number(read("minute")),
  };
}

function supportStatus(moment: Date): SupportStatus {
  const { weekday, minute } = saoPauloClock(moment);
  const weekdayOpen = weekday >= 1 && weekday <= 5;
  const open = weekdayOpen && minute >= OPEN_MINUTE && minute < CLOSE_MINUTE;

  let reopens: SupportStatus["reopens"] = "segunda";
  if (weekdayOpen && minute < OPEN_MINUTE) reopens = "hoje";
  else if (weekday >= 1 && weekday <= 4 && minute >= CLOSE_MINUTE)
    reopens = "amanhã";

  return { open, reopens };
}

export { supportStatus };
export type { SupportStatus };
