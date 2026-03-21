"use client";

import { Table } from "@tanstack/react-table";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SearchInputWithLoading } from "@/components/ui/search-input-with-loading";

import { DataTableFacetedFilter } from "@/app/(protected)/_components/shared/tanstack-table/data-table-faceted-filter";
import { DataTableViewOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table-view-options";

import { useSearch } from "@/lib/search-params";
import { twoFactor } from "../data";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  error: boolean;
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
}

export function MasterUserToolbar<TData>({
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
    { key: "name", title: "Nome" },
    { key: "email", title: "E-mail" },
    {
      key: "two_factor_enabled",
      title: "Verificação (2FA)",
      options: twoFactor,
    },
  ];

  return (
    <div
      className="flex flex-wrap
      items-center gap-2 w-full"
    >
      <SearchInputWithLoading
        placeholder="Procurar..."
        defaultValue={searchParams.get("search") || ""}
        onChange={handleSearchWithLoading}
        disabled={error}
        isLoading={isPending || isLoading}
        wrapperClassName="w-full sm:w-auto
        sm:min-w-[270px] sm:max-w-[270px]"
      />

      {filters.map(({ key, title, options }) => {
        const column = table.getColumn(key);
        if (!column) return null;

        return (
          <DataTableFacetedFilter
            key={key}
            column={column}
            title={title}
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
        <div className="w-full sm:w-auto sm:ml-auto flex gap-2">
          <div className="w-full sm:w-auto">
            <DataTableViewOptions table={table} />
          </div>
        </div>
      )}
    </div>
  );
}
