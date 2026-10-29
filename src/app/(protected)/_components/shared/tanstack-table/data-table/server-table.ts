import type { ComponentType } from "react";
import type { ColumnFiltersState, SortingState } from "@tanstack/react-table";

/**
 * Server-side sort and facet filters for a DataTable (decision 8.8).
 *
 * The table used to sort and filter the page it had loaded: ten rows ordered
 * "by date" while the pager said forty pages, "Impeditivas" among those ten
 * only. A list that opts in keeps its sort and facets in the URL, the server
 * component forwards them to the API, and the API answers for the whole set.
 *
 * Wire format, the same in the URL and in the API query (mirrored by
 * trajetto-api/src/shared/pagination/list-query.ts):
 *   ?sort=<column id>&order=asc|desc&<facet param>=<v1>,<v2>
 *
 * No directive and no hooks: the server component that builds the API request
 * imports this module too. A spec is plain data so it may cross into the
 * client component as a prop.
 */

interface ServerFacetSpec {
  /** Query param in the URL and in the API request. */
  param: string;
  /** Accepted values; anything else in the URL is dropped. */
  values: readonly string[] | "uuid";
}

interface ServerTableSpec {
  /** Column ids the API can order by. The URL `sort` value is the column id. */
  sortable: readonly string[];
  /** The order the API applies when the URL has none, drawn on its column. */
  defaultSort?: { id: string; desc: boolean };
  /** Column id → the facet that column filters on the server. */
  facets: Readonly<Record<string, ServerFacetSpec>>;
}

/** Names a facet may not take: they already mean something in the URL. */
const RESERVED_PARAMS = [
  "page",
  "pageSize",
  "search",
  "sort",
  "order",
  "tab",
  "businessId",
  "view",
  "period",
] as const;

/** A facet carries at most this many values, like the API accepts. */
const MAX_FACET_VALUES = 50;

type ParamSource =
  | Pick<URLSearchParams, "get" | "getAll">
  | Record<string, string | string[] | undefined>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readAll(source: ParamSource, name: string): string[] {
  if (typeof (source as URLSearchParams).getAll === "function") {
    return (source as URLSearchParams).getAll(name);
  }

  const value = (source as Record<string, string | string[] | undefined>)[name];

  if (value === undefined) return [];

  return Array.isArray(value) ? value : [value];
}

function readOne(source: ParamSource, name: string): string | undefined {
  return readAll(source, name)[0];
}

function accepts(facet: ServerFacetSpec, value: string): boolean {
  return facet.values === "uuid"
    ? UUID.test(value)
    : facet.values.includes(value);
}

/** The facet's values in the URL: split, trimmed, known, without repeats. */
function readFacetValues(
  source: ParamSource,
  facet: ServerFacetSpec,
): string[] {
  const values = readAll(source, facet.param)
    .flatMap((raw) => raw.split(","))
    .map((value) => value.trim())
    .filter((value) => value && accepts(facet, value));

  return Array.from(new Set(values)).slice(0, MAX_FACET_VALUES);
}

/**
 * The sort the URL asks for, when the list can honour it; else the default.
 * An unknown column (an old bookmark) falls back instead of reaching the API.
 */
function readSorting(source: ParamSource, spec: ServerTableSpec): SortingState {
  const sort = readOne(source, "sort");

  if (sort && spec.sortable.includes(sort)) {
    return [{ id: sort, desc: readOne(source, "order") === "desc" }];
  }

  return spec.defaultSort ? [{ ...spec.defaultSort }] : [];
}

function readColumnFilters(
  source: ParamSource,
  spec: ServerTableSpec,
): ColumnFiltersState {
  return Object.entries(spec.facets).flatMap(([id, facet]) => {
    const values = readFacetValues(source, facet);

    return values.length > 0 ? [{ id, value: values }] : [];
  });
}

/** Another sort or filter is another result: its first page, not page 7. */
function restartPaging(params: URLSearchParams): void {
  params.delete("page");
}

function writeSorting(
  current: ParamSource,
  sorting: SortingState,
  spec: ServerTableSpec,
): URLSearchParams {
  const params = toSearchParams(current);
  const [first] = sorting;

  const isDefault =
    !first ||
    (spec.defaultSort?.id === first.id && spec.defaultSort.desc === first.desc);

  if (isDefault || !spec.sortable.includes(first.id)) {
    params.delete("sort");
    params.delete("order");
  } else {
    params.set("sort", first.id);
    params.set("order", first.desc ? "desc" : "asc");
  }

  restartPaging(params);

  return params;
}

function writeColumnFilters(
  current: ParamSource,
  filters: ColumnFiltersState,
  spec: ServerTableSpec,
): URLSearchParams {
  const params = toSearchParams(current);

  for (const [id, facet] of Object.entries(spec.facets)) {
    const filter = filters.find((entry) => entry.id === id);

    const values = Array.isArray(filter?.value)
      ? (filter.value as unknown[])
          .map(String)
          .filter((value) => accepts(facet, value))
      : [];

    if (values.length > 0) {
      params.set(facet.param, Array.from(new Set(values)).join(","));
    } else {
      params.delete(facet.param);
    }
  }

  restartPaging(params);

  return params;
}

function toSearchParams(source: ParamSource): URLSearchParams {
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
 * The sort and facet params to forward to the API, from the page's
 * searchParams. Only what the spec declares and accepts goes out; the
 * default sort is left to the API.
 */
function serverTableQuery(
  source: ParamSource,
  spec: ServerTableSpec,
): Record<string, string> {
  const query: Record<string, string> = {};
  const sort = readOne(source, "sort");

  if (sort && spec.sortable.includes(sort)) {
    query.sort = sort;
    query.order = readOne(source, "order") === "desc" ? "desc" : "asc";
  }

  for (const facet of Object.values(spec.facets)) {
    const values = readFacetValues(source, facet);

    if (values.length > 0) query[facet.param] = values.join(",");
  }

  return query;
}

/** One option of a server facet, as the API's `searchMeta.facets` sends it. */
interface FacetCount {
  value: string;
  label?: string;
  count: number;
}

interface FacetOption {
  value: string;
  label: string;
  count?: number;
  icon?: ComponentType<{ className?: string }>;
}

/**
 * The filter options: a closed set labelled here (with the server's counts
 * when it sends them), or a catalog the server lists and names.
 */
function facetOptions(
  counts: FacetCount[] | undefined,
  labels?: Readonly<Record<string, string>>,
): FacetOption[] {
  if (labels) {
    const byValue = new Map(
      (counts ?? []).map((entry) => [entry.value, entry]),
    );

    return Object.entries(labels).map(([value, label]) => ({
      value,
      label,
      count: byValue.get(value)?.count,
    }));
  }

  return (counts ?? []).map((entry) => ({
    value: entry.value,
    label: entry.label ?? entry.value,
    count: entry.count,
  }));
}

/** A spec whose facet params collide with the page's own params is a bug. */
function assertServerTableSpec(spec: ServerTableSpec): ServerTableSpec {
  for (const facet of Object.values(spec.facets)) {
    if ((RESERVED_PARAMS as readonly string[]).includes(facet.param)) {
      throw new Error(`Parâmetro de filtro reservado: ${facet.param}`);
    }
  }

  return spec;
}

export {
  MAX_FACET_VALUES,
  RESERVED_PARAMS,
  assertServerTableSpec,
  facetOptions,
  readColumnFilters,
  readSorting,
  serverTableQuery,
  writeColumnFilters,
  writeSorting,
  type FacetCount,
  type FacetOption,
  type ServerFacetSpec,
  type ServerTableSpec,
};
