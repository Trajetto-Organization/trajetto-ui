/**
 * Brazil's time zones with pt-BR labels (decision 1.1). The values mirror
 * trajetto-api BRAZILIAN_TIME_ZONES (src/shared/time/business-day.ts), which
 * is what the API accepts; a unit test compares both lists.
 *
 * The label names the offset and the states people recognise — nobody picks
 * "America/Araguaina" by its IANA name. No directive: pure data.
 */
const DEFAULT_BUSINESS_TIMEZONE = "America/Sao_Paulo";

const BRAZILIAN_TIME_ZONE_OPTIONS = [
  { value: "America/Noronha", label: "Fernando de Noronha (UTC−2)" },
  {
    value: "America/Sao_Paulo",
    label: "Brasília — SP, RJ, MG, ES, PR, SC, RS, GO, DF (UTC−3)",
  },
  { value: "America/Bahia", label: "Bahia (UTC−3)" },
  {
    value: "America/Fortaleza",
    label: "Fortaleza — CE, RN, PB, PI, MA (UTC−3)",
  },
  { value: "America/Recife", label: "Recife — PE (UTC−3)" },
  { value: "America/Maceio", label: "Maceió — AL, SE (UTC−3)" },
  { value: "America/Belem", label: "Belém — PA leste, AP (UTC−3)" },
  { value: "America/Santarem", label: "Santarém — PA oeste (UTC−3)" },
  { value: "America/Araguaina", label: "Araguaína — TO (UTC−3)" },
  { value: "America/Campo_Grande", label: "Campo Grande — MS (UTC−4)" },
  { value: "America/Cuiaba", label: "Cuiabá — MT (UTC−4)" },
  { value: "America/Porto_Velho", label: "Porto Velho — RO (UTC−4)" },
  { value: "America/Boa_Vista", label: "Boa Vista — RR (UTC−4)" },
  { value: "America/Manaus", label: "Manaus — AM leste (UTC−4)" },
  { value: "America/Eirunepe", label: "Eirunepé — AM oeste (UTC−5)" },
  { value: "America/Rio_Branco", label: "Rio Branco — AC (UTC−5)" },
] as const;

type BrazilianTimeZone = (typeof BRAZILIAN_TIME_ZONE_OPTIONS)[number]["value"];

const BRAZILIAN_TIME_ZONES = BRAZILIAN_TIME_ZONE_OPTIONS.map(
  (option) => option.value,
) as unknown as readonly [BrazilianTimeZone, ...BrazilianTimeZone[]];

/** The label of a stored zone; the raw value for one outside the list. */
function timeZoneLabel(value: string | null | undefined): string {
  const zone = value || DEFAULT_BUSINESS_TIMEZONE;

  return (
    BRAZILIAN_TIME_ZONE_OPTIONS.find((option) => option.value === zone)
      ?.label ?? zone
  );
}

export {
  BRAZILIAN_TIME_ZONE_OPTIONS,
  BRAZILIAN_TIME_ZONES,
  DEFAULT_BUSINESS_TIMEZONE,
  timeZoneLabel,
  type BrazilianTimeZone,
};
