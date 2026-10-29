import { useCursorSearch } from "@/hooks/use-cursor-search";

import type { FetchBranchResult } from "../search-branch.types";

/**
 * Branches of a company.
 *
 * `search` is the typed term, filtered by the API (see useCursorSearch).
 */
function useBranchInfiniteScroll(businessId: string, search?: string) {
  const { items, ...list } = useCursorSearch<FetchBranchResult["data"][number]>(
    {
      queryKey: ["branch", businessId],
      path: "/branch/search-branch-business",
      params: { businessId },
      search,
      enabled: !!businessId,
      fallbackError: "Erro ao carregar filiais",
    },
  );

  return { branches: items, ...list };
}

export { useBranchInfiniteScroll };
