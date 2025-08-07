"use client";

import { Table } from "@tanstack/react-table";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
}

export function PermissionToolbar<TData>({
  table,
  error,
}: DataTableToolbarProps<TData>) {
  const { handleSearch, searchParams } = useSearch();
  const isFiltered = table.getState().columnFilters.length > 0;

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
        <Input
          placeholder="Procurar..."
          defaultValue={searchParams.get("search") || ""}
          onChange={handleSearch}
          className="h-8 flex-grow min-w-[150px] sm:max-w-[250px]"
          disabled={error}
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
