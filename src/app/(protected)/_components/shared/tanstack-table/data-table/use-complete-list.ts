"use client";

import { useEffect, useMemo, useRef } from "react";

import { DATA_REVALIDATED_EVENT } from "@/lib/refresh-client-cache";
import { useListQueryState, type ListQuery } from "@/lib/search-params";

import {
  answersLocally,
  localListView,
  type LocalSelection,
  type LocalTableSpec,
} from "./local-table";
import type { ServerTableSpec } from "./server-table";

interface ListMeta {
  total: number;
  page: number;
  pageSize: number;
}

interface CompleteListInput<TRow, TMeta> {
  /** The read's rows: the whole set when `complete`, else the server's page. */
  rows: TRow[];
  meta: ListMeta;
  /** The read's `searchMeta` (cards and facet counts). */
  searchMeta: TMeta | undefined;
  /** The key of a complete read (local-table completeListKey), else absent. */
  complete: string | undefined;
  spec: ServerTableSpec;
  local: LocalTableSpec;
  /**
   * The cards and facet counts the API would send for this selection, from
   * the whole set (a port of the list's summarizer); `base` is what the API
   * sent with no facet.
   */
  summarize: (
    rows: TRow[],
    selection: LocalSelection,
    base: TMeta | undefined,
  ) => TMeta | undefined;
}

interface CompleteList<TRow, TMeta> {
  /** Hand it to the DataTable: cards and table read the same params. */
  listQuery: ListQuery;
  rows: TRow[];
  meta: ListMeta;
  searchMeta: TMeta | undefined;
  /** Whether the rows on screen are answered in the browser. */
  local: boolean;
}

/**
 * The list query of a screen whose list may be answered in the browser
 * (spec §13, data-table/local-table), and what its cards and table show.
 *
 * The screen owns the query, not the table, so the cards above the table
 * count the same selection the table filters, and so switching between a
 * complete read and the server's page (a search that narrows a big catalog)
 * never remounts the table and drops what is being typed.
 *
 * - Server mode (`complete` absent): rows, meta and searchMeta pass through;
 *   every change is a server render, as on any table.
 * - Complete: the URL's facets, sort (when the browser orders by it) and page
 *   are applied here; a change with the same key only moves the URL.
 *
 * Company and session: the rows are the server's for the company in the
 * URL, the key includes that company, and the screen remounts per company;
 * nothing is kept outside React, so a logout (a full load) leaves nothing.
 */
function useCompleteList<TRow, TMeta>({
  rows,
  meta,
  searchMeta,
  complete,
  spec,
  local,
  summarize,
}: CompleteListInput<TRow, TMeta>): CompleteList<TRow, TMeta> {
  /**
   * An "Atualizar" whose render has not arrived yet. Next 14.2 lets a URL
   * change made with pushState drop a pending refresh (a restore discards
   * the router action in flight), so until new rows arrive every change goes
   * to the server, which reads fresh data anyway.
   */
  const refreshingRef = useRef(false);

  useEffect(() => {
    const onRevalidate = () => {
      refreshingRef.current = true;
    };

    window.addEventListener(DATA_REVALIDATED_EVENT, onRevalidate);

    return () =>
      window.removeEventListener(DATA_REVALIDATED_EVENT, onRevalidate);
  }, []);

  useEffect(() => {
    refreshingRef.current = false;
  }, [rows]);

  const listQuery = useListQueryState({
    answersLocally: (next) =>
      !refreshingRef.current &&
      answersLocally(rows, complete, next, spec, local),
  });

  const { params } = listQuery;

  const view = useMemo(() => {
    if (complete === undefined) {
      return { rows, meta, searchMeta, local: false };
    }

    const shown = localListView(rows, params, spec, local);

    return {
      rows: shown.rows,
      meta: shown.meta,
      searchMeta: summarize(rows, shown.selection, searchMeta),
      local: true,
    };
  }, [rows, meta, searchMeta, complete, params, spec, local, summarize]);

  return { listQuery, ...view };
}

export { useCompleteList, type CompleteList, type CompleteListInput };
