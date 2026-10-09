"use client";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

/**
 * What a successful write refreshes in THIS tab: the list (the server fetch
 * tagged with the action's name) and every profile picker (the
 * `["profile", businessId]` keys). Other tabs hear the API's
 * `catalogChanged` (profile_access) for the same keys.
 */
async function refreshAfterProfileWrite(
  tag:
    "create-profile-access" | "update-profile-access" | "delete-profile-access",
): Promise<void> {
  await Promise.all([
    revalidateTagName(tag),
    queryClientProps.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) && query.queryKey[0] === "profile",
    }),
  ]);
}

export { refreshAfterProfileWrite };
