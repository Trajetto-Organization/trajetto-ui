"use client";

import { Table } from "@tanstack/react-table";
import { BookUser, Building2, MapPin, X } from "lucide-react";

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

export function BusinessToolbar<TData>({
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

  const filters = [
    {
      key: "corporate_reason",
      title: "Razão Social",
      dynamicOptionIcon: BookUser,
    },
    { key: "email", title: "E-mail" },
    { key: "erp_code", title: "Código ERP" },
    { key: "city", title: "Cidade", dynamicOptionIcon: Building2 },
    { key: "uf", title: "UF", dynamicOptionIcon: MapPin },
    { key: "cnpj", title: "CNPJ" },
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

      {filters.map(({ key, title, dynamicOptionIcon }) => {
        const column = table.getColumn(key);
        if (!column) return null;

        return (
          <DataTableFacetedFilter
            key={key}
            column={column}
            title={title}
            dynamicOptionIcon={dynamicOptionIcon}
          />
        );
      })}

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
