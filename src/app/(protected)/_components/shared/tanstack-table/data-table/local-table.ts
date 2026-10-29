import type { SortingState } from "@tanstack/react-table";

import {
  readColumnFilters,
  readSorting,
  serverTableQuery,
  type FacetCount,
  type ServerTableSpec,
} from "./server-table";

/**
 * Complete-set local mode of a server-side table (spec §13).
 *
 * Every table answers on the server (decision 8.8): a filter tick, a sort or
 * a page turn is a new URL, a server render and an API read. The old main
 * branch felt instant because it filtered the ten rows of the page on screen,
 * which was wrong. A small catalog (Tipos de ocorrência, Motivos,
 * Embarcadores, Filiais) is different: when the API says its whole set for
 * the company and the search fits in one read of at most 100 rows, the rows
 * on screen ARE the list, and the browser can answer the next tick itself
 * with the same answer the server would give.
 *
 * The rules, all checked here and mirrored by tests:
 *   - Complete: one read with page 1, pageSize 100 (the API ceiling), the
 *     URL's search, sort and company and NO facet came back with
 *     `total <= rows`. Decided on the server for each render, never guessed
 *     from a page.
 *   - Facets: the API's semantics (AND across facets, OR inside one, the
 *     value each row is grouped under) and its disjunctive counts.
 *   - Sort: only columns whose order Postgres and the browser agree on
 *     without a collation (timestamps, booleans, then the API tiebreaker on
 *     lower-case UUIDs). A text column (name, city...) depends on the
 *     database collation, so it stays a server sort.
 *   - Search stays on the server: the API decodes the term, compares with
 *     ILIKE under the database locale and owns each endpoint's field list
 *     (digits of a CNPJ, phone...). Parity cannot be proven here.
 *   - Everything else in the URL (search, company, tab, period, a server
 *     sort) is the read's KEY: a change there is a server render.
 *
 * No directive and no hooks: the server read and the client view share it.
 */

/** The most rows one complete read carries: trajetto-api MAX_PAGE_SIZE. */
const LOCAL_TABLE_MAX_ROWS = 100;

/** The page an offset list answers at most (trajetto-api MAX_PAGE). */
const MAX_PAGE = 1_000_000;

/** The page size a list falls back to when the URL has none. */
const DEFAULT_PAGE_SIZE = 10;

/**
 * How a row's value for a facet is read, exactly as the API groups it
 * (trajetto-api shared/delivery/catalog-list.ts): `active` is
 * activeStatusOf, `yes-no` is yesNoOf, `value` the column as stored.
 */
type LocalFacetRead = "active" | "yes-no" | "value";

interface LocalFacetSpec {
  /** The row field the API filters and groups by. */
  field: string;
  read: LocalFacetRead;
}

/**
 * Orders the browser reproduces exactly: an ISO timestamp of millisecond
 * precision (the columns are TIMESTAMP(3)), a boolean (false first, as
 * Postgres), a lower-case UUID (hex digits order the same in any collation).
 */
type LocalSortKind = "instant" | "boolean" | "uuid";

interface LocalSortField {
  field: string;
  kind: LocalSortKind;
}

interface LocalTableSpec {
  /** Facet column id (a key of the ServerTableSpec's facets) → its rule. */
  facets: Readonly<Record<string, LocalFacetSpec>>;
  /** Sortable column ids the browser may order; any other is the server's. */
  sorts: Readonly<Record<string, LocalSortField>>;
  /** The API's tiebreaker after the sorted column (resolveOrderBy). */
  tiebreaker: ReadonlyArray<LocalSortField & { desc: boolean }>;
}

/** created_at desc, then id desc: the tiebreaker of every catalog list. */
const CREATED_THEN_ID: LocalTableSpec["tiebreaker"] = [
  { field: "created_at", kind: "instant", desc: true },
  { field: "id", kind: "uuid", desc: true },
];

/** The facet values selected in the URL, keyed by the facet's API param. */
type LocalSelection = Record<string, string[]>;

type ParamSource = Parameters<typeof serverTableQuery>[0];

type Row = Record<string, unknown>;

function fieldOf(row: unknown, field: string): unknown {
  return (row as Row)?.[field];
}

/** The value a row is grouped under for a facet (the API's mapping). */
function localFacetValue(row: unknown, rule: LocalFacetSpec): string {
  const value = fieldOf(row, rule.field);

  if (rule.read === "active") return value === false ? "inactive" : "active";
  if (rule.read === "yes-no") return value === true ? "yes" : "no";

  return String(value);
}

/** The URL's facet values (the ones the API would receive), by param. */
function localSelectionOf(
  source: ParamSource,
  spec: ServerTableSpec,
): LocalSelection {
  const selection: LocalSelection = {};

  for (const filter of readColumnFilters(source, spec)) {
    const facet = spec.facets[filter.id];

    if (facet) selection[facet.param] = (filter.value as string[]).slice();
  }

  return selection;
}

/**
 * Whether a row survives every selected facet, optionally but one: the
 * API's `keptBy` (AND across facets, OR inside one).
 */
function keptLocally(
  row: unknown,
  spec: ServerTableSpec,
  local: LocalTableSpec,
  selection: LocalSelection,
  exceptParam?: string,
): boolean {
  return Object.entries(spec.facets).every(([columnId, facet]) => {
    if (facet.param === exceptParam) return true;

    const chosen = selection[facet.param];
    const rule = local.facets[columnId];

    if (!chosen?.length || !rule) return true;

    return chosen.includes(localFacetValue(row, rule));
  });
}

function applyLocalFacets<TRow>(
  rows: readonly TRow[],
  spec: ServerTableSpec,
  local: LocalTableSpec,
  selection: LocalSelection,
): TRow[] {
  return rows.filter((row) => keptLocally(row, spec, local, selection));
}

/**
 * A facet's options counted with every OTHER facet applied, never its own,
 * over a domain listed whole (0 included): trajetto-api `disjunctiveFacets`.
 */
function disjunctiveCounts(
  rows: readonly unknown[],
  spec: ServerTableSpec,
  local: LocalTableSpec,
  selection: LocalSelection,
  domains: Readonly<Record<string, readonly string[]>>,
): Record<string, FacetCount[]> {
  const counts: Record<string, FacetCount[]> = {};

  for (const [columnId, facet] of Object.entries(spec.facets)) {
    const domain = domains[facet.param];
    const rule = local.facets[columnId];

    if (!domain || !rule) continue;

    const base = rows.filter((row) =>
      keptLocally(row, spec, local, selection, facet.param),
    );

    counts[facet.param] = domain.map((value) => ({
      value,
      count: base.filter((row) => localFacetValue(row, rule) === value).length,
    }));
  }

  return counts;
}

const LOWER_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function instantOf(value: unknown): number {
  return typeof value === "string" ? Date.parse(value) : Number.NaN;
}

/** Whether a field of every row has the shape its order needs. */
function sortable(rows: readonly unknown[], { field, kind }: LocalSortField) {
  return rows.every((row) => {
    const value = fieldOf(row, field);

    if (kind === "instant") return Number.isFinite(instantOf(value));
    if (kind === "boolean") return typeof value === "boolean";

    return typeof value === "string" && LOWER_UUID.test(value);
  });
}

/**
 * Whether the browser may order these rows: every field a local sort or the
 * tiebreaker reads is of its expected shape. A seeded id that is not a
 * lower-case UUID, or a timestamp that does not parse, would order
 * differently from Postgres, so the whole table keeps its sort on the server.
 * Computed the same way by the server read and the client view.
 */
function localSortsAllowed(
  rows: readonly unknown[],
  local: LocalTableSpec,
): boolean {
  return [...Object.values(local.sorts), ...local.tiebreaker].every((field) =>
    sortable(rows, field),
  );
}

function compareField(a: unknown, b: unknown, field: LocalSortField): number {
  const left = fieldOf(a, field.field);
  const right = fieldOf(b, field.field);

  if (field.kind === "instant") return instantOf(left) - instantOf(right);
  if (field.kind === "boolean") return Number(left) - Number(right);

  // Lower-case hex and dashes in the same places: code-unit order is the
  // collation's order for these strings.
  const l = String(left);
  const r = String(right);

  return l < r ? -1 : l > r ? 1 : 0;
}

/** The URL's sort, or the default, when the browser can order by it. */
function localSortOf(
  sorting: SortingState,
  local: LocalTableSpec,
): (LocalSortField & { desc: boolean }) | null {
  const [first] = sorting;

  if (!first) return null;

  const field = local.sorts[first.id];

  return field ? { ...field, desc: first.desc } : null;
}

/**
 * The rows in the order the API would return them for this sort
 * (resolveOrderBy: the column, then the tiebreaker minus that column), or
 * null when the sort is the server's.
 */
function sortLocally<TRow>(
  rows: readonly TRow[],
  sorting: SortingState,
  local: LocalTableSpec,
): TRow[] | null {
  const primary = localSortOf(sorting, local);

  if (!primary || !localSortsAllowed(rows, local)) return null;

  const order = [
    primary,
    ...local.tiebreaker.filter((entry) => entry.field !== primary.field),
  ];

  return rows.slice().sort((a, b) => {
    for (const entry of order) {
      const result = compareField(a, b, entry);

      if (result !== 0) return entry.desc ? -result : result;
    }

    return 0;
  });
}

/** The page and page size the URL asks for, as the web and the API read them. */
function listWindowOf(source: ParamSource): {
  page: number;
  pageSize: number;
  valid: boolean;
} {
  const params = toParams(source);

  const page = Number(params.get("page")) || 1;
  const pageSize = Number(params.get("pageSize")) || DEFAULT_PAGE_SIZE;

  // The API refuses a fraction or anything out of range (pageField,
  // pageSizeField): such a URL is the server's to answer, with its error.
  const valid =
    Number.isInteger(page) &&
    page >= 1 &&
    page <= MAX_PAGE &&
    Number.isInteger(pageSize) &&
    pageSize >= 1 &&
    pageSize <= LOCAL_TABLE_MAX_ROWS;

  return { page, pageSize, valid };
}

function toParams(source: ParamSource): URLSearchParams {
  if (typeof (source as URLSearchParams).getAll === "function") {
    return new URLSearchParams((source as URLSearchParams).toString());
  }

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(
    source as Record<string, string | string[] | undefined>,
  )) {
    for (const item of Array.isArray(value) ? value : value ? [value] : []) {
      params.append(key, item);
    }
  }

  return params;
}

/**
 * What a complete read answers for: every param of the URL the browser does
 * NOT vary by itself, normalised. Facets, page and pageSize are left out
 * (answered locally), and so is the sort when the browser can order by it.
 * Two URLs with the same key are answered by the same rows.
 */
function completeListKey(
  source: ParamSource,
  spec: ServerTableSpec,
  local: LocalTableSpec,
  sortsLocal: boolean,
): string {
  const params = toParams(source);
  const dropped = new Set<string>(["page", "pageSize", "sort", "order"]);

  for (const facet of Object.values(spec.facets)) dropped.add(facet.param);

  const entries: [string, string][] = [];

  // An empty value reads as no value on the server (`search || ""`), and
  // Next's record of the params drops it, so the key drops it too.
  for (const [key, value] of Array.from(params.entries())) {
    if (!dropped.has(key) && value !== "") entries.push([key, value]);
  }

  const [sort] = readSorting(params, spec);

  if (sort && !(sortsLocal && local.sorts[sort.id])) {
    entries.push(["sort", `${sort.id}:${sort.desc ? "desc" : "asc"}`]);
  }

  entries.sort(([a, x], [b, y]) =>
    a === b ? (x < y ? -1 : x > y ? 1 : 0) : a < b ? -1 : 1,
  );

  return new URLSearchParams(entries).toString();
}

/** Whether the URL sets any facet the spec declares. */
function hasFacetParams(source: ParamSource, spec: ServerTableSpec): boolean {
  return readColumnFilters(source, spec).length > 0;
}

/**
 * The params of the complete read: the URL's sort (so the rows come in the
 * order a server sort needs), no facet, page 1 and the ceiling. The caller
 * adds the search and the company, as for any read.
 */
function completeReadQuery(
  source: ParamSource,
  spec: ServerTableSpec,
): Record<string, string> {
  const { sort, order } = serverTableQuery(source, spec);

  return {
    page: "1",
    pageSize: String(LOCAL_TABLE_MAX_ROWS),
    ...(sort && { sort, order }),
  };
}

/** One list read, as each page's reader reports it. */
interface PagedRead {
  rows: readonly unknown[];
  meta: { total: number; page: number; pageSize: number };
  /** The list's `searchMeta`; only its `facets` counts are read here. */
  searchMeta?: object;
}

/**
 * The fewest rows the search matches before any facet, read off an answer
 * WITH facets: its total, and each facet's options summed (counted with the
 * other facets only, so each sum is a subset of the unfaceted set).
 */
function unfacetedLowerBound(read: PagedRead): number {
  const facets = ((read.searchMeta as { facets?: unknown } | undefined)
    ?.facets ?? {}) as Record<string, unknown>;

  return Object.values(facets).reduce<number>((bound, options) => {
    if (!Array.isArray(options)) return bound;

    const sum = options.reduce(
      (total: number, option) => total + (Number(option?.count) || 0),
      0,
    );

    return Math.max(bound, sum);
  }, read.meta.total);
}

/** How a list read for a URL went: a complete set, or the server's page. */
type CompleteListRead<R extends PagedRead> = R & {
  /** The key of a complete read (completeListKey); absent in server mode. */
  complete?: string;
};

/**
 * Reads a list that may be answered in the browser, with as few API calls as
 * the URL allows. `read` performs one request (the caller's fetch, tenant
 * and error handling) and says whether it succeeded.
 *
 * - The URL asks for a page the API would refuse: read it as is (its error).
 * - No facet: one complete read. Whole set → local mode. Otherwise the URL's
 *   page lies inside those 100 rows, in the same order → sliced here; a
 *   deeper page → read as asked. One call either way, except deep pages.
 * - Facets: the read the server mode needs first. When its counts prove the
 *   unfaceted set is above 100 (a big catalog: every tick) that answer is
 *   final, one call. Otherwise the complete read follows, and is used when
 *   it is the whole set.
 */
async function readCompleteList<R extends PagedRead>({
  source,
  spec,
  local,
  read,
  isOk,
}: {
  source: ParamSource;
  spec: ServerTableSpec;
  local: LocalTableSpec;
  read: (query: { complete: boolean }) => Promise<R>;
  isOk: (read: R) => boolean;
}): Promise<CompleteListRead<R>> {
  const window = listWindowOf(source);

  if (!window.valid) return read({ complete: false });

  // The page the URL asked for, whatever the read that answers it asked.
  const onWindow = (answer: R): R => ({
    ...answer,
    meta: {
      total: answer.meta.total,
      page: window.page,
      pageSize: window.pageSize,
    },
  });

  const answerFrom = (whole: R): CompleteListRead<R> => ({
    ...onWindow(whole),
    complete: completeListKey(
      source,
      spec,
      local,
      localSortsAllowed(whole.rows, local),
    ),
  });

  const isWhole = (candidate: R) =>
    candidate.meta.total <= candidate.rows.length &&
    candidate.rows.length <= LOCAL_TABLE_MAX_ROWS;

  if (!hasFacetParams(source, spec)) {
    const end = window.page * window.pageSize;

    if (end > LOCAL_TABLE_MAX_ROWS) return read({ complete: false });

    const whole = await read({ complete: true });

    if (!isOk(whole)) return onWindow(whole);
    if (isWhole(whole)) return answerFrom(whole);

    // The same order and offset the API would apply to this page.
    return {
      ...onWindow(whole),
      rows: whole.rows.slice(end - window.pageSize, end) as R["rows"],
    };
  }

  const faceted = await read({ complete: false });

  if (!isOk(faceted)) return faceted;
  if (unfacetedLowerBound(faceted) > LOCAL_TABLE_MAX_ROWS) return faceted;

  const whole = await read({ complete: true });

  return isOk(whole) && isWhole(whole) ? answerFrom(whole) : faceted;
}

/** What the browser shows for a complete list under the URL's params. */
interface LocalListView<TRow> {
  /** The rows of the page, in the API's order. */
  rows: TRow[];
  meta: { total: number; page: number; pageSize: number };
  /** Every row the facets keep (before paging). */
  filtered: TRow[];
  selection: LocalSelection;
}

/**
 * The page a complete list shows for these params: facets applied, the
 * browser's sort when it has one (else the order the rows came in, which is
 * the server sort of the read), then the URL's page.
 */
function localListView<TRow>(
  rows: readonly TRow[],
  source: ParamSource,
  spec: ServerTableSpec,
  local: LocalTableSpec,
): LocalListView<TRow> {
  const selection = localSelectionOf(source, spec);
  const filtered = applyLocalFacets(rows, spec, local, selection);
  const sorted =
    sortLocally(filtered, readSorting(source, spec), local) ?? filtered;

  const window = listWindowOf(source);
  const page = window.valid ? window.page : 1;
  const pageSize = window.valid ? window.pageSize : DEFAULT_PAGE_SIZE;
  const start = (page - 1) * pageSize;

  return {
    rows: sorted.slice(start, start + pageSize),
    meta: { total: filtered.length, page, pageSize },
    filtered,
    selection,
  };
}

/**
 * Whether the rows of a complete read answer these params: same key, a page
 * the API would accept. The caller checks nothing else.
 */
function answersLocally(
  rows: readonly unknown[],
  key: string | undefined,
  next: ParamSource,
  spec: ServerTableSpec,
  local: LocalTableSpec,
): boolean {
  if (key === undefined || !listWindowOf(next).valid) return false;

  return (
    completeListKey(next, spec, local, localSortsAllowed(rows, local)) === key
  );
}

/**
 * A local spec must cover every facet of its server spec (a facet without a
 * rule would keep every row where the API filters), and may only order by
 * columns the API orders by.
 */
function assertLocalTableSpec(
  spec: ServerTableSpec,
  local: LocalTableSpec,
): LocalTableSpec {
  const facets = Object.keys(spec.facets);

  for (const columnId of facets) {
    if (!local.facets[columnId]) {
      throw new Error(`Filtro sem regra local: ${columnId}`);
    }
  }

  for (const columnId of Object.keys(local.facets)) {
    if (!facets.includes(columnId)) {
      throw new Error(`Filtro local sem filtro no servidor: ${columnId}`);
    }
  }

  for (const columnId of Object.keys(local.sorts)) {
    if (!spec.sortable.includes(columnId)) {
      throw new Error(`Ordem local sem ordem no servidor: ${columnId}`);
    }
  }

  return local;
}

export {
  CREATED_THEN_ID,
  LOCAL_TABLE_MAX_ROWS,
  answersLocally,
  applyLocalFacets,
  assertLocalTableSpec,
  completeListKey,
  completeReadQuery,
  disjunctiveCounts,
  hasFacetParams,
  listWindowOf,
  localFacetValue,
  localListView,
  localSelectionOf,
  localSortsAllowed,
  readCompleteList,
  sortLocally,
  unfacetedLowerBound,
  type CompleteListRead,
  type LocalFacetSpec,
  type LocalListView,
  type LocalSelection,
  type LocalSortField,
  type LocalTableSpec,
  type PagedRead,
};
