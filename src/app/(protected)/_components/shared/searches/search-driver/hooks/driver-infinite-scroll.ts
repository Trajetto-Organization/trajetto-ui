import { useCursorSearch } from "@/hooks/use-cursor-search";

import type { FetchDriverResult } from "../search-driver.types";

/**
 * Drivers of a company.
 *
 * `search` is the typed term, filtered by the API (see useCursorSearch).
 */
function useDriverInfiniteScroll(businessId: string, search?: string) {
  const { items, ...list } = useCursorSearch<FetchDriverResult["data"][number]>(
    {
      queryKey: ["driver", businessId],
      path: "/driver/search-driver-business",
      params: { businessId },
      search,
      enabled: !!businessId,
      fallbackError: "Erro ao carregar motoristas",
    },
  );

  return { drivers: items, ...list };
}

export { useDriverInfiniteScroll };
