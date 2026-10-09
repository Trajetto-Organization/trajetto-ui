import { useCallback, useEffect, useMemo, useRef } from "react";
import { hashQueryKey, useInfiniteQuery } from "react-query";

import { relayUrl } from "@/lib/api-relay-paths";
import { parseNDJSON } from "@/lib/parse-nd-json";
import { CATALOG_STALE_TIME_MS } from "@/lib/query-client-props";

import { useDebouncedValue } from "./use-debounced-value";
import { truncateText } from "@/lib/truncate-text";

/** Rows per request; the pickers show about this many at a time. */
const CURSOR_PAGE_SIZE = 10;

const SEARCH_DEBOUNCE_MS = 300;

/** The API's cursor schema refuses anything longer. */
const SEARCH_MAX_LENGTH = 100;

interface CursorPage<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * The term as the API compares it: trimmed and with inner runs of spaces
 * collapsed, so "  joão   silva " and "joão silva" are the same request and
 * the same cache entry.
 */
function normalizeSearch(value: string | undefined): string {
  return truncateText(
    (value ?? "").trim().replace(/\s+/g, " "),
    SEARCH_MAX_LENGTH,
  );
}

interface CursorPageRequest {
  /** Path after the API origin, e.g. `/shipper/search-shipper-business`. */
  path: string;
  /** Extra query string (`businessId`…); empty values are left out. */
  params?: Record<string, string | undefined>;
  cursor?: string;
  search?: string;
  signal?: AbortSignal;
  /** Said when the API answers without a message of its own. */
  fallbackError: string;
}

type HttpError = Error & { status?: number };

/** A page plus the list it was read for (the key without the term). */
type ScopedPage<T> = CursorPage<T> & { scope: string };

async function fetchCursorPage<T>({
  path,
  params = {},
  cursor,
  search,
  signal,
  fallbackError,
}: CursorPageRequest): Promise<CursorPage<T>> {
  const query = new URLSearchParams({ limit: String(CURSOR_PAGE_SIZE) });

  if (cursor) query.set("cursor", cursor);

  for (const [name, value] of Object.entries(params)) {
    if (value) query.set(name, value);
  }

  // Server-side, so a row that is not in the loaded pages can still be found.
  if (search) query.set("search", search);

  const response = await fetch(relayUrl(path, query), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Accept-Encoding": "gzip",
    },
    signal,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    const error: HttpError = new Error(
      (body && typeof body.message === "string" && body.message) ||
        fallbackError,
    );

    // Read by the client's retry policy: a 4xx answers the same every time.
    error.status = response.status;
    throw error;
  }

  const { meta, data } = await parseNDJSON(response);

  return {
    data: (data ?? []) as T[],
    nextCursor: meta?.searchMeta?.nextCursor ?? null,
    hasMore: Boolean(meta?.searchMeta?.hasMore),
  };
}

interface UseCursorSearchOptions {
  /**
   * The entity first, then its scope (`["driver", businessId]`). Mutations and
   * `catalogChanged` invalidate by this prefix; the search term is appended
   * after it, so they reach every term at once.
   */
  queryKey: readonly unknown[];
  path: string;
  params?: Record<string, string | undefined>;
  /** What the person typed; debounced here and sent as `search`. */
  search?: string;
  enabled?: boolean;
  fallbackError: string;
}

/**
 * One picker list read by cursor: the 16 `search-*` hooks are this with a
 * different path.
 *
 * Why it looks the way it does:
 * - `refetchOnMount: true` with a short `staleTime`. The lists used to read
 *   with `refetchOnMount: false`, so a dialog reopened after another session
 *   deactivated a shipper showed it for up to 30 minutes, and invalidating
 *   the key did nothing (react-query v3 skips unused queries on invalidate
 *   and the flag skipped them on mount).
 * - The abort signal comes from react-query. The hooks used to reject their
 *   own fetch once unmounted, which also broke any refetch of an unused list.
 * - `keepPreviousData`: while a new term is in flight the previous rows stay,
 *   instead of the list collapsing to a skeleton on every keystroke. Only
 *   for a new term, though: when the scope changes (another company, another
 *   vehicle) the held rows belong to the old one and would be offered as
 *   choices, so each page carries the scope it was read for and rows from
 *   another scope are dropped while the new list loads.
 */
function useCursorSearch<T>({
  queryKey,
  path,
  params,
  search,
  enabled = true,
  fallbackError,
}: UseCursorSearchOptions) {
  const observer = useRef<IntersectionObserver>();

  const typed = normalizeSearch(search);
  const term = useDebouncedValue(typed, SEARCH_DEBOUNCE_MS);

  const scope = hashQueryKey(queryKey);

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetching,
    isLoading,
    isPreviousData,
    refetch,
  } = useInfiniteQuery<ScopedPage<T>, HttpError>({
    // Without a term the key is exactly the entity's, as it always was.
    queryKey: term ? [...queryKey, { search: term }] : [...queryKey],
    queryFn: async ({ pageParam, signal }) => ({
      ...(await fetchCursorPage<T>({
        path,
        params,
        cursor: pageParam,
        search: term || undefined,
        signal,
        fallbackError,
      })),
      scope,
    }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
    enabled,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: CATALOG_STALE_TIME_MS,
    keepPreviousData: true,
  });

  const heldFromOtherScope = isPreviousData && data?.pages[0]?.scope !== scope;

  // Loading, as far as the picker can tell: the rows it had are not this
  // list's. A disabled list (no vehicle chosen yet) is empty, not loading.
  const isLoadingScope = isLoading || (heldFromOtherScope && isFetching);

  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isLoadingScope) return;

      observer.current?.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (
          entries[0].isIntersecting &&
          hasNextPage &&
          !isFetching &&
          !isError
        ) {
          void fetchNextPage();
        }
      });

      if (node) observer.current.observe(node);
    },
    [fetchNextPage, hasNextPage, isError, isFetching, isLoadingScope],
  );

  useEffect(() => () => observer.current?.disconnect(), []);

  const items = useMemo(
    () =>
      heldFromOtherScope
        ? []
        : (data?.pages.flatMap((page) => page.data) ?? []),
    [data, heldFromOtherScope],
  );

  const handleRefetch = useCallback(() => {
    void refetch();
  }, [refetch]);

  return {
    items,
    lastElementRef,
    isFetching,
    isLoading: isLoadingScope,
    isError,
    errorMessage: error?.message ?? null,
    refetch: handleRefetch,
    hasError: isError,
    /**
     * Whether the rows on screen are the server's answer for what is typed
     * now. False while the debounce runs or the new term is in flight, when
     * a caller may narrow the previous rows locally in the meantime.
     */
    isSearchSettled: !isPreviousData && term === typed,
  };
}

export {
  useCursorSearch,
  fetchCursorPage,
  normalizeSearch,
  CURSOR_PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
};
export type { CursorPage, UseCursorSearchOptions };
