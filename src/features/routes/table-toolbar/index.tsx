"use client";

import { Table } from "@tanstack/react-table";
import { CircleDot, Truck, UserRound } from "lucide-react";

import { SearchInputWithLoading } from "@/components/ui/search-input-with-loading";

import { DataTableServerFilters } from "@/app/(protected)/_components/shared/tanstack-table/data-table-server-filters";
import { DataTableViewOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table-view-options";
import { facetOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import { useSearch } from "@/lib/search-params";

import type { RouteListItem } from "@/actions/route/get-route";

import {
  ROUTE_STATUS_FILTER_LABELS,
  type RouteListSearchMeta,
} from "../server-table";

interface RoutesTableToolbarProps {
  /** The API's option lists and counts (`searchMeta.facets`). */
  facets?: RouteListSearchMeta["facets"];

  /**
   * Injected by DataTable via cloneElement — never passed by the caller.
   */
  table?: Table<RouteListItem>;
  error?: boolean;
  isLoading?: boolean;
  setIsLoading?: (value: boolean) => void;
}

/**
 * Search and filters of the routes board. Every filter is answered by the
 * server over the whole company (decision 8.8): the options and their counts
 * come from the API, never from the rows on screen. The chips used to filter
 * only the page already loaded while the pager counted the whole company.
 */
const RoutesTableToolbar = ({
  facets,
  table,
  error,
  isLoading,
  setIsLoading,
}: RoutesTableToolbarProps): JSX.Element => {
  const { handleSearch, searchParams, isPending } = useSearch();

  const handleSearchWithLoading = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setIsLoading?.(true);
    handleSearch(event);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 w-full">
      <SearchInputWithLoading
        data-tutorial="routes-search"
        // Fits the 270px box; the label names every field searched.
        placeholder="Nome, motorista, número ou ID..."
        aria-label="Buscar rotas por nome, destino, motorista, número ou ID"
        defaultValue={searchParams.get("search") || ""}
        onChange={handleSearchWithLoading}
        disabled={error}
        isLoading={isPending || isLoading}
        wrapperClassName="w-full sm:w-auto sm:min-w-[270px] sm:max-w-[270px]"
      />

      <DataTableServerFilters
        table={table}
        dataTutorial="routes-filters"
        filters={[
          {
            columnId: "status",
            title: "Status",
            icon: CircleDot,
            options: facetOptions(facets?.status, ROUTE_STATUS_FILTER_LABELS),
          },
          {
            columnId: "driverName",
            title: "Motorista",
            icon: UserRound,
            options: facetOptions(facets?.driverId),
          },
          {
            columnId: "vehiclePlate",
            title: "Veículo",
            icon: Truck,
            options: facetOptions(facets?.vehicleId),
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
};

export { RoutesTableToolbar };
