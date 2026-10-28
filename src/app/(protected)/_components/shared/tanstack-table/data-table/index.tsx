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
  VisibilityState,
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

import { ListQueryProvider, useListQueryState } from "@/lib/search-params";
import { cn } from "@/lib/utils";

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

import { selectColumn } from "../select-column";

/** The checked rows a bulk action works on. */
interface TableSelection<TData> {
  rows: TData[];
  clear: () => void;
}

/** What can be done to several rows at once (see `bulkActions`). */
interface BulkActions<TData> {
  /**
   * The actions over the checked rows, drawn on every render (with none
   * checked too, so a dialog they opened survives the selection clearing).
   */
  render: (selection: TableSelection<TData>) => React.ReactNode;
  /** Guided-tour anchor of the "select all" checkbox. */
  dataTutorial?: string;
}

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
  /**
   * Passing it is what turns row selection on: a checkbox column first, and
   * these actions over the checked rows. Without it there is no checkbox: a
   * selection nothing acts on read as a broken feature.
   */
  bulkActions?: BulkActions<TData>;
  /** Columns that start hidden; "Visualizar" can still show them. */
  initialColumnVisibility?: VisibilityState;
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
  bulkActions,
  initialColumnVisibility,
}: UserDataTableProps<TData, TValue>) {
  const searchParams = useSearchParams();

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
  } = useTable({ responseError, initialColumnVisibility });

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

  // The URL moved: the rows of another query have arrived.
  useEffect(() => {
    const currentParams = searchParams.toString();

    if (currentParams !== prevParams) {
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
    setScrollKey((prev) => prev + 1);
  }, [meta.pageSize]);

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

  // Search, filters and sort of this list, shared with its toolbar: what was
  // asked shows at once and the old rows stay (dimmed) until the new arrive.
  const listQuery = useListQueryState();
  const serverState = useServerTableState(server, listQuery);
  const isBusy = listQuery.isPending;

  const isSelectable = bulkActions !== undefined;
  const selectAllAnchor = bulkActions?.dataTutorial;

  // A column sorts only when the API orders by it; the spec is the whitelist.
  const tableColumns = useMemo<ColumnDef<TData, TValue>[]>(() => {
    const listed = isSelectable
      ? [
          selectColumn<TData>({
            dataTutorial: selectAllAnchor,
          }) as ColumnDef<TData, TValue>,
          ...columns,
        ]
      : columns;

    return server
      ? listed.map(
          (column) =>
            ({
              ...column,
              enableSorting: server.sortable.includes(columnIdOf(column) ?? ""),
            }) as ColumnDef<TData, TValue>,
        )
      : listed;
  }, [columns, server, isSelectable, selectAllAnchor]);

  // A list with nothing to focus (no checkbox, no row menu: the pauses
  // report) still scrolls; the viewport itself then takes the Tab stop, or a
  // keyboard could not scroll it (axe scrollable-region-focusable).
  const hasFocusableColumn = useMemo(
    () =>
      isSelectable ||
      columns.some((column) => {
        const id = columnIdOf(column);

        return id !== undefined && isActionsColumn(id);
      }),
    [columns, isSelectable],
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
    enableRowSelection: isSelectable,
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

  // Hidden columns are not drawn, the checkbox column is: the empty row
  // spans what is on screen, not what the page passed in.
  const visibleColumnCount = table.getVisibleLeafColumns().length;

  const selectedRows = isSelectable
    ? table.getSelectedRowModel().rows.map((row) => row.original)
    : [];

  // No role on the wrapper. The <table> inside already carries table
  // semantics; declaring role="table" here made the search box, the filter
  // buttons and the pager into "table children", which is invalid ARIA — a
  // screen reader entered table mode and read the toolbar as cells.
  return (
    <ListQueryProvider value={listQuery}>
      <div className="space-y-4 my-9">
        {toolbar
          ? React.cloneElement(toolbar, {
              table,
              error: responseError.error,
              isLoading: isBusy,
              setIsLoading: listQuery.setBusy,
            })
          : null}

        <div className="relative" aria-busy={isBusy || undefined}>
          {/* While another query is on its way the rows on screen stay,
            dimmed, under a thin bar: swapping them for a skeleton on every
            tick of a filter made the list jump and lose the reader's place. */}
          {isBusy ? (
            <div
              aria-hidden="true"
              data-table-busy
              className="absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden
              rounded-t-md bg-primary animate-pulse motion-reduce:animate-none"
            />
          ) : null}

          <span role="status" className="sr-only">
            {isBusy ? "Atualizando resultados…" : ""}
          </span>

          <ScrollArea
            key={scrollKey}
            ref={scrollAreaRef}
            className={cn(
              "rounded-md border transition-opacity",
              isBusy && "opacity-60",
            )}
            data-tutorial="data-table"
            viewportLabel={
              hasFocusableColumn ? undefined : "Tabela de resultados"
            }
          >
            <div className="max-h-[600px] relative">
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
                        colSpan={visibleColumnCount}
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
            </div>

            <ScrollBar orientation="vertical" />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* Over the empty row (the last 96px of the box) and as wide as what
            is visible, whatever the width of the columns behind it. */}
          {!table.getRowModel().rows?.length && emptyMessage !== null ? (
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
          isLoading={isBusy}
        />

        {bulkActions?.render({
          rows: selectedRows,
          clear: () => table.resetRowSelection(),
        })}
      </div>
    </ListQueryProvider>
  );
}

export { DataTable, type BulkActions, type TableSelection };
