"use client";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

/**
 * After a write: the list re-renders on the server (its fetch carries the
 * tag) and the pickers that read these rows drop their cache. One helper for
 * the service order, order-part and part dialogs, which each carried a copy.
 */
async function refreshMaintenanceData(
  tag: string,
  queryRoots: readonly string[],
): Promise<void> {
  await Promise.all([
    revalidateTagName(tag),
    queryClientProps.resetQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        queryRoots.includes(String(query.queryKey[0])),
    }),
  ]);
}

export { refreshMaintenanceData };
