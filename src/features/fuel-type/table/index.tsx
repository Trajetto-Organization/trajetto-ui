"use client";

import { useMemo } from "react";
import type { ColumnDef, Table } from "@tanstack/react-table";

import { SearchInputWithLoading } from "@/components/ui/search-input-with-loading";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";
import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";
import { DataTableViewOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table-view-options";

import { useSearch } from "@/lib/search-params";
import { displayValue, formatNotificationDate } from "@/lib/format-values";

import { FUEL_TYPE_TABLE } from "../lib/server-table";
import type { FuelTypeRow } from "../lib/types";
import { FuelTypeRowActions } from "./row-actions";

/**
 * The fuel types table. Column ids are the API's sort keys, so the order is
 * asked of the server. The "Tipo do combustível" and "Nome da empresa"
 * filters of the old copies filtered the rows on screen; with at most eight
 * rows per company the search covers the first, and /admin shows one company
 * at a time, so the second is gone (decision 8.8).
 */
function buildFuelTypeColumns(): ColumnDef<FuelTypeRow>[] {
  return [
    {
      accessorKey: "description",
      meta: { title: "Descrição" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Descrição" />
      ),
      cell: ({ row }) => (
        <p className="w-48 truncate font-medium">
          {displayValue(row.original.description)}
        </p>
      ),
      // The description ("Diesel S10") is the type's identifier: what the
      // refueling form offers.
      enableHiding: false,
    },
    {
      accessorKey: "created_at",
      meta: { title: "Criação" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Data de criação" />
      ),
      cell: ({ row }) => (
        <p className="w-36 truncate font-medium">
          {displayValue(
            formatNotificationDate(row.original.created_at, "pt-BR"),
          )}
        </p>
      ),
    },
    {
      accessorKey: "updated_at",
      meta: { title: "Atualização" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Data de atualização" />
      ),
      cell: ({ row }) => (
        <p className="w-36 truncate font-medium">
          {displayValue(
            formatNotificationDate(row.original.updated_at, "pt-BR"),
          )}
        </p>
      ),
    },
    {
      id: "Ações",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Ações" />
      ),
      cell: ({ row }) => <FuelTypeRowActions row={row} />,
      enableHiding: false,
    },
  ];
}

interface FuelTypeToolbarProps<TData> {
  table?: Table<TData>;
  error?: boolean;
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
}

function FuelTypeToolbar<TData>({
  table,
  error,
  isLoading,
  setIsLoading,
}: FuelTypeToolbarProps<TData>) {
  const { handleSearch, searchParams, isPending } = useSearch();

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <SearchInputWithLoading
        placeholder="Procurar..."
        aria-label="Buscar tipos de combustível por nome ou ID"
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

interface FuelTypeTableProps {
  data: FuelTypeRow[];
  meta: { total: number; page: number; pageSize: number };
  responseError: { error: boolean; errorMessage: string };
}

const FuelTypeTable = ({
  data,
  meta,
  responseError,
}: FuelTypeTableProps): JSX.Element => {
  const columns = useMemo(buildFuelTypeColumns, []);

  return (
    <DataTable
      data={data}
      meta={meta}
      columns={columns}
      responseError={responseError}
      server={FUEL_TYPE_TABLE}
      toolbar={<FuelTypeToolbar />}
    />
  );
};

export { FuelTypeTable, buildFuelTypeColumns };
