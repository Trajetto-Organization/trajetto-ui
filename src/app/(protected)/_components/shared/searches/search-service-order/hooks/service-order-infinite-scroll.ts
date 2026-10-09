import { useCursorSearch } from "@/hooks/use-cursor-search";

import type { FetchServiceOrderResult } from "../search-service-order.types";

/**
 * Service orders of a company.
 *
 * `search` is the typed term, filtered by the API (see useCursorSearch).
 */
function useServiceOrderInfiniteScroll(businessId: string, search?: string) {
  const { items, ...list } = useCursorSearch<
    FetchServiceOrderResult["data"][number]
  >({
    queryKey: ["service_order", businessId],
    path: "/service-order/search-service-order-business",
    params: { businessId },
    search,
    enabled: !!businessId,
    fallbackError: "Erro ao carregar ordens de serviço",
  });

  return { serviceOrders: items, ...list };
}

export { useServiceOrderInfiniteScroll };
