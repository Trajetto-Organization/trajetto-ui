import {
  assertServerTableSpec,
  serverTableQuery,
  type FacetCount,
  type ServerTableSpec,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import { DELIVERY_STATUS_META } from "../lib/status";

/**
 * The occurrence feed's server-side table (decision 8.8): the pilot of the
 * list contract. Sort keys and facet params are the API's
 * (trajetto-api list-occurrences-schema); the column ids match them, so the
 * URL `sort` value is the column id. No directive: the server component that
 * asks the API imports this too.
 */
const OCCURRENCE_TABLE: ServerTableSpec = assertServerTableSpec({
  sortable: ["created_at", "typeName", "blocking", "recipient", "reporter"],
  defaultSort: { id: "created_at", desc: true },
  facets: {
    blocking: { param: "severity", values: ["blocking", "informational"] },
    // Decision 14.3: proofs are DELIVERED rows of the same feed.
    category: { param: "category", values: ["DELIVERED", "NOT_DELIVERED"] },
    typeName: { param: "occurrenceTypeId", values: "uuid" },
    deliveryStatus: {
      param: "deliveryStatus",
      values: Object.keys(DELIVERY_STATUS_META),
    },
  },
});

const SEVERITY_LABELS = {
  blocking: "Impeditiva",
  informational: "Informativa",
} as const;

/** Decision 14.3, the words of the type dialog. */
const CATEGORY_LABELS = {
  DELIVERED: "Entrega",
  NOT_DELIVERED: "Não entrega",
} as const;

/** A row's category; an API older than the field only had problems. */
function occurrenceCategory(row: {
  category?: string;
}): keyof typeof CATEGORY_LABELS {
  return row.category === "DELIVERED" ? "DELIVERED" : "NOT_DELIVERED";
}

const DELIVERY_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(DELIVERY_STATUS_META).map(([status, meta]) => [
    status,
    meta.label,
  ]),
);

/** The feed's `meta.searchMeta`, as the API streams it. */
interface OccurrenceFeedSearchMeta {
  total?: number;
  blocking?: number;
  informational?: number;
  /** Decision 14.3: proofs, outside both severities. */
  delivered?: number;
  facets?: {
    severity?: FacetCount[];
    category?: FacetCount[];
    occurrenceTypeId?: FacetCount[];
  };
}

type PageSearchParams = Record<string, string | string[] | undefined>;

/**
 * The sort and filter params to add to `/delivery/list-occurrences`, read
 * from the page's searchParams. Next to page, pageSize, search and
 * businessId, which the page already sends.
 */
function occurrencesListQuery(
  searchParams: PageSearchParams,
): Record<string, string> {
  return serverTableQuery(searchParams, OCCURRENCE_TABLE);
}

export {
  CATEGORY_LABELS,
  DELIVERY_STATUS_LABELS,
  OCCURRENCE_TABLE,
  SEVERITY_LABELS,
  occurrenceCategory,
  occurrencesListQuery,
  type OccurrenceFeedSearchMeta,
};
