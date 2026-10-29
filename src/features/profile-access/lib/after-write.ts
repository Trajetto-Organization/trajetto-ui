"use client";

import { queryClientProps } from "@/lib/query-client-props";

/**
 * What a successful write refreshes in THIS tab: every profile picker (the
 * `["profile", businessId]` keys). Other tabs hear the API's
 * `catalogChanged` (profile_access) for the same keys.
 *
 * The list itself is not refreshed from here: the write action revalidates
 * and its own response carries the re-rendered screen. Asking for it again
 * (the `revalidateTagName` action this used to call) was a second round trip
 * per save, and a second full render of the layout.
 */
async function refreshAfterProfileWrite(): Promise<void> {
  await queryClientProps.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) && query.queryKey[0] === "profile",
  });
}

export { refreshAfterProfileWrite };
