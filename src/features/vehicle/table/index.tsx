"use client";

import { useMemo } from "react";
import { Table } from "@tanstack/react-table";
import { Building2, CircleDot } from "lucide-react";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";
import { DataTableServerFilters } from "@/app/(protected)/_components/shared/tanstack-table/data-table-server-filters";
import { DataTableViewOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table-view-options";
import { facetOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import { SearchInputWithLoading } from "@/components/ui/search-input-with-loading";
import { useSearch } from "@/lib/search-params";
import { VEHICLE_STATUS_LABELS } from "@/lib/vehicle-status";

import type {
  VehicleListMeta,
  VehicleListSearchMeta,
  VehicleRow,
} from "../types";
import { VEHICLE_TABLE } from "../server-table";
import { buildVehicleColumns } from "../table-columns";
import { useFleetBusinessId } from "../hooks/use-fleet-business-id";
import { showsMaintenanceFields } from "../lib/form-values";
import { useAuthStore } from "@/store/auth-store";

interface VehicleToolbarProps<TData> {
  facets?: VehicleListSearchMeta["facets"];
  /** Injected by DataTable via cloneElement — never passed by the caller. */
  table?: Table<TData>;
  error?: boolean;
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
}

/**
 * Search and filters of the vehicle table, answered by the server over the
 * whole company: options and counts come from the API, never from the rows on
 * screen (decision 8.8).
 */
function VehicleToolbar<TData>({
  facets,
  table,
  error,
  isLoading,
  setIsLoading,
}: VehicleToolbarProps<TData>) {
  const { handleSearch, searchParams, isPending } = useSearch();

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <SearchInputWithLoading
        placeholder="Procurar..."
        aria-label="Buscar veículos por placa, descrição, marca, modelo, RENAVAM, motorista, tipo ou filial"
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
        table={table}
        dataTutorial="vehicle-filters"
        filters={[
          {
            columnId: "status",
            title: "Status",
            icon: CircleDot,
            options: facetOptions(facets?.status, VEHICLE_STATUS_LABELS),
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

interface VehicleTableProps {
  data: VehicleRow[];
  meta: VehicleListMeta;
  responseError: { error: boolean; errorMessage: string };
}

const VehicleTable = ({
  data,
  meta,
  responseError,
}: VehicleTableProps): JSX.Element => {
  const businessId = useFleetBusinessId() ?? "";
  const role = useAuthStore((state) => state.role);
  const enabledModules = useAuthStore((state) => state.enabledModules);
  const withMaintenance = showsMaintenanceFields({ role, enabledModules });
  const columns = useMemo(
    () => buildVehicleColumns(businessId, { withMaintenance }),
    [businessId, withMaintenance],
  );

  return (
    <DataTable
      data={data}
      meta={meta}
      columns={columns}
      responseError={responseError}
      server={VEHICLE_TABLE}
      toolbar={<VehicleToolbar facets={meta.searchMeta?.facets} />}
    />
  );
};

export { VehicleTable, VehicleToolbar };
