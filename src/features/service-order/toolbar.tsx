"use client";

import type { Table } from "@tanstack/react-table";
import { Building2, CircleDot, Wrench } from "lucide-react";

import { SearchInputWithLoading } from "@/components/ui/search-input-with-loading";
import { useSearch } from "@/lib/search-params";

import { DataTableServerFilters } from "@/app/(protected)/_components/shared/tanstack-table/data-table-server-filters";
import { DataTableViewOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table-view-options";
import { facetOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import {
  MAINTENANCE_TYPE_LABELS,
  SERVICE_ORDER_STATUS_LABELS,
} from "./lib/service-order-rules";
import type { ServiceOrderSearchMeta } from "./server-table";

interface ServiceOrderToolbarProps<TData> {
  /** The API's options and counts (`searchMeta.facets`). */
  facets?: ServiceOrderSearchMeta["facets"];
  /** Injected by DataTable via cloneElement — never passed by the caller. */
  table?: Table<TData>;
  error?: boolean;
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
}

/**
 * Search and filters of the service order list, answered by the server over
 * the whole company (decision 8.8). The branch filter used to list the
 * branches of the ten rows on screen.
 */
function ServiceOrderToolbar<TData>({
  facets,
  table,
  error,
  isLoading,
  setIsLoading,
}: ServiceOrderToolbarProps<TData>) {
  const { handleSearch, searchParams, isPending } = useSearch();

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <SearchInputWithLoading
        placeholder="Procurar..."
        aria-label="Buscar ordens por ID, descrição, placa, responsável, filial, fornecedor ou valor"
        title="ID, descrição, placa, responsável, filial, fornecedor ou valor"
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
        dataTutorial="service-order-filters"
        table={table}
        filters={[
          {
            columnId: "status",
            title: "Situação",
            icon: CircleDot,
            options: facetOptions(facets?.status, SERVICE_ORDER_STATUS_LABELS),
          },
          {
            columnId: "maintenance_type",
            title: "Tipo de manutenção",
            icon: Wrench,
            options: facetOptions(
              facets?.maintenanceType,
              MAINTENANCE_TYPE_LABELS,
            ),
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
        <div className="w-full sm:ml-auto sm:w-auto">
          <DataTableViewOptions table={table} />
        </div>
      )}
    </div>
  );
}

export { ServiceOrderToolbar };
