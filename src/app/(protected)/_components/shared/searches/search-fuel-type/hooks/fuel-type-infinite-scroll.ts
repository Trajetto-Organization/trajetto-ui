import { useCursorSearch } from "@/hooks/use-cursor-search";

import type { FetchFuelTypeResult } from "../search-fuel-type.types";

/**
 * Fuel types of a company.
 *
 * `search` is the typed term, filtered by the API (see useCursorSearch).
 */
function useFuelTypeInfiniteScroll(businessId: string, search?: string) {
  const { items, ...list } = useCursorSearch<
    FetchFuelTypeResult["data"][number]
  >({
    queryKey: ["fuel_type", businessId],
    path: "/fuel-type/search-fuel-type-business",
    params: { businessId },
    search,
    enabled: !!businessId,
    fallbackError: "Erro ao carregar tipos de combustível",
  });

  return { fuelTypes: items, ...list };
}

export { useFuelTypeInfiniteScroll };
