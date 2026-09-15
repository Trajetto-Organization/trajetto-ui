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
  isLoading?: boolean;
}

function DataTablePagination<TData>({
  table,
  error,
  isLoading = false,
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
      /**
       * `flex-wrap` is load-bearing: without it the row overflows and is lost.
       *
       * From `sm` up the two groups become one `justify-between` row, and
       * neither can shrink — the selection text, the "Linhas por página"
       * label and the four buttons are all `whitespace-nowrap`, and a flex
       * item has `min-width: auto`. Together they need 428px where an iPad in
       * portrait offers 400, and because the shell's `<main>` clips, the
       * pager buttons sat off-screen with no scrollbar: the table was there
       * and turning the page was impossible. Wrapping stacks the groups.
       */
      className="flex flex-col flex-wrap items-center gap-4 
      justify-between px-2 sm:flex-row sm:gap-x-4 sm:gap-y-3"
    >
      <div
        className="text-sm text-muted-foreground min-w-0 
        w-full sm:w-auto text-center sm:text-left"
      >
        {table.getFilteredSelectedRowModel().rows.length} de{" "}
        {table.getFilteredRowModel().rows.length} linha(s) selecionadas.
      </div>

      <div
        className="flex flex-col w-full min-w-0 items-center 
        gap-4 sm:w-auto sm:flex-row sm:gap-6 lg:gap-8"
      >
        <div
          className="flex items-center w-full 
          justify-between space-x-2 sm:w-auto"
        >
          <p className="text-sm font-medium whitespace-nowrap">
            Linhas por página
          </p>
          <Select
            name="pageSize"
            value={`${paginationState.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
              updateQueryParams({ pageSize: value, page: "1" });
            }}
            disabled={error || isLoading}
          >
            <SelectTrigger
              id="pageSize"
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
          className="flex flex-wrap items-center gap-2 
          justify-center sm:justify-start sm:flex-nowrap"
        >
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => {
              table.setPageIndex(0);
              updateQueryParams({ page: "1" });
            }}
            disabled={!table.getCanPreviousPage() || error || isLoading}
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
            disabled={!table.getCanPreviousPage() || error || isLoading}
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
            disabled={!table.getCanNextPage() || error || isLoading}
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
            disabled={!table.getCanNextPage() || error || isLoading}
          >
            <span className="sr-only">Ir para a última página</span>
            <ChevronsRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export { DataTablePagination };
