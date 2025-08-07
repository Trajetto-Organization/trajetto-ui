"use client";

import { Table } from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  error: boolean;
}

export function DataTablePagination<TData>({
  table,
  error,
}: DataTablePaginationProps<TData>) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Function to update URL parameters
  const updateQueryParams = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      params.set(key, value);
    });

    router.push(`?${params.toString()}`);
  };

  // Gets the current pagination state
  const paginationState = table.getState().pagination;

  // pageIndex is zero-indexed; for the URL we use page = pageIndex + 1
  const currentPage = paginationState.pageIndex + 1;

  return (
    <div
      className="flex flex-col items-center justify-between 
      gap-4 px-2 sm:flex-row sm:gap-0"
    >
      <div
        className="text-sm text-muted-foreground w-full 
        sm:w-auto text-center sm:text-left"
      >
        {table.getFilteredSelectedRowModel().rows.length} de{" "}
        {table.getFilteredRowModel().rows.length} linha(s) selecionadas.
      </div>

      <div
        className="flex flex-col w-full items-center 
        gap-4 sm:w-auto sm:flex-row sm:gap-6 lg:gap-8"
      >
        <div
          className="flex items-center justify-between 
          space-x-2 w-full sm:w-auto"
        >
          <p className="text-sm font-medium whitespace-nowrap">
            Linhas por página
          </p>
          <Select
            value={`${paginationState.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
              updateQueryParams({ pageSize: value, page: "1" });
            }}
            disabled={error}
          >
            <SelectTrigger
              aria-label="Paginação"
              className="h-8 w-full sm:w-[80px] text-sm"
            >
              <SelectValue placeholder={`${paginationState.pageSize}`} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem
                  key={pageSize}
                  value={`${pageSize}`}
                  className="cursor-pointer"
                >
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div
          className="flex flex-wrap items-center justify-center 
          gap-2 sm:justify-start sm:flex-nowrap"
        >
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => {
              table.setPageIndex(0);
              updateQueryParams({ page: "1" });
            }}
            disabled={!table.getCanPreviousPage() || error}
          >
            <span className="sr-only">Ir para a primeira página</span>
            <ChevronsLeft className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => {
              const currentIndex = table.getState().pagination.pageIndex;
              if (currentIndex > 0) {
                table.setPageIndex(currentIndex - 1);
                updateQueryParams({ page: `${currentIndex}` });
              }
            }}
            disabled={!table.getCanPreviousPage() || error}
          >
            <span className="sr-only">Ir para a página anterior</span>
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="hidden text-sm font-medium sm:block">
            Página {currentPage} de {table.getPageCount()}
          </div>

          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => {
              const currentIndex = table.getState().pagination.pageIndex;

              table.setPageIndex(currentIndex + 1);
              updateQueryParams({ page: `${currentIndex + 2}` });
            }}
            disabled={!table.getCanNextPage() || error}
          >
            <span className="sr-only">Ir para a próxima página</span>
            <ChevronRight className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => {
              const pageCount = table.getPageCount();
              table.setPageIndex(pageCount - 1);
              updateQueryParams({ page: pageCount.toString() });
            }}
            disabled={!table.getCanNextPage() || error}
          >
            <span className="sr-only">Ir para a última página</span>
            <ChevronsRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
