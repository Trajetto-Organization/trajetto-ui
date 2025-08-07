"use client";

import { Table } from "@tanstack/react-table";
import { BookUser, Building2, MapPin, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useSearch } from "@/lib/search-params";

import { DataTableFacetedFilter } from "../../../tanstack-table/data-table-faceted-filter";
import { DataTableViewOptions } from "../../../tanstack-table/data-table-view-options";

import { DataTableRevalidate } from "../../../tanstack-table/data-table-revalidate";
import { CreateBranchForm } from "../create-branch-form";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  error: boolean;
}

export function BranchToolbar<TData>({
  table,
  error,
}: DataTableToolbarProps<TData>) {
  const { handleSearch, searchParams } = useSearch();
  const isFiltered = table.getState().columnFilters.length > 0;

  const filters = [
    {
      key: "corporate_reason",
      title: "Razão Social",
      dynamicOptionIcon: BookUser,
    },
    {
      key: "business_name",
      title: "Nome da Empresa",
      dynamicOptionIcon: BookUser,
    },
    { key: "email", title: "E-mail" },
    { key: "erp_code", title: "Código ERP" },
    { key: "city", title: "Cidade", dynamicOptionIcon: Building2 },
    { key: "uf", title: "UF", dynamicOptionIcon: MapPin },
    { key: "cnpj", title: "CNPJ" },
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
              revalidateData="update-branch"
              rateLimit={{
                storageKey: "branch",
                maxClicks: 3,
                timeWindowMs: 30000,
                cooldownTimeMs: 15000,
              }}
            />
            <DataTableViewOptions table={table} />
            <CreateBranchForm />
          </div>
        )}
      </div>
    </div>
  );
}
