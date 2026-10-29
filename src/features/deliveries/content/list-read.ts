import { parseNDJSON } from "@/lib/parse-nd-json";
import { readAccessError, type AccessError } from "@/lib/access-error";
import {
  completeReadQuery,
  readCompleteList,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table/local-table";

import type { DeliveryTab } from "../lib/tabs";
import { deliveryTabListQuery } from "../lib/list-query";
import { CATALOG_TABLES } from "../lib/catalog-tables";
import { CATALOG_LOCAL, isLocalCatalogTab } from "../lib/catalog-local";

/**
 * The server read of a list section of Entregas — and of the Torre's
 * Ocorrências, which is the same table moved (meeting of 14/10/2026). No
 * directive: only server components import it.
 */
type DeliveryListSection =
  | "deliveries"
  | "shippers"
  | "occurrences"
  | "occurrence-types"
  | "status-change-reasons"
  | "imports";

/** Each list is a different endpoint, cache tag and empty state. */
const LIST_SOURCES: Record<
  DeliveryListSection,
  { path: string; tag: string; errorMessage: string }
> = {
  deliveries: {
    path: "/delivery/list-delivery",
    tag: "update-delivery",
    errorMessage: "Houve um erro ao tentar recuperar a lista de entregas",
  },
  shippers: {
    path: "/shipper/list-shipper",
    tag: "update-shipper",
    errorMessage: "Houve um erro ao tentar recuperar a lista de embarcadores",
  },
  occurrences: {
    path: "/delivery/list-occurrences",
    tag: "update-delivery",
    errorMessage: "Houve um erro ao tentar recuperar as ocorrências",
  },
  "occurrence-types": {
    path: "/occurrence-type/list-occurrence-type",
    tag: "update-occurrence-type",
    errorMessage: "Houve um erro ao tentar recuperar os tipos de ocorrência",
  },
  "status-change-reasons": {
    path: "/status-change-reason/list-status-change-reason",
    tag: "update-status-change-reason",
    errorMessage: "Houve um erro ao tentar recuperar os motivos de status",
  },
  imports: {
    path: "/import/list-imports",
    tag: "update-import",
    errorMessage: "Houve um erro ao tentar recuperar as importações",
  },
};

function isDeliveryListSection(tab: DeliveryTab): tab is DeliveryListSection {
  return tab in LIST_SOURCES;
}

interface DeliveryListRead {
  rows: unknown[];
  meta: { total: number; page: number; pageSize: number };
  searchMeta?: Record<string, unknown>;
  responseError: { error: boolean; errorMessage: string };
  /** The API's named refusal (module, permission, inactive company). */
  refusal: AccessError | null;
  /** 401: the session is gone; the caller sends the person to the login. */
  unauthorized: boolean;
  /**
   * The rows are the whole set for the URL's search and company (a catalog
   * answered in the browser, data-table/local-table): its key. Absent, the
   * rows are the server's page.
   */
  complete?: string;
}

/** The page's params a list read uses, as Next passes them. */
type ListSearchParams = {
  page?: string;
  pageSize?: string;
  search?: string;
} & Record<string, string | string[] | undefined>;

interface ListReadInput {
  section: DeliveryListSection;
  token: string;
  businessId: string | undefined;
  searchParams: ListSearchParams;
}

/**
 * One list, as the API streams it (NDJSON: a meta line, then the rows),
 * with the page, the search, the company and the table's sort, facets and —
 * for the deliveries — period (deliveryTabListQuery).
 *
 * Embarcadores, Tipos de ocorrência and Motivos may come back WHOLE instead
 * (spec §13): when the search's set fits in one read, the browser answers
 * their filters, date sorts and pages with no request (readCompleteList says
 * how many reads that costs: one, or two with filters in the URL).
 */
async function readDeliveryList(
  input: ListReadInput,
): Promise<DeliveryListRead> {
  const { section, searchParams } = input;

  if (!isLocalCatalogTab(section)) return readListOnce(input, false);

  return readCompleteList({
    source: searchParams,
    spec: CATALOG_TABLES[section],
    local: CATALOG_LOCAL[section],
    read: ({ complete }) => readListOnce(input, complete),
    isOk: (read) =>
      !read.unauthorized && !read.refusal && !read.responseError.error,
  });
}

/** One request: the URL's page, or the complete read (page 1 of 100). */
async function readListOnce(
  { section, token, businessId, searchParams }: ListReadInput,
  complete: boolean,
): Promise<DeliveryListRead> {
  const source = LIST_SOURCES[section];

  // The complete read: page 1 of 100, the URL's sort, no facet. Otherwise
  // the URL's page with the table's sort and facets (decision 8.8) and the
  // deliveries' period.
  const {
    page: pageParam,
    pageSize: pageSizeParam,
    ...listParams
  } = complete && isLocalCatalogTab(section)
    ? completeReadQuery(searchParams, CATALOG_TABLES[section])
    : {
        page: String(Number(searchParams.page) || 1),
        pageSize: String(Number(searchParams.pageSize) || 10),
        ...deliveryTabListQuery(section, searchParams),
      };

  const page = Number(pageParam);
  const pageSize = Number(pageSizeParam);

  const read: DeliveryListRead = {
    rows: [],
    meta: { total: 0, page, pageSize },
    responseError: { error: false, errorMessage: "" },
    refusal: null,
    unauthorized: false,
  };

  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    search: searchParams.search || "",
    ...(businessId && { businessId }),
    ...listParams,
    // Four counters per upload are what the tab draws; each row's per-line
    // report (MBs on a big tenant) is read by the report dialog itself.
    ...(section === "imports" && { includeReport: "false" }),
  });

  let response: Response;

  try {
    response = await fetch(
      `${process.env.HTTP_REQUEST}${source.path}?${query.toString()}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${token}`,
        },
        next: { tags: [source.tag] },
      },
    );
  } catch {
    read.responseError = {
      error: true,
      errorMessage: `Ocorreu um erro inesperado ao tentar recuperar ${
        section === "deliveries" ? "as entregas" : "os dados"
      }`,
    };

    return read;
  }

  if (!response.ok) {
    if (response.status === 401) {
      read.unauthorized = true;
    } else if (response.status === 403) {
      // A 403 whose body could not be read is still not the module state.
      read.refusal = (await readAccessError(response)) ?? {
        kind: "permission-denied",
        message: null,
      };
    } else {
      read.responseError = { error: true, errorMessage: source.errorMessage };
    }

    return read;
  }

  const { meta, data } = await parseNDJSON(response);

  read.rows = data;
  read.meta = meta ?? { total: data.length, page, pageSize };
  read.searchMeta = meta?.searchMeta;

  return read;
}

export {
  LIST_SOURCES,
  isDeliveryListSection,
  readDeliveryList,
  type DeliveryListRead,
  type DeliveryListSection,
  type ListSearchParams,
};
