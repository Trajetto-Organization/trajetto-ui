"use client";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

/**
 * What a successful create/update/delete refreshes in THIS tab: the list (the
 * server fetch tagged with the action's name) and every driver picker (the
 * `["driver", businessId]` keys). Other tabs and sessions hear the API's
 * `catalogChanged` for the same keys.
 */
async function refreshAfterDriverWrite(
  tag: "create-driver" | "update-driver" | "delete-driver",
): Promise<void> {
  await Promise.all([
    revalidateTagName(tag),
    queryClientProps.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) && query.queryKey[0] === "driver",
    }),
  ]);
}

export { refreshAfterDriverWrite };
