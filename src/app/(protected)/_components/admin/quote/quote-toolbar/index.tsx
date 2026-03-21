"use client";

import { Table } from "@tanstack/react-table";
import { FileText, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SearchInputWithLoading } from "@/components/ui/search-input-with-loading";

import { useSearch } from "@/lib/search-params";

import { DataTableFacetedFilter } from "@/app/(protected)/_components/shared/tanstack-table/data-table-faceted-filter";
import { DataTableViewOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table-view-options";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  error: boolean;
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
}

const statusOptions = [
  {
    label: "Pendente",
    value: "PENDING",
    icon: FileText,
  },
  {
    label: "Contatado",
    value: "CONTACTED",
    icon: FileText,
  },
  {
    label: "Fechado",
    value: "CLOSED",
    icon: FileText,
  },
  {
    label: "Convertido",
    value: "CONVERTED",
    icon: FileText,
  },
];

const fleetSizeOptions = [
  {
    label: "1 a 5 veículos",
    value: "1-5",
  },
  {
    label: "6 a 15 veículos",
    value: "6-15",
  },
  {
    label: "16 a 30 veículos",
    value: "16-30",
  },
  {
    label: "31 a 50 veículos",
    value: "31-50",
  },
  {
    label: "51 a 100 veículos",
    value: "51-100",
  },
  {
    label: "Mais de 100 veículos",
    value: "101+",
  },
];

export function QuoteToolbar<TData>({
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

      {table.getColumn("company") && (
        <DataTableFacetedFilter
          column={table.getColumn("company")}
          title="Empresa"
        />
      )}

      {table.getColumn("status") && (
        <DataTableFacetedFilter
          column={table.getColumn("status")}
          title="Status"
          options={statusOptions}
        />
      )}

      {table.getColumn("fleet_size") && (
        <DataTableFacetedFilter
          column={table.getColumn("fleet_size")}
          title="Tamanho da Frota"
          options={fleetSizeOptions}
        />
      )}

      {isFiltered && (
        <Button
          variant="ghost"
          onClick={() => table.resetColumnFilters()}
          className="h-8 px-2 lg:px-3 flex items-center gap-1"
        >
          Resetar
          <X className="h-4 w-4" />
        </Button>
      )}

      {!error && (
        <div className="w-full sm:w-auto sm:ml-auto">
          <DataTableViewOptions table={table} />
        </div>
      )}
    </div>
  );
}
