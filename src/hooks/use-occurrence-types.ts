import { useMemo } from "react";
import { useQuery } from "react-query";

import { fetchOccurrenceTypes } from "@/lib/delivery-reads";
import { CATALOG_STALE_TIME_MS } from "@/lib/query-client-props";

/** One page covers the catalogue: a handful of types a dispatcher maintains. */
const OCCURRENCE_TYPES_PAGE_SIZE = 100;

/**
 * The company's active occurrence types, for "Registrar ocorrência".
 *
 * A catalogue like the pickers': short-lived in the cache, so a type the
 * MASTER creates or retires in another session shows on the next open
 * (Entregas 3). The key is what the types tab's mutations and
 * `catalogChanged` invalidate.
 */
function useOccurrenceTypes(businessId: string) {
  const { data, isLoading } = useQuery(
    ["occurrence-types-select", businessId],
    // A relay GET (lib/delivery-reads), beside the delivery's own read.
    ({ signal }) =>
      fetchOccurrenceTypes(businessId, 1, OCCURRENCE_TYPES_PAGE_SIZE, {
        signal,
      }),
    {
      refetchOnWindowFocus: false,
      staleTime: CATALOG_STALE_TIME_MS,
    },
  );

  // A retired type keeps explaining old occurrences; it is never offered.
  const occurrenceTypes = useMemo(
    () => (data?.data ?? []).filter((type) => type.is_active),
    [data],
  );

  return { occurrenceTypes, isLoading };
}

export { useOccurrenceTypes };
