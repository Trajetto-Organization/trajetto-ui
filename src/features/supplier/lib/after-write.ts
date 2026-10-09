"use client";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

/**
 * After a supplier is written: the list (the RSC fetch tagged with the
 * action's name) and this tab's supplier pickers. Other tabs and sessions
 * hear the API's `catalogChanged` (supplier), which invalidates the same key.
 */
async function refreshAfterSupplierWrite(
  tag: "create-supplier" | "update-supplier" | "delete-supplier",
): Promise<void> {
  await Promise.all([
    revalidateTagName(tag),
    queryClientProps.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) && query.queryKey[0] === "supplier",
    }),
  ]);
}

export { refreshAfterSupplierWrite };
