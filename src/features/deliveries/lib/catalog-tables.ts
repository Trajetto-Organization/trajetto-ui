import {
  assertServerTableSpec,
  serverTableQuery,
  type FacetCount,
  type ServerTableSpec,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import { IMPORT_SOURCE_LABEL, IMPORT_STATUS_META } from "../imports/lib/status";

/**
 * The Entregas catalog tabs on the server (decision 8.8): Embarcadores,
 * Tipos de ocorrência, Motivos and Importações. Sort keys and facet params
 * are the API's (trajetto-api list-shipper, list-occurrence-type,
 * list-status-change-reason and list-imports schemas); the column ids match
 * them. No directive: the server component that asks the API imports this.
 */

const ACTIVE_FACET = {
  param: "status",
  values: ["active", "inactive"],
} as const;
const YES_NO_VALUES = ["yes", "no"] as const;

const SHIPPER_TABLE: ServerTableSpec = assertServerTableSpec({
  sortable: ["name", "created_at", "updated_at"],
  defaultSort: { id: "created_at", desc: true },
  facets: { is_active: ACTIVE_FACET },
});

const OCCURRENCE_TYPE_TABLE: ServerTableSpec = assertServerTableSpec({
  sortable: ["name", "created_at", "updated_at"],
  defaultSort: { id: "created_at", desc: true },
  facets: {
    is_active: ACTIVE_FACET,
    blocks_delivery: { param: "blocking", values: YES_NO_VALUES },
    requires_photo: { param: "photo", values: YES_NO_VALUES },
    // Decision 14.3: Entrega / Não entrega / Pausa.
    category: {
      param: "category",
      values: ["DELIVERED", "NOT_DELIVERED", "PAUSE"],
    },
  },
});

const STATUS_REASON_TABLE: ServerTableSpec = assertServerTableSpec({
  sortable: ["name", "created_at", "updated_at"],
  defaultSort: { id: "created_at", desc: true },
  facets: { is_active: ACTIVE_FACET },
});

const IMPORT_TABLE: ServerTableSpec = assertServerTableSpec({
  sortable: ["created_at", "filename", "imported", "duplicated", "invalid"],
  defaultSort: { id: "created_at", desc: true },
  facets: {
    status: { param: "status", values: Object.keys(IMPORT_STATUS_META) },
    source: { param: "source", values: Object.keys(IMPORT_SOURCE_LABEL) },
  },
});

type CatalogTab =
  "shippers" | "occurrence-types" | "status-change-reasons" | "imports";

const CATALOG_TABLES: Record<CatalogTab, ServerTableSpec> = {
  shippers: SHIPPER_TABLE,
  "occurrence-types": OCCURRENCE_TYPE_TABLE,
  "status-change-reasons": STATUS_REASON_TABLE,
  imports: IMPORT_TABLE,
};

// Own keys only: `in` also accepts "constructor" or "toString" from the URL,
// which would hand Object's own function to serverTableQuery as a spec.
function isCatalogTab(tab: string): tab is CatalogTab {
  return Object.prototype.hasOwnProperty.call(CATALOG_TABLES, tab);
}

/** The labels of the closed sets; the server sends only values and counts. */
const ACTIVE_LABELS = { active: "Ativo", inactive: "Inativo" } as const;
const YES_NO_LABELS = { yes: "Sim", no: "Não" } as const;

const IMPORT_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(IMPORT_STATUS_META).map(([status, meta]) => [
    status,
    meta.label,
  ]),
);

/** A catalog tab's `meta.searchMeta.facets`, keyed by the facet param. */
interface CatalogSearchMeta {
  facets?: Partial<
    Record<
      "status" | "blocking" | "photo" | "source" | "category",
      FacetCount[]
    >
  >;
}

type ParamSource = Parameters<typeof serverTableQuery>[0];

/** The sort and filter params to forward to the catalog tab's listing. */
function catalogListQuery(
  tab: CatalogTab,
  searchParams: ParamSource,
): Record<string, string> {
  return serverTableQuery(searchParams, CATALOG_TABLES[tab]);
}

export {
  ACTIVE_LABELS,
  CATALOG_TABLES,
  IMPORT_STATUS_LABELS,
  IMPORT_TABLE,
  OCCURRENCE_TYPE_TABLE,
  SHIPPER_TABLE,
  STATUS_REASON_TABLE,
  YES_NO_LABELS,
  catalogListQuery,
  isCatalogTab,
  type CatalogSearchMeta,
  type CatalogTab,
};
