"use client";

import { queryClientProps } from "@/lib/query-client-props";

/**
 * After a bill is written: the "minhas contas" list of this tab, which may
 * hold the bill.
 *
 * The list itself is not refreshed from here: the write action revalidates
 * and its own response carries the re-rendered screen. Asking for it again
 * (the `revalidateTagName` action this used to call) was a second round trip
 * per save, and a second full render of the layout.
 */
async function refreshAfterAccountPayableWrite(): Promise<void> {
  await queryClientProps.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) &&
      query.queryKey[0] === "account-payables-by-responsible-user",
  });
}

export { refreshAfterAccountPayableWrite };
