"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";

import {
  ColumnDef,
  Row,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  keepListedSelection,
  recordIdOf,
  rowsHaveRecordIds,
} from "./row-identity";
import type { ServerTableSpec } from "./server-table";
import { useServerTableState } from "./use-server-table-state";

import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { DataTablePagination } from "../data-table-pagination";

import { useTable } from "../hooks";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

import { TableLoadingOverlay } from "../table-loading-overlay";

interface UserDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
  };
  responseError: {
    error: boolean;
    errorMessage: string;
  };
  toolbar?: React.ReactElement;
  /**
   * Opts the list into server-side sort and facet filters (decision 8.8):
   * both live in the URL, the page forwards them to the API, and only the
   * columns the spec names are sortable. Without it no column sorts — every
   * table here is paged by the server, so sorting the loaded page would
   * order ten rows and call it the list.
   */
  server?: ServerTableSpec;
  /**
   * What the body says when there are no rows. Defaults to "Nenhum resultado
   * encontrado". `null` draws no empty row at all, for a page that already
   * explains the empty state above the table (one message for one fact).
   */
  emptyMessage?: React.ReactNode;
}

/** Tells a screen reader which column orders the rows, and which way. */
function ariaSortOf(
  canSort: boolean,
  sorted: false | "asc" | "desc",
): "ascending" | "descending" | "none" | undefined {
  if (!canSort) return undefined;
  if (sorted === "asc") return "ascending";
  if (sorted === "desc") return "descending";

  return "none";
}

/** The row-menu column, the guided tour's fallback when there is no row. */
const isActionsColumn = (id: string): boolean =>
  id === "actions" || id === "Ações";

/** The id tanstack gives a column: its `id`, else its accessor key. */
function columnIdOf<TData, TValue>(
  column: ColumnDef<TData, TValue>,
): string | undefined {
  if (column.id) return column.id;

  const accessorKey = (column as { accessorKey?: unknown }).accessorKey;

  return typeof accessorKey === "string"
    ? accessorKey.replace(/\./g, "_")
    : undefined;
}

function DataTable<TData, TValue>({
  columns,
  data,
  meta,
  responseError,
  toolbar,
  server,
  emptyMessage = "Nenhum resultado encontrado",
}: UserDataTableProps<TData, TValue>) {
  const searchParams = useSearchParams();

  const [isTableLoading, setIsTableLoading] = useState<boolean>(false);
  const [prevParams, setPrevParams] = useState(searchParams.toString());

  const [scrollKey, setScrollKey] = useState<number>(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const savedScrollPositionRef = useRef<number>(0);

  const {
    columnFilters,
    rowSelection,
    columnVisibility,
    setColumnFilters,
    setColumnVisibility,
    setRowSelection,
  } = useTable({ responseError });

  // Rows are keyed by record id when the page has them (see row-identity):
  // Next keeps this component mounted across a sort, filter or page, so a
  // position-keyed selection would land on other records.
  const keyedByRecord = useMemo(() => rowsHaveRecordIds(data), [data]);

  const getRowId = useCallback(
    (row: TData, index: number, parent?: Row<TData>) =>
      (keyedByRecord ? recordIdOf(row) : undefined) ??
      (parent ? `${parent.id}.${index}` : String(index)),
    [keyedByRecord],
  );

  // Detect when search params change to show loading state
  useEffect(() => {
    const currentParams = searchParams.toString();

    if (currentParams !== prevParams) {
      // Params changed, data has arrived
      setIsTableLoading(false);
      setPrevParams(currentParams);

      // Another query is another result: a position means nothing in it.
      if (!keyedByRecord) setRowSelection({});
    }
  }, [searchParams, prevParams, data, keyedByRecord, setRowSelection]);

  // New rows (a query or a revalidation): the selection keeps only the
  // records still on screen, so nothing hidden rides along in a batch.
  useEffect(() => {
    if (keyedByRecord) {
      setRowSelection((current) => keepListedSelection(current, data));
    }
  }, [data, keyedByRecord, setRowSelection]);

  // Save scroll position before remount
  useEffect(() => {
    if (!scrollAreaRef.current) return;

    const viewport = scrollAreaRef.current.querySelector(
      "[data-radix-scroll-area-viewport]",
    ) as HTMLElement;

    if (!viewport) return;

    const handleScroll = () => {
      savedScrollPositionRef.current = viewport.scrollTop;
    };

    viewport.addEventListener("scroll", handleScroll);
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, [scrollKey]);

  // Force ScrollArea remount when pageSize changes
  useEffect(() => {
    if (!isTableLoading) {
      setScrollKey((prev) => prev + 1);
    }
  }, [meta.pageSize, isTableLoading]);

  // Restore scroll position after remount
  useEffect(() => {
    if (!scrollAreaRef.current || savedScrollPositionRef.current === 0) return;

    const viewport = scrollAreaRef.current.querySelector(
      "[data-radix-scroll-area-viewport]",
    ) as HTMLElement;

    if (!viewport) return;

    requestAnimationFrame(() => {
      viewport.scrollTop = savedScrollPositionRef.current;
    });
  }, [scrollKey]);

  const showLoading = useCallback(() => setIsTableLoading(true), []);
  const serverState = useServerTableState(server, showLoading);

  // A column sorts only when the API orders by it; the spec is the whitelist.
  const tableColumns = useMemo<ColumnDef<TData, TValue>[]>(
    () =>
      server
        ? columns.map(
            (column) =>
              ({
                ...column,
                enableSorting: server.sortable.includes(
                  columnIdOf(column) ?? "",
                ),
              }) as ColumnDef<TData, TValue>,
          )
        : columns,
    [columns, server],
  );

  // A list with nothing to focus (no checkbox, no row menu: the pauses
  // report) still scrolls; the viewport itself then takes the Tab stop, or a
  // keyboard could not scroll it (axe scrollable-region-focusable).
  const hasFocusableColumn = useMemo(
    () =>
      columns.some((column) => {
        const id = columnIdOf(column);

        return id === "select" || (id !== undefined && isActionsColumn(id));
      }),
    [columns],
  );

  const table = useReactTable<TData>({
    data,
    columns: tableColumns,
    getRowId,
    manualPagination: true,
    manualSorting: Boolean(server),
    manualFiltering: Boolean(server),
    enableSorting: Boolean(server),
    enableMultiSort: false,
    // An empty list is still one page: "Página 1 de 0" read as broken.
    pageCount: Math.max(1, Math.ceil(meta.total / meta.pageSize)),
    state: {
      sorting: server ? serverState.sorting : [],
      columnVisibility,
      rowSelection,
      columnFilters: server ? serverState.columnFilters : columnFilters,
      pagination: {
        pageIndex: meta.page - 1,
        pageSize: meta.pageSize,
      },
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: server ? serverState.onSortingChange : undefined,
    onColumnFiltersChange: server
      ? serverState.onColumnFiltersChange
      : setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    // Client filtering and page facets only for lists that have not moved to
    // the server yet: a server table must never count or filter its page.
    getFilteredRowModel: server ? undefined : getFilteredRowModel(),
    getFacetedRowModel: server ? undefined : getFacetedRowModel(),
    getFacetedUniqueValues: server ? undefined : getFacetedUniqueValues(),
  });

  // No role on the wrapper. The <table> inside already carries table
  // semantics; declaring role="table" here made the search box, the filter
  // buttons and the pager into "table children", which is invalid ARIA — a
  // screen reader entered table mode and read the toolbar as cells.
  return (
    <div className="space-y-4 my-9">
      {toolbar
        ? React.cloneElement(toolbar, {
            table,
            error: responseError.error,
            isLoading: isTableLoading,
            setIsLoading: setIsTableLoading,
          })
        : null}

      <div className="relative">
        <ScrollArea
          key={scrollKey}
          ref={scrollAreaRef}
          className="rounded-md border"
          data-tutorial="data-table"
          viewportLabel={
            hasFocusableColumn ? undefined : "Tabela de resultados"
          }
        >
          <div className="max-h-[600px] relative">
            {isTableLoading ? (
              <TableLoadingOverlay columnCount={columns.length} rowCount={5} />
            ) : (
              <UITable>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          colSpan={header.colSpan}
                          className="whitespace-nowrap px-4"
                          data-tutorial={
                            isActionsColumn(header.column.id)
                              ? "table-actions-header"
                              : undefined
                          }
                          aria-sort={ariaSortOf(
                            header.column.getCanSort(),
                            header.column.getIsSorted(),
                          )}
                        >
                          <div className="flex items-center space-x-2">
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className="whitespace-nowrap px-4"
                            data-state={row.getIsSelected() && "selected"}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : emptyMessage === null ? null : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center"
                        data-tutorial="table-empty"
                      >
                        {/* Read here, drawn by the overlay below the scroll
                          area: centred on the row, a wide table put the text
                          past the right edge of a tablet. */}
                        <span className="sr-only">{emptyMessage}</span>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </UITable>
            )}
          </div>

          <ScrollBar orientation="vertical" />
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Over the empty row (the last 96px of the box) and as wide as what
          is visible, whatever the width of the columns behind it. */}
        {!isTableLoading &&
        !table.getRowModel().rows?.length &&
        emptyMessage !== null ? (
          <div
            aria-hidden="true"
            data-table-empty-message
            className="pointer-events-none absolute inset-x-0 bottom-0 flex h-24
          items-center justify-center px-4 text-center text-sm"
          >
            {emptyMessage}
          </div>
        ) : null}
      </div>

      <DataTablePagination
        table={table}
        error={responseError.error}
        isLoading={isTableLoading}
      />
    </div>
  );
}

export { DataTable };
