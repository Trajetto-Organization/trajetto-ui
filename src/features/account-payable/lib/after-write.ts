"use client";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

/**
 * After a bill is written: the list (the RSC fetch tagged with the action's
 * name) and the "minhas contas" list of this tab, which may hold the bill.
 */
async function refreshAfterAccountPayableWrite(
  tag:
    | "create-account-payable"
    | "update-account-payable"
    | "delete-account-payable",
): Promise<void> {
  await Promise.all([
    revalidateTagName(tag),
    queryClientProps.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey[0] === "account-payables-by-responsible-user",
    }),
  ]);
}

export { refreshAfterAccountPayableWrite };
