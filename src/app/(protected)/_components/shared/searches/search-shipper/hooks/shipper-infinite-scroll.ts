import { useCursorSearch } from "@/hooks/use-cursor-search";

import type { FetchShipperResult } from "../search-shipper.types";

/**
 * Active shippers of a company, for the delivery form and the spreadsheet import.
 *
 * `search` is the typed term, filtered by the API (see useCursorSearch).
 */
function useShipperInfiniteScroll(businessId: string, search?: string) {
  const { items, ...list } = useCursorSearch<
    FetchShipperResult["data"][number]
  >({
    queryKey: ["shipper", businessId],
    path: "/shipper/search-shipper-business",
    params: { businessId },
    search,
    enabled: !!businessId,
    fallbackError: "Erro ao carregar embarcadores",
  });

  return { shippers: items, ...list };
}

export { useShipperInfiniteScroll };
