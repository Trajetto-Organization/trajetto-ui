import { useCursorSearch } from "@/hooks/use-cursor-search";

import type { FetchServiceOrderByVehicleResult } from "../search-service-order-by-vehicle.types";

/**
 * Service orders of one vehicle.
 *
 * `search` is the typed term, filtered by the API (see useCursorSearch).
 */
function useServiceOrderByVehicleInfiniteScroll(
  vehicleId: string,
  businessId: string,
  search?: string,
) {
  const { items, ...list } = useCursorSearch<
    FetchServiceOrderByVehicleResult["data"][number]
  >({
    queryKey: ["service-order", vehicleId, businessId],
    path: `/service-order/search-service-order-by-vehicle/${encodeURIComponent(vehicleId)}`,
    search,
    enabled: !!vehicleId && !!businessId,
    fallbackError: "Erro ao carregar ordens de serviço",
  });

  return { serviceOrders: items, ...list };
}

export { useServiceOrderByVehicleInfiniteScroll };
