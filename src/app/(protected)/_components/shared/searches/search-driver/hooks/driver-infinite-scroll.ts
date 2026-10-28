import {
  SYNCED_CATALOG_STALE_TIME_MS,
  containsTerm,
  useCursorSearch,
} from "@/hooks/use-cursor-search";

import type { FetchDriverResult } from "../search-driver.types";

type DriverItem = FetchDriverResult["data"][number];

/**
 * The API's driver search (searchDriverWithCursor): the name, and the CNH
 * when the reader may see it. The dispatcher's rows come without the CNH,
 * exactly as the API then stops searching it.
 */
function driverMatches(driver: DriverItem, term: string): boolean {
  return containsTerm([driver.name, driver.cnh], term);
}

/**
 * Drivers of a company.
 *
 * `search` is the typed term, filtered by the API (see useCursorSearch). The
 * list is kept fresh by `catalogChanged` (catalog-sync's `driver` root), so
 * it is trusted for minutes instead of seconds.
 */
function useDriverInfiniteScroll(businessId: string, search?: string) {
  const { items, ...list } = useCursorSearch<DriverItem>({
    queryKey: ["driver", businessId],
    path: "/driver/search-driver-business",
    params: { businessId },
    search,
    enabled: !!businessId,
    fallbackError: "Erro ao carregar motoristas",
    staleTime: SYNCED_CATALOG_STALE_TIME_MS,
    matches: driverMatches,
  });

  return { drivers: items, ...list };
}

export { driverMatches, useDriverInfiniteScroll };
