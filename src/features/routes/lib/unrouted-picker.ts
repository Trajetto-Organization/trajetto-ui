/**
 * The "Adicionar entregas" picker's rules (decision 14.7, §5.5), pure.
 */

/** Which scheduled days the picker shows. */
type PickerDateMode =
  /** The route's day, plus the deliveries with no day (the default). */
  | "route-day"
  /** Every day, with or without one. */
  | "any"
  /** A range of days the dispatcher picks, optionally with the undated. */
  | "range";

interface PickerFilters {
  search: string;
  shippers: string[];
  cities: string[];
  ufs: string[];
  kinds: string[];
  dateMode: PickerDateMode;

  /** "range" only: civil days "YYYY-MM-DD", either may be empty. */
  rangeFrom: string;
  rangeTo: string;

  /** "range" only: also the deliveries with no scheduled day. */
  rangeIncludesUnscheduled: boolean;
}

interface PickerQuery {
  page: number;
  pageSize: number;
  search?: string;
  shipperIds?: string[];
  cities?: string[];
  ufs?: string[];
  kinds?: string[];
  scheduledFrom?: string;
  scheduledTo?: string;
  includeUnscheduled?: boolean;
}

/** The API's page size for the picker: 50 per "Carregar mais". */
const PICKER_PAGE_SIZE = 50;

/** The API's add-stops batch ceiling. */
const ADD_BATCH_SIZE = 100;

const DEFAULT_PICKER_FILTERS: PickerFilters = {
  search: "",
  shippers: [],
  cities: [],
  ufs: [],
  kinds: [],
  dateMode: "route-day",
  rangeFrom: "",
  rangeTo: "",
  rangeIncludesUnscheduled: false,
};

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The query of one page. `routeDay` is the route's civil day as the API
 * serves it (UTC midnight, "2026-10-06T00:00:00.000Z") — read as its first
 * ten characters, which for a date-only value IS the day (decision 1.3).
 */
function pickerQuery(
  filters: PickerFilters,
  routeDay: string,
  page: number,
): PickerQuery {
  const query: PickerQuery = { page, pageSize: PICKER_PAGE_SIZE };

  const search = filters.search.trim();

  if (search) query.search = search;
  if (filters.shippers.length) query.shipperIds = filters.shippers;
  if (filters.cities.length) query.cities = filters.cities;
  if (filters.ufs.length) query.ufs = filters.ufs;
  if (filters.kinds.length) query.kinds = filters.kinds;

  if (filters.dateMode === "route-day") {
    const day = routeDay.slice(0, 10);

    query.scheduledFrom = day;
    query.scheduledTo = day;
    query.includeUnscheduled = true;
  }

  if (filters.dateMode === "range") {
    // A half-typed day is no bound at all rather than a 400.
    const from = DAY_KEY.test(filters.rangeFrom) ? filters.rangeFrom : "";
    const to = DAY_KEY.test(filters.rangeTo) ? filters.rangeTo : "";

    // Swapped ends read as the range the dispatcher meant.
    const [low, high] = from && to && from > to ? [to, from] : [from, to];

    if (low) query.scheduledFrom = low;
    if (high) query.scheduledTo = high;

    // Without a bound the range is "any day", and "with the undated" adds
    // nothing; with one, the API takes the flag.
    if (low || high)
      query.includeUnscheduled = filters.rangeIncludesUnscheduled;
  }

  return query;
}

/** Splits a selection into the API's batches, in order. */
function chunk<T>(items: readonly T[], size: number = ADD_BATCH_SIZE): T[][] {
  const batches: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }

  return batches;
}

/** Toggles one value of a multi-select filter. */
function toggleValue(values: readonly string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((entry) => entry !== value)
    : [...values, value];
}

export {
  ADD_BATCH_SIZE,
  DEFAULT_PICKER_FILTERS,
  PICKER_PAGE_SIZE,
  chunk,
  pickerQuery,
  toggleValue,
};
export type { PickerDateMode, PickerFilters, PickerQuery };
