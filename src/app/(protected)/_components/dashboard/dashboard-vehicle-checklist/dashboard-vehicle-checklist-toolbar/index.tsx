"use client";

import { Table } from "@tanstack/react-table";
import { Building2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SearchInputWithLoading } from "@/components/ui/search-input-with-loading";

import { useSearch } from "@/lib/search-params";

import { DataTableFacetedFilter } from "../../../tanstack-table/data-table-faceted-filter";
import { DataTableViewOptions } from "../../../tanstack-table/data-table-view-options";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  error: boolean;
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
}

export function DashboardVehicleChecklistToolbar<TData>({
  table,
  error,
  isLoading,
  setIsLoading,
}: DataTableToolbarProps<TData>) {
  const { handleSearch, searchParams, isPending } = useSearch();
  const isFiltered = table.getState().columnFilters.length > 0;

  const handleSearchWithLoading = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setIsLoading?.(true);
    handleSearch(event);
  };

  const conditionOptions = [
    {
      label: "Aprovado",
      value: "approved",
    },
    {
      label: "Aprovado com Restrições",
      value: "approved_with_restrictions",
    },
    {
      label: "Rejeitado",
      value: "rejected",
    },
  ];

  const filters = [
    {
      key: "branch_name",
      title: "Nome da filial",
      dynamicOptionIcon: Building2,
    },
    {
      key: "vehicle_license_plate",
      title: "Placa do veículo",
    },
    {
      key: "overall_condition",
      title: "Condição geral",
      options: conditionOptions,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 w-full">
      <SearchInputWithLoading
        placeholder="Procurar..."
        defaultValue={searchParams.get("search") || ""}
        onChange={handleSearchWithLoading}
        disabled={error}
        isLoading={isPending || isLoading}
        wrapperClassName="w-full sm:w-auto
        sm:min-w-[270px] sm:max-w-[270px]"
      />

      {filters.map(({ key, title, dynamicOptionIcon, options }) => {
        const column = table.getColumn(key);
        if (!column) return null;

        return (
          <DataTableFacetedFilter
            key={key}
            column={column}
            title={title}
            dynamicOptionIcon={dynamicOptionIcon}
            options={options}
          />
        );
      })}

      {isFiltered && (
        <Button
          variant="ghost"
          onClick={() => table.resetColumnFilters()}
          className="h-8 px-2 lg:px-3
          flex items-center gap-1"
        >
          Resetar
          <X className="h-4 w-4" />
        </Button>
      )}

      {!error && (
        <div
          className="w-full
          sm:w-auto sm:ml-auto"
        >
          <DataTableViewOptions table={table} />
        </div>
      )}
    </div>
  );
}
