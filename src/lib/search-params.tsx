import { useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

/** How long a list waits for the next keystroke or click before asking. */
const LIST_QUERY_DEBOUNCE_MS = 400;

interface ListQueryChangeOptions {
  /** Wait for more changes before navigating (typing, ticking filters). */
  debounce?: boolean;
}

interface ListQueryOptions {
  /**
   * Whether the rows on screen already answer these params (a complete list
   * answered in the browser, data-table/local-table). Then the URL moves on
   * its own — `history.pushState`, which Next 14.2 turns into a router
   * restore with no request — at once, without the debounce and without the
   * busy state. Anything else (a search, a server sort, another company) is
   * a server render, as before.
   */
  answersLocally?: (next: URLSearchParams) => boolean;
}

/**
 * The query string of a server-side list, between what was asked and what
 * the server has answered.
 *
 * Everything that changes the list's URL (the search box, a filter, a sort)
 * goes through here. Reading `useSearchParams()` instead was the bug: it only
 * moves once the server has answered, so a filter ticked while the previous
 * one was in flight was computed from the old URL and erased it, a term typed
 * just before a click was lost, and a checkbox stayed unchecked until the
 * rows came back. Here the latest REQUESTED params are kept in a ref, every
 * change builds on them, and the URL becomes the truth again once it lands.
 */
interface ListQuery {
  /** What the list shows or is about to show: the latest request, else the URL. */
  params: URLSearchParams;
  /**
   * Queues the next params, built from the latest requested ones (never from
   * a URL that has not caught up). Navigates now, or after a short pause with
   * `debounce`; changes queued meanwhile go out together, in one request.
   */
  change: (
    next: (current: URLSearchParams) => URLSearchParams,
    options?: ListQueryChangeOptions,
  ) => void;
  /** Sends what is queued now (a filter popover closed, "Resetar"). */
  flush: () => void;
  /** A change is queued or its rows have not arrived yet. */
  isPending: boolean;
  /**
   * For a toolbar that navigates by itself (a period picker): the list reads
   * as busy until the URL changes.
   */
  setBusy: (busy: boolean) => void;
}

/**
 * The state behind a list's URL; the DataTable owns one and shares it (or a
 * screen that answers a complete list in the browser owns it, and hands it
 * to both its cards and its table).
 */
function useListQueryState(options: ListQueryOptions = {}): ListQuery {
  const router = useRouter();
  const searchParams = useSearchParams();
  const committed = searchParams.toString();

  const [isNavigating, startTransition] = useTransition();

  const [requested, setRequested] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The change on its way is answered on screen: no busy bar for it.
  const [shallow, setShallow] = useState(false);

  // Read inside events and timers, where the rendered values may be behind.
  const requestedRef = useRef<string | null>(null);
  const committedRef = useRef(committed);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shallowRef = useRef(false);
  const answersRef = useRef(options.answersLocally);

  // The rows on screen, once committed: a render React threw away (a
  // transition still waiting) must not answer a click for rows not shown.
  useEffect(() => {
    answersRef.current = options.answersLocally;
  });

  const settle = useCallback(() => {
    requestedRef.current = null;
    shallowRef.current = false;
    setRequested(null);
    setShallow(false);
    setBusy(false);
  }, []);

  const flush = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;

    const next = requestedRef.current;

    if (next === null) return;

    // Back where the URL already is (ticked and unticked): nothing to ask.
    if (next === committedRef.current) {
      settle();
      return;
    }

    const local = shallowRef.current;

    // In a transition either way, so `isNavigating` lasts until the router
    // shows the new URL (the restore that pushState dispatches is one too).
    startTransition(() => {
      if (local) {
        window.history.pushState(null, "", `?${next}`);
      } else {
        router.push(`?${next}`, { scroll: false });
      }
    });
  }, [router, settle]);

  const change = useCallback<ListQuery["change"]>(
    (next, changeOptions) => {
      const current = new URLSearchParams(
        requestedRef.current ?? committedRef.current,
      );
      const value = next(current).toString();

      // Built on what is queued or in flight, so a change that rides with a
      // search still on its way is never answered from the old rows.
      const local = answersRef.current?.(new URLSearchParams(value)) ?? false;

      requestedRef.current = value;
      shallowRef.current = local;
      setRequested(value);
      setShallow(local);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;

      // No pause for an answer already on screen: the pause only exists to
      // batch several ticks into one request.
      if (changeOptions?.debounce && !local) {
        timerRef.current = setTimeout(flush, LIST_QUERY_DEBOUNCE_MS);
      } else {
        flush();
      }
    },
    [flush],
  );

  // The URL moved: those rows are on screen, whoever navigated.
  useEffect(() => {
    committedRef.current = committed;
    setBusy(false);
  }, [committed]);

  // The request landed, or nothing is coming any more (Back, a navigation
  // that failed): the URL is the truth again. A newer change still queued or
  // in flight keeps its params on screen until it lands in turn.
  useEffect(() => {
    const pending = requestedRef.current;

    if (pending === null) return;

    if (pending === committed || (!isNavigating && timerRef.current === null)) {
      settle();
    }
  }, [committed, isNavigating, settle]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const isPending = ((requested !== null || isNavigating) && !shallow) || busy;

  return useMemo(
    () => ({
      params: new URLSearchParams(requested ?? committed),
      change,
      flush,
      isPending,
      setBusy,
    }),
    [requested, committed, change, flush, isPending],
  );
}

const ListQueryContext = createContext<ListQuery | null>(null);

/** Shares a DataTable's list query with its toolbar, filters and pager. */
const ListQueryProvider = ListQueryContext.Provider;

/**
 * The list query of the DataTable around the caller, or null outside one: for
 * a control that only nudges the list (a filter popover sending what it
 * queued) and must not need a router of its own.
 */
function useSharedListQuery(): ListQuery | null {
  return useContext(ListQueryContext);
}

/**
 * The list query of the DataTable around the caller, so the search box and
 * the filters build on each other's requests. Outside a DataTable, a query of
 * its own (it then only coordinates the caller with itself).
 */
function useListQuery(): ListQuery {
  const shared = useSharedListQuery();
  const own = useListQueryState();

  return shared ?? own;
}

/** The search box of a list: the typed term goes to the URL as `search`. */
function useSearch() {
  const { params, change, isPending } = useListQuery();

  const handleSearch = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const search = event.target.value;

      change(
        (next) => {
          if (search) {
            next.set("search", search);
            next.set("page", "1");
          } else {
            next.delete("search");
          }

          return next;
        },
        { debounce: true },
      );
    },
    [change],
  );

  return {
    handleSearch,
    searchParams: params,
    isPending,
  };
}

export {
  LIST_QUERY_DEBOUNCE_MS,
  ListQueryProvider,
  useListQuery,
  useListQueryState,
  useSearch,
  useSharedListQuery,
  type ListQuery,
  type ListQueryOptions,
};
