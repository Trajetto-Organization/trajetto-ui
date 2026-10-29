"use client";

import { queryClientProps } from "@/lib/query-client-props";

/**
 * What a successful write refreshes in THIS tab: the profile pickers. The
 * permission list and the access-profile list (which counts each profile's
 * permissions) are on the re-rendered screen. Other sessions of the company
 * re-read their own permissions through the API's `permissions_changed`.
 *
 * The list itself is not refreshed from here: the write action revalidates
 * and its own response carries the re-rendered screen. Asking for it again
 * (the `revalidateTagName` action this used to call) was a second round trip
 * per save, and a second full render of the layout.
 */
async function refreshAfterPermissionWrite(): Promise<void> {
  await queryClientProps.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) && query.queryKey[0] === "profile",
  });
}

export { refreshAfterPermissionWrite };
