import { useCursorSearch } from "@/hooks/use-cursor-search";

import type { FetchSupplierResult } from "../search-supplier.types";

/**
 * Suppliers of a company.
 *
 * `search` is the typed term, filtered by the API (see useCursorSearch).
 */
function useSupplierInfiniteScroll(businessId: string, search?: string) {
  const { items, ...list } = useCursorSearch<
    FetchSupplierResult["data"][number]
  >({
    queryKey: ["supplier", businessId],
    path: "/supplier/search-supplier-business",
    params: { businessId },
    search,
    enabled: !!businessId,
    fallbackError: "Erro ao carregar fornecedores",
  });

  return { suppliers: items, ...list };
}

export { useSupplierInfiniteScroll };
