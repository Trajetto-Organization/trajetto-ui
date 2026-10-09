import { useCursorSearch } from "@/hooks/use-cursor-search";

import type { FetchBusinessResult } from "../search-business.types";

/**
 * Companies, for the MASTER selector and forms.
 *
 * `search` is the typed term, filtered by the API (see useCursorSearch).
 */
function useBusinessInfiniteScroll(search?: string) {
  const { items, ...list } = useCursorSearch<
    FetchBusinessResult["data"][number]
  >({
    queryKey: ["business"],
    path: "/business/search-business",
    search,
    fallbackError: "Erro ao carregar empresas",
  });

  return { business: items, ...list };
}

export { useBusinessInfiniteScroll };
