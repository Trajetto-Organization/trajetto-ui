import { serverTableQuery } from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import { DELIVERY_TABLE } from "../deliveries/server-table";
import { OCCURRENCE_TABLE } from "../occurrences/server-table";

import { catalogListQuery, isCatalogTab } from "./catalog-tables";

/** The page's searchParams (server) or the URL's (client). */
type ParamSource = Parameters<typeof serverTableQuery>[0];

/**
 * The sort and facet params every Entregas table forwards to its listing
 * (decision 8.8), one call for the page: deliveries, occurrences and the
 * four catalog tabs. The panels (monitoring, chat, messages, audit) send none.
 */
function deliveryTabListQuery(
  tab: string,
  searchParams: ParamSource,
): Record<string, string> {
  if (tab === "deliveries")
    return serverTableQuery(searchParams, DELIVERY_TABLE);
  if (tab === "occurrences")
    return serverTableQuery(searchParams, OCCURRENCE_TABLE);
  if (isCatalogTab(tab)) return catalogListQuery(tab, searchParams);

  return {};
}

export { deliveryTabListQuery };
