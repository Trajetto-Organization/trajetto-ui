"use client";

import type { Table } from "@tanstack/react-table";
import { Building2, Fuel as FuelIcon, Truck } from "lucide-react";

import { SearchInputWithLoading } from "@/components/ui/search-input-with-loading";
import { useSearch } from "@/lib/search-params";

import { DataTableServerFilters } from "@/app/(protected)/_components/shared/tanstack-table/data-table-server-filters";
import { DataTableViewOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table-view-options";
import { facetOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import type { FuelListSearchMeta } from "../lib/server-table";

interface FuelToolbarProps<TData> {
  /** The API's option lists and counts (`searchMeta.facets`). */
  facets?: FuelListSearchMeta["facets"];
  /** Injected by DataTable via cloneElement — never passed by the caller. */
  table?: Table<TData>;
  error?: boolean;
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
}

/**
 * Search and filters of the refuelings list. Branch, vehicle and fuel type
 * are answered by the server over the whole company, with the options and
 * their counts from the API — they used to filter the ten rows on screen and
 * offer only the values those rows happened to carry (decision 8.8).
 */
function FuelToolbar<TData>({
  facets,
  table,
  error,
  isLoading,
  setIsLoading,
}: FuelToolbarProps<TData>) {
  const { handleSearch, searchParams, isPending } = useSearch();

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <SearchInputWithLoading
        placeholder="Procurar..."
        aria-label="Buscar abastecimentos por ID, placa, veículo, motorista, combustível, filial ou observação"
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
        dataTutorial="fuel-filters"
        table={table}
        filters={[
          {
            columnId: "branchName",
            title: "Filial",
            icon: Building2,
            options: facetOptions(facets?.branchId),
          },
          {
            columnId: "vehicle_license_plate",
            title: "Veículo",
            icon: Truck,
            options: facetOptions(facets?.vehicleId),
          },
          {
            columnId: "fuel_type_description",
            title: "Combustível",
            icon: FuelIcon,
            options: facetOptions(facets?.fuelTypeId),
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

export { FuelToolbar };
