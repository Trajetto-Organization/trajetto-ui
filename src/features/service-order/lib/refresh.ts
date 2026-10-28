"use client";

import { queryClientProps } from "@/lib/query-client-props";

/**
 * After a write: the pickers that read these rows drop their cache. One
 * helper for the service order, order-part and part dialogs, which each
 * carried a copy.
 *
 * The list itself is not refreshed from here: the write action revalidates
 * and its own response carries the re-rendered screen. Asking for it again
 * (the `revalidateTagName` action this used to call) was a second round trip
 * per save, and a second full render of the layout.
 */
async function refreshMaintenanceData(
  queryRoots: readonly string[],
): Promise<void> {
  await queryClientProps.resetQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) &&
      queryRoots.includes(String(query.queryKey[0])),
  });
}

export { refreshMaintenanceData };
