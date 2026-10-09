"use client";

import { useCallback, useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type {
  ColumnFiltersState,
  OnChangeFn,
  SortingState,
} from "@tanstack/react-table";

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
 * Changing either pushes a new URL (page reset to 1) inside a transition, and
 * `onNavigate` lets the table show its loading state until the rows arrive.
 */
function useServerTableState(
  spec: ServerTableSpec | undefined,
  onNavigate?: () => void,
) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [, startTransition] = useTransition();

  const sorting = useMemo<SortingState>(
    () => (spec ? readSorting(searchParams, spec) : []),
    [searchParams, spec],
  );

  const columnFilters = useMemo<ColumnFiltersState>(
    () => (spec ? readColumnFilters(searchParams, spec) : []),
    [searchParams, spec],
  );

  const navigate = useCallback(
    (params: URLSearchParams) => {
      const next = params.toString();

      // Same URL, same rows: no request and no spinner that never ends.
      if (next === searchParams.toString()) return;

      onNavigate?.();

      startTransition(() => {
        router.push(`?${next}`, { scroll: false });
      });
    },
    [onNavigate, router, searchParams],
  );

  const onSortingChange = useCallback<OnChangeFn<SortingState>>(
    (updater) => {
      if (!spec) return;

      const next = typeof updater === "function" ? updater(sorting) : updater;

      navigate(writeSorting(searchParams, next, spec));
    },
    [navigate, searchParams, sorting, spec],
  );

  const onColumnFiltersChange = useCallback<OnChangeFn<ColumnFiltersState>>(
    (updater) => {
      if (!spec) return;

      const next =
        typeof updater === "function" ? updater(columnFilters) : updater;

      navigate(writeColumnFilters(searchParams, next, spec));
    },
    [columnFilters, navigate, searchParams, spec],
  );

  return {
    sorting,
    columnFilters,
    onSortingChange,
    onColumnFiltersChange,
  };
}

export { useServerTableState };
