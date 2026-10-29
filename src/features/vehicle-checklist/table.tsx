"use client";

import { useMemo } from "react";
import { Table } from "@tanstack/react-table";
import { Building2, CircleDot, Truck } from "lucide-react";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";
import { DataTableServerFilters } from "@/app/(protected)/_components/shared/tanstack-table/data-table-server-filters";
import { DataTableViewOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table-view-options";
import { facetOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import { SearchInputWithLoading } from "@/components/ui/search-input-with-loading";
import { useSearch } from "@/lib/search-params";

import type { vehicleChecklistTableSchema } from "@/schemas/vehicle-checklist-table-schema";

import { buildVehicleChecklistColumns } from "./table-columns";
import { VehicleChecklistRowActions } from "./row-actions";
import {
  CHECKLIST_CONDITION_LABELS,
  CHECKLIST_TABLE,
  type ChecklistSearchMeta,
} from "./server-table";

interface ChecklistToolbarProps<TData> {
  facets?: ChecklistSearchMeta["facets"];
  table?: Table<TData>;
  error?: boolean;
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
}

/** Search and filters, answered by the server over the whole company. */
function ChecklistToolbar<TData>({
  facets,
  table,
  error,
  isLoading,
  setIsLoading,
}: ChecklistToolbarProps<TData>) {
  const { handleSearch, searchParams, isPending } = useSearch();

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <SearchInputWithLoading
        placeholder="Procurar..."
        aria-label="Buscar checklists por ID, observações, veículo, motorista ou filial"
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
        dataTutorial="checklist-filters"
        filters={[
          {
            columnId: "overall_condition",
            title: "Condição geral",
            icon: CircleDot,
            options: facetOptions(
              facets?.overall_condition,
              CHECKLIST_CONDITION_LABELS,
            ),
          },
          {
            columnId: "vehicle_license_plate",
            title: "Veículo",
            icon: Truck,
            options: facetOptions(facets?.vehicleId),
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

interface VehicleChecklistTableProps {
  data: vehicleChecklistTableSchema[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    searchMeta?: ChecklistSearchMeta;
  };
  responseError: { error: boolean; errorMessage: string };
}

const VehicleChecklistTable = ({
  data,
  meta,
  responseError,
}: VehicleChecklistTableProps): JSX.Element => {
  const columns = useMemo(
    () =>
      buildVehicleChecklistColumns({
        renderRowActions: (row) => <VehicleChecklistRowActions row={row} />,
      }),
    [],
  );

  return (
    <DataTable
      data={data}
      meta={meta}
      columns={columns}
      responseError={responseError}
      server={CHECKLIST_TABLE}
      toolbar={<ChecklistToolbar facets={meta.searchMeta?.facets} />}
    />
  );
};

export { VehicleChecklistTable };
