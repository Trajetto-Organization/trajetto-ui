/**
 * The clock the public verification page prints moments in.
 *
 * The page is rendered on the server, and the container runs in UTC on
 * purpose (decision 1.1): formatting without a zone printed a delivery made
 * at 22:00 in São Paulo as 01:00 of the next day. The summary carries the
 * carrier's zone, the one its PDF prints and names; an older API without it,
 * or a value this runtime does not know, falls back to Brasília like the PDF.
 *
 * No imports on purpose: a test runs this file alone under another TZ.
 */
const DEFAULT_VERIFICATION_TIME_ZONE = "America/Sao_Paulo";

/**
 * How the PDF names each Brazilian zone (trajetto-api proof-document
 * ZONE_NAMES): São Paulo's clock is "Brasília", the others their city.
 */
const ZONE_NAMES: Record<string, string> = {
  "America/Noronha": "Fernando de Noronha",
  "America/Belem": "Belém",
  "America/Fortaleza": "Fortaleza",
  "America/Recife": "Recife",
  "America/Araguaina": "Araguaína",
  "America/Maceio": "Maceió",
  "America/Bahia": "Salvador",
  "America/Sao_Paulo": "Brasília",
  "America/Campo_Grande": "Campo Grande",
  "America/Cuiaba": "Cuiabá",
  "America/Santarem": "Santarém",
  "America/Porto_Velho": "Porto Velho",
  "America/Boa_Vista": "Boa Vista",
  "America/Manaus": "Manaus",
  "America/Eirunepe": "Eirunepé",
  "America/Rio_Branco": "Rio Branco",
};

/** The zone to print in: the given one when this runtime knows it. */
function verificationTimeZone(timeZone: string | null | undefined): string {
  if (!timeZone) return DEFAULT_VERIFICATION_TIME_ZONE;

  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone });

    return timeZone;
  } catch {
    return DEFAULT_VERIFICATION_TIME_ZONE;
  }
}

/** "16/09/2026, 22:00" in the carrier's zone; "—" when there is none. */
function formatVerificationMoment(
  value: string | null | undefined,
  timeZone?: string | null,
): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: verificationTimeZone(timeZone),
  }).format(date);
}

/**
 * "Horários de Manaus (UTC-4).", the words the PDF uses, so the two can be
 * read side by side. `at` picks the instant the offset is read at.
 */
function verificationZoneCaption(
  timeZone: string | null | undefined,
  at: string | null | undefined,
): string {
  const zone = verificationTimeZone(timeZone);

  const parsed = at ? new Date(at) : null;
  const instant =
    parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date();

  const offset = (
    new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      timeZoneName: "shortOffset",
    })
      .formatToParts(instant)
      .find((part) => part.type === "timeZoneName")?.value ?? "GMT"
  )
    .replace(/^GMT/, "UTC")
    .replace(/−/g, "-");

  return `Horários de ${ZONE_NAMES[zone] ?? zone} (${offset}).`;
}

export {
  DEFAULT_VERIFICATION_TIME_ZONE,
  ZONE_NAMES,
  formatVerificationMoment,
  verificationTimeZone,
  verificationZoneCaption,
};
