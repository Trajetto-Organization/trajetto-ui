import { useCursorSearch } from "@/hooks/use-cursor-search";

import type { FetchVehicleResult } from "../search-vehicle-types";

/**
 * Vehicles of a company.
 *
 * `search` is the typed term, filtered by the API (see useCursorSearch).
 */
function useVehicleInfiniteScroll(businessId: string, search?: string) {
  const { items, ...list } = useCursorSearch<
    FetchVehicleResult["data"][number]
  >({
    queryKey: ["vehicle", businessId],
    path: "/vehicle/search-vehicle-business",
    params: { businessId },
    search,
    enabled: !!businessId,
    fallbackError: "Erro ao carregar veículos",
  });

  return { vehicles: items, ...list };
}

export { useVehicleInfiniteScroll };
