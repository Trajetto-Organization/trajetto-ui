"use client";

import { Table } from "@tanstack/react-table";
import { FileText, Truck } from "lucide-react";

import { SearchInputWithLoading } from "@/components/ui/search-input-with-loading";

import { useSearch } from "@/lib/search-params";

import { DataTableServerFilters } from "@/app/(protected)/_components/shared/tanstack-table/data-table-server-filters";
import { DataTableViewOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table-view-options";
import { facetOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import {
  QUOTE_FLEET_SIZE_LABELS,
  QUOTE_STATUS_LABELS,
  type QuoteSearchMeta,
} from "../lib/server-table";

interface DataTableToolbarProps<TData> {
  /** The API's option lists and counts (`searchMeta.facets`). */
  facets?: QuoteSearchMeta["facets"];
  /** Injected by DataTable via cloneElement — never passed by the caller. */
  table?: Table<TData>;
  error?: boolean;
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
}

/**
 * Search plus the stage and fleet-size filters, answered by the server over
 * every quote (decision 8.8). The company filter listed the companies of the
 * ten rows on screen; the search finds a company now, on the server.
 */
export function QuoteToolbar<TData>({
  facets,
  table,
  error,
  isLoading,
  setIsLoading,
}: DataTableToolbarProps<TData>) {
  const { handleSearch, searchParams, isPending } = useSearch();

  return (
    <div className="flex flex-wrap items-center gap-2 w-full">
      <SearchInputWithLoading
        placeholder="Procurar..."
        aria-label="Buscar orçamentos por nome, empresa, e-mail, telefone, mensagem ou anotações"
        defaultValue={searchParams.get("search") || ""}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          setIsLoading?.(true);
          handleSearch(event);
        }}
        disabled={error}
        isLoading={isPending || isLoading}
        wrapperClassName="w-full sm:w-auto sm:min-w-[270px] sm:max-w-[270px]"
      />

      <DataTableServerFilters
        dataTutorial="quote-filters"
        table={table}
        filters={[
          {
            columnId: "status",
            title: "Status",
            icon: FileText,
            options: facetOptions(facets?.status, QUOTE_STATUS_LABELS),
          },
          {
            columnId: "fleet_size",
            title: "Tamanho da Frota",
            icon: Truck,
            options: facetOptions(facets?.fleet_size, QUOTE_FLEET_SIZE_LABELS),
          },
        ]}
      />

      {!error && table && (
        <div className="w-full sm:w-auto sm:ml-auto">
          <DataTableViewOptions table={table} />
        </div>
      )}
    </div>
  );
}
