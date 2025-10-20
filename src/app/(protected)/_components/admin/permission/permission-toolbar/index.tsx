"use client";

import { Table } from "@tanstack/react-table";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SearchInputWithLoading } from "@/components/ui/search-input-with-loading";

import { permissionLabels } from "@/lib/permissions";
import { useSearch } from "@/lib/search-params";

import { DataTableFacetedFilter } from "../../../tanstack-table/data-table-faceted-filter";

import { DataTableViewOptions } from "../../../tanstack-table/data-table-view-options";
import { CreatePermissionForm } from "../create-permission-form";

import { canRead, canWrite } from "../data";
import { DataTableRevalidate } from "../../../tanstack-table/data-table-revalidate";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  error: boolean;
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
}

export function PermissionToolbar<TData>({
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
    { key: "action", title: "Nome da permissão" },
    {
      key: "permission",
      title: "Permissão",
      options: Object.entries(permissionLabels).map(([value, label]) => ({
        value,
        label,
      })),
    },
    { key: "canRead", title: "Leitura", options: canRead },
    { key: "canWrite", title: "Escrita", options: canWrite },
    { key: "corporate_reason", title: "Empresa" },
    { key: "profile_name", title: "Perfil de acesso" },
  ];

  return (
    <div
      className="flex flex-col sm:flex-row items-start
      sm:items-center justify-between gap-4 w-full"
    >
      <div
        className="flex flex-wrap flex-1 
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
            className="h-8 px-2 flex 
            items-center gap-1 justify-center"
          >
            Resetar
            <X width={17} />
          </Button>
        )}

        {!error && (
          <div className="ml-auto flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
            <DataTableRevalidate
              revalidateData="update-permission"
              rateLimit={{
                storageKey: "permission",
                maxClicks: 3,
                timeWindowMs: 30000,
                cooldownTimeMs: 15000,
              }}
            />
            <DataTableViewOptions table={table} />
            <CreatePermissionForm />
          </div>
        )}
      </div>
    </div>
  );
}
