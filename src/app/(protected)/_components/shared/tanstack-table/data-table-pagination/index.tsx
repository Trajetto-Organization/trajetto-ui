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

import { useListQuery } from "@/lib/search-params";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  error: boolean;
  isLoading?: boolean;
}

/** The page the list asked for last, as the URL and the API read it. */
function requestedPageOf(params: URLSearchParams): number {
  const page = Number(params.get("page"));

  return Number.isInteger(page) && page >= 1 ? page : 1;
}

function DataTablePagination<TData>({
  table,
  error,
  isLoading = false,
}: DataTablePaginationProps<TData>) {
  /**
   * The list query of the DataTable around it (search, filters, sort and
   * page in one place). The pager used its own router: no busy state while
   * the page loaded, and a quick second click on "próxima" pushed the same
   * URL again, from the page still on screen. Now a turn is a change like
   * any other: the table dims while the server answers, the buttons wait
   * for it, the next turn builds on the page already asked for, and a
   * complete list answered in the browser turns pages with no request.
   */
  const listQuery = useListQuery();

  const goToPage = (page: number) => {
    listQuery.change((params) => {
      params.set("page", String(page));

      return params;
    });
  };

  // Gets the current pagination state
  const paginationState = table.getState().pagination;

  /**
   * Whether the user can select rows at all.
   *
   * Tables without a checkbox column were still announcing "0 de 1 linha(s)
   * selecionadas." — a counter for a control that is not on screen, which
   * reads like something is broken. Where there is nothing to select, the
   * useful number is how many rows this page is showing. The table says
   * whether it selects (DataTable turns it on with `bulkActions`), rather
   * than this guessing from a column id.
   */
  const isSelectable = Boolean(table.options.enableRowSelection);

  const rowsOnPage = table.getFilteredRowModel().rows.length;

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
        {isSelectable
          ? `${table.getFilteredSelectedRowModel().rows.length} de ${rowsOnPage} linha(s) selecionadas.`
          : `${rowsOnPage} linha(s) nesta página.`}
      </div>

      {/*
        Wraps from `sm` up too. "Página 12 de 50" is one unbreakable line, so
        the size picker plus the buttons need ~540px; at 768px with the
        sidebar open <main> offers 512 and clips, and the last-page button was
        cut off. Wrapping puts the buttons under the size picker instead.
      */}
      <div
        className="flex flex-col w-full min-w-0 items-center 
        gap-4 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-center
        sm:gap-x-6 sm:gap-y-3 lg:gap-x-8"
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
              listQuery.change((params) => {
                params.set("pageSize", value);
                params.set("page", "1");

                return params;
              });
            }}
            disabled={error || isLoading}
          >
            <SelectTrigger
              id="pageSize"
              aria-label="Paginação"
              className="h-8 w-full sm:w-[80px] text-sm"
            >
              {/* Children, not only the placeholder: Radix fills the value
                  from the item text after mount, so the server HTML showed an
                  empty select until hydration. */}
              <SelectValue placeholder={`${paginationState.pageSize}`}>
                {paginationState.pageSize}
              </SelectValue>
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
            onClick={() => goToPage(1)}
            disabled={!table.getCanPreviousPage() || error || isLoading}
          >
            <span className="sr-only">Ir para a primeira página</span>
            <ChevronsLeft className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => {
              const page = requestedPageOf(listQuery.params);

              if (page > 1) goToPage(page - 1);
            }}
            disabled={!table.getCanPreviousPage() || error || isLoading}
          >
            <span className="sr-only">Ir para a página anterior</span>
            <ChevronLeft className="w-4 h-4" />
          </Button>

          {/* One line: at 768px with the sidebar open it broke into "Página 1" / "de 1". */}
          <div className="hidden whitespace-nowrap text-sm font-medium sm:block">
            Página {currentPage} de {table.getPageCount()}
          </div>

          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => {
              const page = requestedPageOf(listQuery.params);

              if (page < table.getPageCount()) goToPage(page + 1);
            }}
            disabled={!table.getCanNextPage() || error || isLoading}
          >
            <span className="sr-only">Ir para a próxima página</span>
            <ChevronRight className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => goToPage(table.getPageCount())}
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
