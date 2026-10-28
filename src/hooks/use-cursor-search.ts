import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  hashQueryKey,
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from "react-query";

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

/**
 * How long a picker list that `catalogChanged` keeps fresh (lib/catalog-sync)
 * is trusted. Reopening "Selecionar Veículo e Motorista" or typing a term
 * again used to read every loaded page anew, because 5 s had passed; within
 * this window the cache answers. A write in this tab or in another session
 * invalidates the entity's keys, so a change still shows on the next open.
 */
const SYNCED_CATALOG_STALE_TIME_MS = 2 * 60_000;

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

/**
 * Whether any of the values contains the term, ignoring case: the API's
 * `contains … insensitive`, for a picker that matches loaded rows itself.
 */
function containsTerm(
  values: ReadonlyArray<string | null | undefined>,
  term: string,
): boolean {
  const needle = term.toLowerCase();

  return values.some(
    (value) =>
      typeof value === "string" && value.toLowerCase().includes(needle),
  );
}

/** Every row of the list, when the cache holds all of it (no next page). */
function completeRows<T>(
  data: InfiniteData<ScopedPage<T>> | undefined,
): T[] | undefined {
  const pages = data?.pages;

  if (!pages?.length || pages[pages.length - 1].hasMore) return undefined;

  return pages.flatMap((page) => page.data);
}

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

interface UseCursorSearchOptions<T = unknown> {
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
  /**
   * How long the rows are trusted before a mount asks again. Defaults to
   * CATALOG_STALE_TIME_MS; a list catalog-sync invalidates can afford
   * SYNCED_CATALOG_STALE_TIME_MS.
   */
  staleTime?: number;
  /**
   * The API's match, run on a loaded row (same fields, `containsTerm`). With
   * it the hook narrows the rows on screen while a term is on its way, and a
   * term over a list the cache holds whole is answered here, with no request.
   */
  matches?: (row: T, term: string) => boolean;
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
 *   and the flag skipped them on mount). An invalidated key is stale, so the
 *   next mount reads it again whatever `staleTime` says; a list whose keys
 *   catalog-sync invalidates may therefore trust its rows for minutes.
 * - A list the cache holds whole (no next page) answers a term itself, with
 *   `matches`. A term with no match there still goes to the server: the
 *   dispatcher's rows come without fields the API searches (brand, RENAVAM),
 *   and "nothing found" must never be the browser's guess.
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
  staleTime = CATALOG_STALE_TIME_MS,
  matches,
}: UseCursorSearchOptions<T>) {
  const observer = useRef<IntersectionObserver>();
  const queryClient = useQueryClient();

  const typed = normalizeSearch(search);
  const term = useDebouncedValue(typed, SEARCH_DEBOUNCE_MS);

  const scope = hashQueryKey(queryKey);

  // The unfiltered list, when the cache already holds all of it.
  const wholeList =
    matches && typed
      ? completeRows(
          queryClient.getQueryData<InfiniteData<ScopedPage<T>>>(queryKey),
        )
      : undefined;

  const answeredLocally = Boolean(
    matches && wholeList?.some((row) => matches(row, typed)),
  );

  // Over a whole list the term goes out only when nothing here matches it,
  // and only once the typing pauses.
  const serverTerm =
    wholeList && (answeredLocally || term !== typed) ? "" : term;

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetching,
    isFetchingNextPage,
    isLoading,
    isPreviousData,
    refetch,
  } = useInfiniteQuery<ScopedPage<T>, HttpError>({
    // Without a term the key is exactly the entity's, as it always was.
    queryKey: serverTerm
      ? [...queryKey, { search: serverTerm }]
      : [...queryKey],
    queryFn: async ({ pageParam, signal }) => ({
      ...(await fetchCursorPage<T>({
        path,
        params,
        cursor: pageParam,
        search: serverTerm || undefined,
        signal,
        fallbackError,
      })),
      scope,
    }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
    enabled,
    // Asks again on mount only once the rows are stale (or invalidated).
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime,
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

  const isSearchSettled =
    answeredLocally || (!isPreviousData && serverTerm === typed);

  const items = useMemo(() => {
    const rows = heldFromOtherScope
      ? []
      : (data?.pages.flatMap((page) => page.data) ?? []);

    // Answered here, or the server's answer for the term is not in yet: the
    // rows on screen are narrowed to what matches what is typed now.
    return matches && typed && (answeredLocally || !isSearchSettled)
      ? rows.filter((row) => matches(row, typed))
      : rows;
  }, [
    data,
    heldFromOtherScope,
    matches,
    typed,
    answeredLocally,
    isSearchSettled,
  ]);

  const handleRefetch = useCallback(() => {
    void refetch();
  }, [refetch]);

  return {
    items,
    lastElementRef,
    isFetching,
    /** The next page of the same list (scrolled to the end), not a new term. */
    isFetchingNextPage,
    isLoading: isLoadingScope,
    isError,
    errorMessage: error?.message ?? null,
    refetch: handleRefetch,
    hasError: isError,
    /**
     * Whether the rows on screen answer what is typed now (the server's
     * answer, or the whole list narrowed here). False while the debounce runs
     * or the new term is in flight; with `matches` the previous rows are
     * narrowed locally in the meantime.
     */
    isSearchSettled,
  };
}

export {
  useCursorSearch,
  fetchCursorPage,
  normalizeSearch,
  containsTerm,
  CURSOR_PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
  SYNCED_CATALOG_STALE_TIME_MS,
};
export type { CursorPage, UseCursorSearchOptions };
