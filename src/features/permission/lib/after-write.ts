"use client";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

/**
 * What a successful write refreshes in THIS tab: every server fetch tagged
 * with the action's name — the permission list, and the access-profile list,
 * which counts each profile's permissions — and the profile pickers. Other
 * sessions of the company re-read their own permissions through the API's
 * `permissions_changed`.
 */
async function refreshAfterPermissionWrite(
  tag: "create-permission" | "update-permission" | "delete-permission",
): Promise<void> {
  await Promise.all([
    revalidateTagName(tag),
    queryClientProps.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) && query.queryKey[0] === "profile",
    }),
  ]);
}

export { refreshAfterPermissionWrite };
