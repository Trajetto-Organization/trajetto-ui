/**
 * Which placeholder the company list shows (FLEET-SEARCH-1).
 *
 * While a typed term is still owed its server answer (debounce or request in
 * flight), the rows on screen are only the previous answer narrowed locally:
 * an empty list then means "not known yet", not "no company matches". It
 * used to flash "Nenhuma empresa encontrada." before a CNPJ search landed.
 * No directive: pure, and tested.
 */
interface BusinessListInput {
  isLoading: boolean;
  hasError: boolean;
  isSearchPending: boolean;
  isFetching: boolean;
  /** Rows loaded from the server (every page so far). */
  loadedCount: number;
  /** Rows on screen after the local narrowing. */
  shownCount: number;
}

interface BusinessListState {
  /** "Nenhuma empresa encontrada/disponível." */
  empty: boolean;
  /** One skeleton row standing for the answer on its way. */
  pending: boolean;
}

function businessListState(input: BusinessListInput): BusinessListState {
  const settledView = !input.isLoading && !input.hasError;
  const nothingShown = input.shownCount === 0;

  // The infinite-scroll skeleton already stands for a request in flight
  // over loaded rows; a second one would only double it.
  const scrollSkeleton = input.isFetching && input.loadedCount > 0;

  return {
    empty: settledView && nothingShown && !input.isSearchPending,
    pending:
      settledView && nothingShown && input.isSearchPending && !scrollSkeleton,
  };
}

export { businessListState };
export type { BusinessListInput, BusinessListState };
