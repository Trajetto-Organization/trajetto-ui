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

import {
  daysInclusive,
  formatDateKey,
  formatDateKeyRange,
  isDateKey,
} from "@/lib/date-key";

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

/** Each preset is the last N days of the company, today included. */
const PRESET_DAYS: Record<Exclude<DeliveryPeriod, "custom">, number> = {
  today: 1,
  "7d": 7,
  "14d": 14,
  "30d": 30,
};

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

/** Days from `from` to `to`, both included. */
const periodLength = daysInclusive;

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

/**
 * How the chosen period reads on screen: "Hoje", "7 dias",
 * "01/10/2026 a 28/10/2026" (one date when both ends are the same day).
 */
function deliveryPeriodLabel(selection: DeliveryPeriodSelection): string {
  if (selection.period === "custom" && selection.from && selection.to) {
    return formatDateKeyRange(selection.from, selection.to);
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

/**
 * The company's today, when the listing's answer says it: a preset is the
 * last N days of the company, so its last day IS the company's today (the
 * API resolves it in the company's zone; the browser's clock may be another
 * day). Undefined for a custom range, whose last day can be any day, and for
 * an answer that does not match the preset on screen — the URL already
 * moved and the server has not answered yet.
 *
 * Known transient gap: the match is by length only, because the API's
 * `period` meta is `{ from, to, applied }` and does not say which kind was
 * asked for. So while the answer to a custom range of exactly 1, 7, 14 or
 * 30 days ending in the past is still on screen, choosing the preset of the
 * same length passes that old answer as the company's today: Personalizado,
 * opened in that gap, starts on the old window and greys the days after it.
 * It lasts until the preset's answer lands — `maxDate` is a live prop and
 * reopening re-seeds the popover. Closing it needs the period kind in the
 * meta (an API change), not a guess from the browser's clock.
 */
function companyTodayFrom(
  selection: DeliveryPeriodSelection,
  meta: DeliveryListPeriodMeta | null | undefined,
): string | undefined {
  if (selection.period === "custom" || !meta) return undefined;

  if (!isDateKey(meta.from) || !isDateKey(meta.to)) return undefined;

  return periodLength(meta.from, meta.to) === PRESET_DAYS[selection.period]
    ? meta.to
    : undefined;
}

/**
 * The range the custom popover opens on: the custom range in effect; else
 * the window of the preset in effect as the API answered it (in the
 * company's days); else `fallbackDay` alone — today, by the browser's clock,
 * when nothing better is known.
 */
function customRangeSeed(
  selection: DeliveryPeriodSelection,
  meta: DeliveryListPeriodMeta | null | undefined,
  fallbackDay: string,
): { from: string; to: string } {
  if (selection.period === "custom" && selection.from && selection.to) {
    return { from: selection.from, to: selection.to };
  }

  if (meta && companyTodayFrom(selection, meta)) {
    return { from: meta.from, to: meta.to };
  }

  return { from: fallbackDay, to: fallbackDay };
}

export {
  DEFAULT_DELIVERY_PERIOD,
  DELIVERY_PERIODS,
  DELIVERY_PERIOD_LABELS,
  MAX_CUSTOM_PERIOD_DAYS,
  companyTodayFrom,
  customRangeProblem,
  customRangeSeed,
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
