"use client";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

/**
 * After a fuel type is written: the list (the RSC fetch tagged with the
 * action's name) and this tab's pickers. Other tabs and sessions hear the
 * API's `catalogChanged` (fuel_type), which invalidates the same key root.
 */
async function refreshAfterFuelTypeWrite(
  tag: "create-fuel-type" | "update-fuel-type" | "delete-fuel-type",
): Promise<void> {
  await Promise.all([
    revalidateTagName(tag),
    queryClientProps.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) && query.queryKey[0] === "fuel_type",
    }),
  ]);
}

export { refreshAfterFuelTypeWrite };
