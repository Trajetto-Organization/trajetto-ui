"use client";

import { useMemo } from "react";
import { ColumnDef, Table } from "@tanstack/react-table";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";
import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";
import { DataTableViewOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table-view-options";

import { SearchInputWithLoading } from "@/components/ui/search-input-with-loading";
import { useSearch } from "@/lib/search-params";
import { displayValue, formatNotificationDate } from "@/lib/format-values";

import { useFleetBusinessId } from "@/features/vehicle/hooks/use-fleet-business-id";

import type { VehicleTypeListMeta, VehicleTypeRow } from "../types";
import { VEHICLE_TYPE_TABLE } from "../server-table";
import { CNH_CATEGORY_LABELS } from "../lib/form";
import { VehicleTypeRowActions } from "../row-actions";

function buildVehicleTypeColumns(
  businessId: string,
): ColumnDef<VehicleTypeRow>[] {
  return [
    {
      accessorKey: "description",
      meta: { title: "Nome" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nome" />
      ),
      cell: ({ row }) => (
        <p
          className="w-48 truncate font-medium"
          title={row.original.description}
        >
          {row.original.description}
        </p>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "number_of_axles",
      meta: { title: "Eixos padrão" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Eixos padrão" />
      ),
      cell: ({ row }) => (
        <p className="w-16 font-medium">{row.original.number_of_axles}</p>
      ),
    },
    {
      accessorKey: "required_cnh_category",
      meta: { title: "CNH exigida" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="CNH exigida" />
      ),
      cell: ({ row }) => {
        const category = row.original.required_cnh_category;

        return (
          <p className="w-56 truncate font-medium">
            {category ? CNH_CATEGORY_LABELS[category] : "Não exigida"}
          </p>
        );
      },
    },
    {
      id: "vehicleCount",
      accessorFn: (row) => row._count?.vehicles ?? 0,
      meta: { title: "Veículos" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Veículos" />
      ),
      cell: ({ row }) => (
        <p className="w-16 font-medium">{row.original._count?.vehicles ?? 0}</p>
      ),
    },
    {
      accessorKey: "created_at",
      meta: { title: "Cadastrado em" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Cadastrado em" />
      ),
      cell: ({ row }) => (
        <p className="w-36 truncate font-medium">
          {displayValue(formatNotificationDate(row.original.created_at))}
        </p>
      ),
    },
    {
      id: "actions",
      meta: { title: "Ações" },
      header: () => <span className="sr-only">Ações</span>,
      cell: ({ row }) => (
        <VehicleTypeRowActions row={row} businessId={businessId} />
      ),
      enableHiding: false,
    },
  ];
}

interface VehicleTypeToolbarProps<TData> {
  table?: Table<TData>;
  error?: boolean;
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
}

function VehicleTypeToolbar<TData>({
  table,
  error,
  isLoading,
  setIsLoading,
}: VehicleTypeToolbarProps<TData>) {
  const { handleSearch, searchParams, isPending } = useSearch();

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <SearchInputWithLoading
        placeholder="Procurar..."
        aria-label="Buscar tipos de veículo por nome, número de eixos ou ID"
        defaultValue={searchParams.get("search") || ""}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          setIsLoading?.(true);
          handleSearch(event);
        }}
        disabled={error}
        isLoading={isPending || isLoading}
        wrapperClassName="w-full sm:w-auto sm:min-w-[270px] sm:max-w-[270px]"
      />

      {!error && table && (
        <div className="w-full sm:ml-auto sm:w-auto">
          <DataTableViewOptions table={table} />
        </div>
      )}
    </div>
  );
}

interface VehicleTypeTableProps {
  data: VehicleTypeRow[];
  meta: VehicleTypeListMeta;
  responseError: { error: boolean; errorMessage: string };
}

const VehicleTypeTable = ({
  data,
  meta,
  responseError,
}: VehicleTypeTableProps): JSX.Element => {
  const businessId = useFleetBusinessId() ?? "";
  const columns = useMemo(
    () => buildVehicleTypeColumns(businessId),
    [businessId],
  );

  return (
    <DataTable
      data={data}
      meta={meta}
      columns={columns}
      responseError={responseError}
      server={VEHICLE_TYPE_TABLE}
      toolbar={<VehicleTypeToolbar />}
    />
  );
};

export { VehicleTypeTable, buildVehicleTypeColumns };
