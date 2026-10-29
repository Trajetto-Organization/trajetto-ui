import { useCursorSearch } from "@/hooks/use-cursor-search";

import type { FetchAccountPayableByResponsibleUserResult } from "../search-account-payable-by-responsible-user.types";

/**
 * The accounts payable the signed-in user is responsible for (the API scopes them).
 *
 * `search` is the typed term, filtered by the API (see useCursorSearch).
 */
function useAccountPayableByResponsibleUserInfiniteScroll(search?: string) {
  const { items, ...list } = useCursorSearch<
    FetchAccountPayableByResponsibleUserResult["data"][number]
  >({
    queryKey: ["account-payables-by-responsible-user"],
    path: "/account-payable/search-account-payable-by-responsible-user",
    search,
    fallbackError: "Erro ao carregar contas a pagar",
  });

  return { accountPayables: items, ...list };
}

export { useAccountPayableByResponsibleUserInfiniteScroll };
