import type { QueryClient } from "react-query";

/**
 * Announced on every Atualizar, for state that lives outside react-query
 * (usage limits, system metrics).
 */
const DATA_REVALIDATED_EVENT = "data-revalidated";

/**
 * The client half of "Atualizar": everything this tab cached, not a
 * list of keys per screen (decision 2.1).
 *
 * Per-screen lists were the bug. `invalidateQueries` only marks an unused
 * query stale, and the pickers read with `refetchOnMount: false`, so a list
 * closed in a dialog came back stale however well the key was mapped — and
 * 9 of the mapped keys matched no query at all.
 *
 * - Unused queries are dropped: the next mount has nothing to show and asks
 *   the API, whatever its `refetchOnMount` says.
 * - Queries somebody is rendering are refetched in place, so the rows stay
 *   on screen until the answer arrives. Removing those instead would pull
 *   the data from under a mounted component (and blank a disabled one).
 *
 * Nothing is exempt: session identity is not in react-query (it lives in the
 * auth store, which this never touches).
 */
async function refreshClientCache(queryClient: QueryClient): Promise<void> {
  queryClient.removeQueries({
    predicate: (query) => query.getObserversCount() === 0,
  });

  await queryClient.invalidateQueries();
}

export { refreshClientCache, DATA_REVALIDATED_EVENT };
