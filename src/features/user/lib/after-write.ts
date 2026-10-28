"use client";

import { queryClientProps } from "@/lib/query-client-props";

/**
 * What a successful write refreshes in THIS tab: every user picker (the
 * `["user", …]` keys). Other sessions see it on their next read.
 *
 * The list itself is not refreshed from here: the write action revalidates
 * and its own response carries the re-rendered screen. Asking for it again
 * (the `revalidateTagName` action this used to call) was a second round trip
 * per save, and a second full render of the layout.
 */
async function refreshAfterUserWrite(): Promise<void> {
  await queryClientProps.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) && query.queryKey[0] === "user",
  });
}

export { refreshAfterUserWrite };
