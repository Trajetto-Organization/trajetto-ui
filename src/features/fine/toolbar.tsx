"use client";

import { Table } from "@tanstack/react-table";
import { Building2, CircleDot, FileWarning } from "lucide-react";

import { SearchInputWithLoading } from "@/components/ui/search-input-with-loading";

import { useSearch } from "@/lib/search-params";

import { DataTableServerFilters } from "@/app/(protected)/_components/shared/tanstack-table/data-table-server-filters";
import { DataTableViewOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table-view-options";
import { facetOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import { FINE_STATUS_LABELS } from "./lib/status";
import type { FineListSearchMeta } from "./lib/types";

interface FineToolbarProps<TData> {
  /** The API's option lists and counts (`searchMeta.facets`). */
  facets?: FineListSearchMeta["facets"];
  /** Injected by DataTable via cloneElement — never passed by the caller. */
  table?: Table<TData>;
  error?: boolean;
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
}

/**
 * Search and filters of the fines list. Every filter is answered by the
 * server over the whole company: the options and their counts come from
 * the API, never from the rows on screen (decision 8.8). The /admin copy
 * also filtered by company over the loaded page; the company is picked above
 * the table now.
 */
function FineToolbar<TData>({
  facets,
  table,
  error,
  isLoading,
  setIsLoading,
}: FineToolbarProps<TData>) {
  const { handleSearch, searchParams, isPending } = useSearch();

  const handleSearchWithLoading = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setIsLoading?.(true);
    handleSearch(event);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 w-full">
      {/* The placeholder is the guided tour's anchor for the search step. */}
      <SearchInputWithLoading
        placeholder="Procurar..."
        aria-label="Buscar multas por motorista, placa, código, valor, filial ou ID"
        defaultValue={searchParams.get("search") || ""}
        onChange={handleSearchWithLoading}
        disabled={error}
        isLoading={isPending || isLoading}
        wrapperClassName="w-full sm:w-auto
        sm:min-w-[270px] sm:max-w-[270px]"
      />

      <DataTableServerFilters
        table={table}
        dataTutorial="fine-filters"
        filters={[
          {
            columnId: "status",
            title: "Situação",
            icon: CircleDot,
            options: facetOptions(facets?.status, FINE_STATUS_LABELS),
          },
          {
            columnId: "violationCode",
            title: "Código da infração",
            icon: FileWarning,
            options: facetOptions(facets?.trafficViolationCodeId),
          },
          {
            columnId: "branchName",
            title: "Filial",
            icon: Building2,
            options: facetOptions(facets?.branchId),
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

export { FineToolbar };
