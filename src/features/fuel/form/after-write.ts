"use client";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

/**
 * What a successful create/update/delete refreshes: the list (the RSC fetch
 * tagged with the action's name) and the client queries that read a
 * refueling or the vehicle's mileage it moved — the pickers' fuel history,
 * the vehicle card and the "previous refueling" of the details dialog.
 */
const FUEL_QUERY_ROOTS = ["fuel", "vehicleData", "previousFuel"] as const;

async function refreshAfterFuelWrite(
  tag: "create-fuel" | "update-fuel" | "delete-fuel",
): Promise<void> {
  await Promise.all([
    revalidateTagName(tag),
    queryClientProps.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        (FUEL_QUERY_ROOTS as readonly unknown[]).includes(query.queryKey[0]),
    }),
  ]);
}

export { FUEL_QUERY_ROOTS, refreshAfterFuelWrite };
