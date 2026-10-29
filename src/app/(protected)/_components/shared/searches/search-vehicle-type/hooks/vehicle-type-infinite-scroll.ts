import { useCursorSearch } from "@/hooks/use-cursor-search";

import type { FetchVehicleTypeResult } from "../search-vehicle-type.types";

/**
 * Vehicle types of a company.
 *
 * `search` is the typed term, filtered by the API (see useCursorSearch).
 */
function useVehicleTypeInfiniteScroll(businessId: string, search?: string) {
  const { items, ...list } = useCursorSearch<
    FetchVehicleTypeResult["data"][number]
  >({
    queryKey: ["vehicle_type", businessId],
    path: "/vehicle-type/search-vehicle-type-business",
    params: { businessId },
    search,
    enabled: !!businessId,
    fallbackError: "Erro ao carregar tipos de veículos",
  });

  return { vehicleTypes: items, ...list };
}

export { useVehicleTypeInfiniteScroll };
