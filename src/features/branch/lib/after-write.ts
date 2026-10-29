"use client";

import { queryClientProps } from "@/lib/query-client-props";

/**
 * After a branch is written: this tab's branch pickers. Other tabs and
 * sessions hear the API's `catalogChanged` (branch), which invalidates the
 * same key.
 *
 * The list itself is not refreshed from here: the write action revalidates
 * and its own response carries the re-rendered screen. Asking for it again
 * (the `revalidateTagName` action this used to call) was a second round trip
 * per save, and a second full render of the layout.
 */
async function refreshAfterBranchWrite(): Promise<void> {
  await queryClientProps.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) && query.queryKey[0] === "branch",
  });
}

export { refreshAfterBranchWrite };
