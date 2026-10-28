/**
 * The period of the deliveries list (product meeting of 14/10/2026).
 *
 * The list opens on TODAY: a carrier with ~3,000 deliveries a day reads
 * today's work, and a first page that counted the company's whole history
 * for the cards and the pager was the heaviest read of the board. Presets
 * Hoje / 7 dias / 14 dias / 30 dias, or a custom range of at most
 * MAX_CUSTOM_PERIOD_DAYS. The days are the company's (the API resolves them
 * in its zone); the browser only names them.
 *
 * Wire format, the same in the URL and in the API query (mirrored by
 * trajetto-api list-delivery-schema / delivery-period.ts):
 *   ?period=7d            a preset
 *   ?period=custom&from=YYYY-MM-DD&to=YYYY-MM-DD
 * No `period` in the URL is today; the API is always told, because an
 * absent period there means every date.
 *
 * No directive: the server component that asks the API, the export and the
 * toolbar all read this module.
 */

const DELIVERY_PERIODS = ["today", "7d", "14d", "30d", "custom"] as const;

type DeliveryPeriod = (typeof DELIVERY_PERIODS)[number];

/** What the list opens on when the URL names no period. */
const DEFAULT_DELIVERY_PERIOD: DeliveryPeriod = "today";

const DELIVERY_PERIOD_LABELS: Record<DeliveryPeriod, string> = {
  today: "Hoje",
  "7d": "7 dias",
  "14d": "14 dias",
  "30d": "30 dias",
  custom: "Personalizado",
};

/** The API's cap: a quarter (three consecutive months reach 92 days). */
const MAX_CUSTOM_PERIOD_DAYS = 92;

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

const DAY_MS = 24 * 60 * 60 * 1000;

interface DeliveryPeriodSelection {
  period: DeliveryPeriod;
  /** "YYYY-MM-DD", only with `custom`. */
  from?: string;
  to?: string;
}

/** The page's searchParams (server) or the URL's (client). */
type ParamSource =
  Pick<URLSearchParams, "get"> | Record<string, string | string[] | undefined>;

function readOne(source: ParamSource, name: string): string | undefined {
  if (typeof (source as URLSearchParams).get === "function") {
    return (source as URLSearchParams).get(name) ?? undefined;
  }

  const value = (source as Record<string, string | string[] | undefined>)[name];

  return Array.isArray(value) ? value[0] : value;
}

/** A real calendar day as "YYYY-MM-DD" (not 2026-02-30). */
function isDateKey(value: string | undefined): value is string {
  if (!value || !DATE_KEY.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Days from `from` to `to`, both included. */
function periodLength(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS) + 1;
}

/**
 * Why a custom range cannot be asked for, in the API's own words, or null
 * when it can.
 */
function customRangeProblem(
  from: string | undefined,
  to: string | undefined,
): string | null {
  if (!from || !to) {
    return "Informe a data inicial e a data final do período.";
  }

  if (!isDateKey(from))
    return "A data inicial do período não é uma data válida.";
  if (!isDateKey(to)) return "A data final do período não é uma data válida.";

  if (from > to) {
    return "A data inicial do período não pode ser depois da data final.";
  }

  if (periodLength(from, to) > MAX_CUSTOM_PERIOD_DAYS) {
    return `O período personalizado pode ter no máximo ${MAX_CUSTOM_PERIOD_DAYS} dias. Para um intervalo maior, exporte por partes.`;
  }

  return null;
}

/**
 * The period the list shows. Nothing in the URL is today; an unknown value,
 * or a custom range the API would refuse (a hand-edited link, a company
 * switch that kept `period` but not the days), falls back to today instead
 * of a 400.
 */
function readDeliveryPeriod(source: ParamSource): DeliveryPeriodSelection {
  const raw = readOne(source, "period");

  if (!raw || !(DELIVERY_PERIODS as readonly string[]).includes(raw)) {
    return { period: DEFAULT_DELIVERY_PERIOD };
  }

  if (raw !== "custom") return { period: raw as DeliveryPeriod };

  const from = readOne(source, "from");
  const to = readOne(source, "to");

  if (customRangeProblem(from, to)) return { period: DEFAULT_DELIVERY_PERIOD };

  return { period: "custom", from, to };
}

/**
 * The period params for `/delivery/list-delivery` and its export. Always a
 * period: absent at the API means every date, which is not what the screen
 * shows.
 */
function deliveryPeriodQuery(source: ParamSource): Record<string, string> {
  const { period, from, to } = readDeliveryPeriod(source);

  return period === "custom" && from && to ? { period, from, to } : { period };
}

/**
 * The URL after choosing a period: today leaves no trace (it is the
 * default), a preset is one param, a custom range three. Another period is
 * another result: its first page, not page 7.
 */
function writeDeliveryPeriod(
  current: URLSearchParams,
  next: DeliveryPeriodSelection,
): URLSearchParams {
  const params = new URLSearchParams(current.toString());

  params.delete("period");
  params.delete("from");
  params.delete("to");
  params.delete("page");

  if (next.period === "custom") {
    if (next.from && next.to) {
      params.set("period", "custom");
      params.set("from", next.from);
      params.set("to", next.to);
    }

    return params;
  }

  if (next.period !== DEFAULT_DELIVERY_PERIOD)
    params.set("period", next.period);

  return params;
}

/** "28/10/2026" from "2026-10-28", without the browser's zone moving it. */
function formatDateKey(key: string): string {
  const [year, month, day] = key.split("-");

  return `${day}/${month}/${year}`;
}

/** How the chosen period reads on screen: "Hoje", "7 dias", "01/10 a 28/10/2026". */
function deliveryPeriodLabel(selection: DeliveryPeriodSelection): string {
  if (selection.period === "custom" && selection.from && selection.to) {
    return selection.from === selection.to
      ? formatDateKey(selection.from)
      : `${formatDateKey(selection.from)} a ${formatDateKey(selection.to)}`;
  }

  return DELIVERY_PERIOD_LABELS[selection.period];
}

/** The listing's `meta.searchMeta.period`, when the API sends it. */
interface DeliveryListPeriodMeta {
  from: string;
  to: string;
  /**
   * False when the search was exactly a delivery's id, order code, NF-e key
   * or NF number: the API then ignores the period and the rows may be older.
   */
  applied: boolean;
}

export {
  DEFAULT_DELIVERY_PERIOD,
  DELIVERY_PERIODS,
  DELIVERY_PERIOD_LABELS,
  MAX_CUSTOM_PERIOD_DAYS,
  customRangeProblem,
  deliveryPeriodLabel,
  deliveryPeriodQuery,
  formatDateKey,
  isDateKey,
  readDeliveryPeriod,
  writeDeliveryPeriod,
  type DeliveryListPeriodMeta,
  type DeliveryPeriod,
  type DeliveryPeriodSelection,
};
