import { useCursorSearch } from "@/hooks/use-cursor-search";

import type { FetchProfileResult } from "../search-profile-access.types";

/**
 * Access profiles of a company.
 *
 * `search` is the typed term, filtered by the API (see useCursorSearch).
 * `editableOnly` asks for the profiles whose permissions the viewer may
 * change: the API leaves a user's own profile out (the permission form).
 */
function useProfileInfiniteScroll(
  businessId: string,
  search?: string,
  editableOnly = false,
) {
  const { items, ...list } = useCursorSearch<
    FetchProfileResult["data"][number]
  >({
    // Its own cache entry: the two answers differ for a user with a profile.
    queryKey: ["profile", businessId, editableOnly ? "editable" : "all"],
    path: "/profile-access/search-profile-business",
    params: { businessId, editable: editableOnly ? "true" : undefined },
    search,
    enabled: !!businessId,
    fallbackError: "Erro ao carregar perfis",
  });

  return { profiles: items, ...list };
}

export { useProfileInfiniteScroll };
