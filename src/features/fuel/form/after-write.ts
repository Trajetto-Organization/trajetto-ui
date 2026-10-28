"use client";

import { queryClientProps } from "@/lib/query-client-props";

/**
 * What a successful create/update/delete refreshes: the client queries that
 * read a refueling or the vehicle's mileage it moved — the pickers' fuel
 * history, the vehicle card and the "previous refueling" of the details
 * dialog.
 *
 * The list itself is not refreshed from here: the write action revalidates
 * and its own response carries the re-rendered screen. Asking for it again
 * (the `revalidateTagName` action this used to call) was a second round trip
 * per save, and a second full render of the layout.
 */
const FUEL_QUERY_ROOTS = ["fuel", "vehicleData", "previousFuel"] as const;

async function refreshAfterFuelWrite(): Promise<void> {
  await queryClientProps.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) &&
      (FUEL_QUERY_ROOTS as readonly unknown[]).includes(query.queryKey[0]),
  });
}

export { FUEL_QUERY_ROOTS, refreshAfterFuelWrite };
