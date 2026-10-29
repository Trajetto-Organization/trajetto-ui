import { useCursorSearch } from "@/hooks/use-cursor-search";

import type { FetchPartResult } from "../search-part.types";

/**
 * Parts of a company.
 *
 * `search` is the typed term, filtered by the API (see useCursorSearch).
 */
function usePartInfiniteScroll(businessId: string, search?: string) {
  const { items, ...list } = useCursorSearch<FetchPartResult["data"][number]>({
    queryKey: ["part", businessId],
    path: "/part/search-part-business",
    params: { businessId },
    search,
    enabled: !!businessId,
    fallbackError: "Erro ao carregar peças",
  });

  return { parts: items, ...list };
}

export { usePartInfiniteScroll };
