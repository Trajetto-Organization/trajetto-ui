"use client";

import { useCallback, useMemo } from "react";

import type {
  ColumnFiltersState,
  OnChangeFn,
  SortingState,
} from "@tanstack/react-table";

import type { ListQuery } from "@/lib/search-params";

import {
  readColumnFilters,
  readSorting,
  writeColumnFilters,
  writeSorting,
  type ServerTableSpec,
} from "./server-table";

/**
 * Sort and facet filters of a server-side table, held in the URL.
 *
 * The URL is the state: the server component reads the same params to ask
 * the API, a shared link reopens the same view, and Back undoes a filter.
 * Both are read from the list query (lib/search-params), so a ticked filter
 * shows at once, before the server answers, and the next tick builds on it
 * instead of on a URL that has not caught up. A sort navigates at once; the
 * filters wait a moment, so several ticks become one request.
 */
function useServerTableState(
  spec: ServerTableSpec | undefined,
  query: Pick<ListQuery, "params" | "change">,
) {
  const { params, change } = query;

  const sorting = useMemo<SortingState>(
    () => (spec ? readSorting(params, spec) : []),
    [params, spec],
  );

  const columnFilters = useMemo<ColumnFiltersState>(
    () => (spec ? readColumnFilters(params, spec) : []),
    [params, spec],
  );

  const onSortingChange = useCallback<OnChangeFn<SortingState>>(
    (updater) => {
      if (!spec) return;

      change((current) => {
        const next =
          typeof updater === "function"
            ? updater(readSorting(current, spec))
            : updater;

        return writeSorting(current, next, spec);
      });
    },
    [change, spec],
  );

  const onColumnFiltersChange = useCallback<OnChangeFn<ColumnFiltersState>>(
    (updater) => {
      if (!spec) return;

      change(
        (current) => {
          const next =
            typeof updater === "function"
              ? updater(readColumnFilters(current, spec))
              : updater;

          return writeColumnFilters(current, next, spec);
        },
        { debounce: true },
      );
    },
    [change, spec],
  );

  return {
    sorting,
    columnFilters,
    onSortingChange,
    onColumnFiltersChange,
  };
}

export { useServerTableState };
