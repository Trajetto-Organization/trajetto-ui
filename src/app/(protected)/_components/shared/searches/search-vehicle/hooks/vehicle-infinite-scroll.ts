import {
  SYNCED_CATALOG_STALE_TIME_MS,
  containsTerm,
  useCursorSearch,
} from "@/hooks/use-cursor-search";

import type { FetchVehicleResult } from "../search-vehicle-types";

type VehicleItem = FetchVehicleResult["data"][number];

/**
 * The API's vehicle search (searchVehicleWithCursor): description, plate,
 * brand, model and RENAVAM. The dispatcher's rows carry only some of them;
 * a term none of the loaded rows matches still goes to the server.
 */
function vehicleMatches(vehicle: VehicleItem, term: string): boolean {
  return containsTerm(
    [
      vehicle.description,
      vehicle.license_plate,
      vehicle.brand,
      vehicle.model,
      vehicle.renavam,
    ],
    term,
  );
}

/**
 * Vehicles of a company.
 *
 * `search` is the typed term, filtered by the API (see useCursorSearch). The
 * list is kept fresh by `catalogChanged` (catalog-sync's `vehicle` root), so
 * it is trusted for minutes instead of seconds.
 */
function useVehicleInfiniteScroll(businessId: string, search?: string) {
  const { items, ...list } = useCursorSearch<VehicleItem>({
    queryKey: ["vehicle", businessId],
    path: "/vehicle/search-vehicle-business",
    params: { businessId },
    search,
    enabled: !!businessId,
    fallbackError: "Erro ao carregar veículos",
    staleTime: SYNCED_CATALOG_STALE_TIME_MS,
    matches: vehicleMatches,
  });

  return { vehicles: items, ...list };
}

export { useVehicleInfiniteScroll, vehicleMatches };
