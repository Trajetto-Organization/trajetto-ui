"use client";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

type UserWriteTag =
  | "create-user-registration"
  | "update-user-registration"
  | "delete-user-registration"
  | "revoke-user-registration"
  | "create-master-user"
  | "update-master-user"
  | "delete-master-user"
  | "revoke-master-user";

/**
 * What a successful write refreshes in THIS tab: the list (the server fetch
 * tagged with the action's name) and every user picker (the `["user", …]`
 * keys). Other sessions see it on their next read.
 */
async function refreshAfterUserWrite(tag: UserWriteTag): Promise<void> {
  await Promise.all([
    revalidateTagName(tag),
    queryClientProps.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) && query.queryKey[0] === "user",
    }),
  ]);
}

export { refreshAfterUserWrite };
