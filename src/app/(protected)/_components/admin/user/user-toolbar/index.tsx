"use client";

import { Table } from "@tanstack/react-table";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { DataTableFacetedFilter } from "../../../tanstack-table/data-table-faceted-filter";
import { DataTableViewOptions } from "../../../tanstack-table/data-table-view-options";

import { DataTableRevalidate } from "../../../tanstack-table/data-table-revalidate";
import { CreateUserForm } from "../create-user-form";

import { emailVerified, twoFactor } from "../data";
import { useSearch } from "@/lib/search-params";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  error: boolean;
}

export function UserToolbar<TData>({
  table,
  error,
}: DataTableToolbarProps<TData>) {
  const { handleSearch, searchParams } = useSearch();

  const isFiltered = table.getState().columnFilters.length > 0;

  const filters = [
    { key: "name", title: "Nome do usuário" },
    { key: "email", title: "E-mail" },
    {
      key: "two_factor_enabled",
      title: "Verificação (2FA)",
      options: twoFactor,
    },
    {
      key: "email_verified",
      title: "E-mail verificado",
      options: emailVerified,
    },
    { key: "corporate_reason", title: "Empresa" },
    { key: "profileAccess", title: "Perfil de acesso" },
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
              revalidateData="update-user-registration"
              rateLimit={{
                storageKey: "user-registration",
                maxClicks: 3,
                timeWindowMs: 30000,
                cooldownTimeMs: 15000,
              }}
            />
            <DataTableViewOptions table={table} />
            <CreateUserForm />
          </div>
        )}
      </div>
    </div>
  );
}
