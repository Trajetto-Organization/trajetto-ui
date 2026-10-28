import { parseNDJSON } from "@/lib/parse-nd-json";
import { readAccessError, type AccessError } from "@/lib/access-error";

import type { DeliveryTab } from "../lib/tabs";
import { deliveryTabListQuery } from "../lib/list-query";

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
}

/** The page's params a list read uses, as Next passes them. */
type ListSearchParams = {
  page?: string;
  pageSize?: string;
  search?: string;
} & Record<string, string | string[] | undefined>;

/**
 * One list, as the API streams it (NDJSON: a meta line, then the rows),
 * with the page, the search, the company and the table's sort, facets and —
 * for the deliveries — period (deliveryTabListQuery).
 */
async function readDeliveryList({
  section,
  token,
  businessId,
  searchParams,
}: {
  section: DeliveryListSection;
  token: string;
  businessId: string | undefined;
  searchParams: ListSearchParams;
}): Promise<DeliveryListRead> {
  const source = LIST_SOURCES[section];

  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;

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
    // The table's sort and facets (decision 8.8); the deliveries' period.
    ...deliveryTabListQuery(section, searchParams),
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
