"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

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
}

export function DataTable<TData, TValue>({
  columns,
  data,
  meta,
  responseError,
  toolbar,
}: UserDataTableProps<TData, TValue>) {
  const searchParams = useSearchParams();

  const [isTableLoading, setIsTableLoading] = useState<boolean>(false);
  const [prevParams, setPrevParams] = useState(searchParams.toString());

  // Detect when search params change to show loading state
  useEffect(() => {
    const currentParams = searchParams.toString();

    if (currentParams !== prevParams) {
      // Params changed, data has arrived
      setIsTableLoading(false);
      setPrevParams(currentParams);
    }
  }, [searchParams, prevParams, data]);

  const {
    sorting,
    columnFilters,
    rowSelection,
    columnVisibility,
    setColumnFilters,
    setColumnVisibility,
    setRowSelection,
    setSorting,
  } = useTable({ responseError });

  const table = useReactTable({
    data,
    columns,
    manualPagination: true,
    pageCount: Math.ceil(meta.total / meta.pageSize),
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination: {
        pageIndex: meta.page - 1,
        pageSize: meta.pageSize,
      },
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return (
    <div className="space-y-4 my-9" role="table">
      {toolbar
        ? React.cloneElement(toolbar, {
            table,
            error: responseError.error,
            isLoading: isTableLoading,
            setIsLoading: setIsTableLoading,
          })
        : null}

      <ScrollArea className="rounded-md border">
        <div className="max-h-[600px] relative">
          {isTableLoading && (
            <TableLoadingOverlay columnCount={columns.length} rowCount={5} />
          )}
          <UITable>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className="whitespace-nowrap px-4"
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
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    Nenhum resultado encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </UITable>
        </div>

        <ScrollBar orientation="vertical" />
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <DataTablePagination table={table} error={responseError.error} />
    </div>
  );
}
