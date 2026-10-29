"use client";

import { queryClientProps } from "@/lib/query-client-props";

/**
 * What a successful create/update/delete refreshes in THIS tab: every driver
 * picker (the `["driver", businessId]` keys). Other tabs and sessions hear
 * the API's `catalogChanged` for the same keys.
 *
 * The list itself is not refreshed from here: the write action revalidates
 * and its own response carries the re-rendered screen. Asking for it again
 * (the `revalidateTagName` action this used to call) was a second round trip
 * per save, and a second full render of the layout.
 */
async function refreshAfterDriverWrite(): Promise<void> {
  await queryClientProps.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) && query.queryKey[0] === "driver",
  });
}

export { refreshAfterDriverWrite };
