import { useCursorSearch } from "@/hooks/use-cursor-search";

import type { FetchUserResult } from "../search-user.types";

/**
 * Users of a company.
 *
 * `search` is the typed term, filtered by the API (see useCursorSearch).
 */
function useUserInfiniteScroll(businessId: string, search?: string) {
  const { items, ...list } = useCursorSearch<FetchUserResult["data"][number]>({
    queryKey: ["user", businessId],
    path: "/user/search-user-business",
    params: { businessId },
    search,
    enabled: !!businessId,
    fallbackError: "Erro ao carregar usuários",
  });

  return { users: items, ...list };
}

export { useUserInfiniteScroll };
