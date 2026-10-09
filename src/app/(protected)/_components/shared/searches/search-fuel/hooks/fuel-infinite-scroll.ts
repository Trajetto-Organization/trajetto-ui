import { useCursorSearch } from "@/hooks/use-cursor-search";

import type { FetchFuelResult } from "../search-fuel.types";

/**
 * Refuelings of one vehicle.
 *
 * `search` is the typed term, filtered by the API (see useCursorSearch).
 */
function useFuelInfiniteScroll(
  vehicleId: string,
  businessId: string,
  search?: string,
) {
  const { items, ...list } = useCursorSearch<FetchFuelResult["data"][number]>({
    queryKey: ["fuel", vehicleId, businessId],
    path: `/fuel/search-fuel-by-vehicle/${encodeURIComponent(vehicleId)}`,
    search,
    enabled: !!vehicleId && !!businessId,
    fallbackError: "Erro ao carregar abastecimentos",
  });

  return { fuels: items, ...list };
}

export { useFuelInfiniteScroll };
