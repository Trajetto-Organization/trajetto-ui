"use client";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

import type { BranchWriteTag } from "./list-tags";

/**
 * After a branch is written: the list (the RSC fetch tagged with the
 * action's name) and this tab's branch pickers. Other tabs and sessions hear
 * the API's `catalogChanged` (branch), which invalidates the same key.
 */
async function refreshAfterBranchWrite(tag: BranchWriteTag): Promise<void> {
  await Promise.all([
    revalidateTagName(tag),
    queryClientProps.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) && query.queryKey[0] === "branch",
    }),
  ]);
}

export { refreshAfterBranchWrite };
