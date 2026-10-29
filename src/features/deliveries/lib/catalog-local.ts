import type { FacetCount } from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";
import {
  CREATED_THEN_ID,
  assertLocalTableSpec,
  disjunctiveCounts,
  type LocalSelection,
  type LocalTableSpec,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table/local-table";

import { OCCURRENCE_CATEGORIES } from "../occurrence-types/category-rules";

import {
  OCCURRENCE_TYPE_TABLE,
  SHIPPER_TABLE,
  STATUS_REASON_TABLE,
  type CatalogTab,
} from "./catalog-tables";

/**
 * The Entregas catalogs answered in the browser when their whole set is on
 * screen (spec §13, data-table/local-table): Embarcadores, Tipos de
 * ocorrência and Motivos. Importações stays on the server: its rows change
 * while an upload runs. No directive: the server read computes the same key.
 *
 * Each facet reads the row the way the API groups it, each sort is a column
 * the browser orders like Postgres (timestamps; names are the collation's,
 * so they stay server sorts), and the summaries are ports of the API's:
 * trajetto-api shipper-list.ts, occurrence-type-list.ts and
 * status-change-reason-list.ts. Parity is tested against their fixtures.
 */

const ACTIVE_FACET = { is_active: { field: "is_active", read: "active" } };

const DATE_SORTS = {
  created_at: { field: "created_at", kind: "instant" },
  updated_at: { field: "updated_at", kind: "instant" },
} as const;

const SHIPPER_LOCAL = assertLocalTableSpec(SHIPPER_TABLE, {
  facets: ACTIVE_FACET,
  sorts: DATE_SORTS,
  tiebreaker: CREATED_THEN_ID,
} as LocalTableSpec);

const STATUS_REASON_LOCAL = assertLocalTableSpec(STATUS_REASON_TABLE, {
  facets: ACTIVE_FACET,
  sorts: DATE_SORTS,
  tiebreaker: CREATED_THEN_ID,
} as LocalTableSpec);

const OCCURRENCE_TYPE_LOCAL = assertLocalTableSpec(OCCURRENCE_TYPE_TABLE, {
  facets: {
    ...ACTIVE_FACET,
    blocks_delivery: { field: "blocks_delivery", read: "yes-no" },
    requires_photo: { field: "requires_photo", read: "yes-no" },
    category: { field: "category", read: "value" },
  },
  sorts: DATE_SORTS,
  tiebreaker: CREATED_THEN_ID,
} as LocalTableSpec);

type LocalCatalogTab = Extract<
  CatalogTab,
  "shippers" | "occurrence-types" | "status-change-reasons"
>;

const CATALOG_LOCAL: Record<LocalCatalogTab, LocalTableSpec> = {
  shippers: SHIPPER_LOCAL,
  "occurrence-types": OCCURRENCE_TYPE_LOCAL,
  "status-change-reasons": STATUS_REASON_LOCAL,
};

function isLocalCatalogTab(tab: string): tab is LocalCatalogTab {
  return Object.prototype.hasOwnProperty.call(CATALOG_LOCAL, tab);
}

function countOf(options: readonly FacetCount[] | undefined, value: string) {
  return options?.find((option) => option.value === value)?.count ?? 0;
}

type CatalogMeta = Record<string, unknown>;

/**
 * Tipos de ocorrência: four facets, so the cards move with the selection.
 * Port of summarizeOccurrenceTypeList: every count by the disjunctive rule,
 * "Total" the Status breakdown's whole.
 */
function summarizeOccurrenceTypes(
  rows: readonly unknown[],
  selection: LocalSelection,
  base: CatalogMeta | undefined,
): CatalogMeta {
  const facets = disjunctiveCounts(
    rows,
    OCCURRENCE_TYPE_TABLE,
    OCCURRENCE_TYPE_LOCAL,
    selection,
    {
      status: ["active", "inactive"],
      blocking: ["yes", "no"],
      photo: ["yes", "no"],
      category: OCCURRENCE_CATEGORIES,
    },
  );

  const active = countOf(facets.status, "active");

  return {
    ...base,
    total: active + countOf(facets.status, "inactive"),
    active,
    blocking: countOf(facets.blocking, "yes"),
    requiringPhoto: countOf(facets.photo, "yes"),
    facets,
  };
}

/**
 * Embarcadores and Motivos: Status is the only facet, and the API counts
 * every card and the Status options without it (summarizeShipperList,
 * summarizeStatusReasonList: total, active, withCnpj and used are taken over
 * the search alone). So the answer with any Status selection IS the answer
 * without one, which is what the complete read brought; only the pager
 * total moves, and the table counts that.
 */
function summarizeSingleFacet(
  _rows: readonly unknown[],
  _selection: LocalSelection,
  base: CatalogMeta | undefined,
): CatalogMeta | undefined {
  return base;
}

const CATALOG_SUMMARIES: Record<
  LocalCatalogTab,
  (
    rows: readonly unknown[],
    selection: LocalSelection,
    base: CatalogMeta | undefined,
  ) => CatalogMeta | undefined
> = {
  shippers: summarizeSingleFacet,
  "occurrence-types": summarizeOccurrenceTypes,
  "status-change-reasons": summarizeSingleFacet,
};

export {
  CATALOG_LOCAL,
  CATALOG_SUMMARIES,
  isLocalCatalogTab,
  summarizeOccurrenceTypes,
  summarizeSingleFacet,
  type LocalCatalogTab,
};
