"use client";

import { queryClientProps } from "@/lib/query-client-props";

/**
 * After a fuel type is written: this tab's pickers. Other tabs and sessions
 * hear the API's `catalogChanged` (fuel_type), which invalidates the same
 * key root.
 *
 * The list itself is not refreshed from here: the write action revalidates
 * and its own response carries the re-rendered screen. Asking for it again
 * (the `revalidateTagName` action this used to call) was a second round trip
 * per save, and a second full render of the layout.
 */
async function refreshAfterFuelTypeWrite(): Promise<void> {
  await queryClientProps.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) && query.queryKey[0] === "fuel_type",
  });
}

export { refreshAfterFuelTypeWrite };
