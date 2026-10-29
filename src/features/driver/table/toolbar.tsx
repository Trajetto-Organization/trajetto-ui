"use client";

import { Table } from "@tanstack/react-table";
import { Building2, CircleDot, FileSignature, IdCard } from "lucide-react";

import { SearchInputWithLoading } from "@/components/ui/search-input-with-loading";

import { useSearch } from "@/lib/search-params";

import { DataTableServerFilters } from "@/app/(protected)/_components/shared/tanstack-table/data-table-server-filters";
import { DataTableViewOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table-view-options";
import { facetOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import {
  DRIVER_CONTRACT_LABELS,
  DRIVER_STATUS_LABELS,
  type DriverListSearchMeta,
} from "../lib/driver-rules";
import { CNH_CATEGORY_FILTER_LABELS } from "../server-table";

interface DriverToolbarProps<TData> {
  /** The API's option lists and counts (`searchMeta.facets`). */
  facets?: DriverListSearchMeta["facets"];
  /** Injected by DataTable via cloneElement — never passed by the caller. */
  table?: Table<TData>;
  error?: boolean;
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
}

/**
 * Search and filters of the driver list, answered by the server over the
 * whole company (decision 8.8). The old filters were CNH, CPF and branch
 * built from the ten rows on screen: a CPF filter offers every CPF once and
 * a branch outside the page could not be picked.
 */
function DriverToolbar<TData>({
  facets,
  table,
  error,
  isLoading,
  setIsLoading,
}: DriverToolbarProps<TData>) {
  const { handleSearch, searchParams, isPending } = useSearch();

  const handleSearchWithLoading = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setIsLoading?.(true);
    handleSearch(event);
  };

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      {/* The placeholder is also the guided tour's anchor on /dashboard/driver. */}
      <SearchInputWithLoading
        placeholder="Procurar..."
        aria-label="Buscar motoristas por nome, CNH, CPF, RG, CEP, endereço ou ID"
        defaultValue={searchParams.get("search") || ""}
        onChange={handleSearchWithLoading}
        disabled={error}
        isLoading={isPending || isLoading}
        wrapperClassName="w-full sm:w-auto sm:min-w-[270px] sm:max-w-[270px]"
      />

      <DataTableServerFilters
        table={table}
        dataTutorial="driver-filters"
        filters={[
          {
            columnId: "status",
            title: "Status",
            icon: CircleDot,
            options: facetOptions(facets?.status, DRIVER_STATUS_LABELS),
          },
          {
            columnId: "contract_type",
            title: "Tipo de contrato",
            icon: FileSignature,
            options: facetOptions(
              facets?.contract_type,
              DRIVER_CONTRACT_LABELS,
            ),
          },
          {
            columnId: "cnh_category",
            title: "Categoria da CNH",
            icon: IdCard,
            options: facetOptions(
              facets?.cnh_category,
              CNH_CATEGORY_FILTER_LABELS,
            ),
          },
          {
            columnId: "branchName",
            title: "Filial",
            icon: Building2,
            // Names come from the server, this company's branches only.
            options: facetOptions(facets?.branchId),
          },
        ]}
      />

      {!error && table && (
        <div className="w-full sm:ml-auto sm:w-auto">
          <DataTableViewOptions table={table} />
        </div>
      )}
    </div>
  );
}

export { DriverToolbar };
