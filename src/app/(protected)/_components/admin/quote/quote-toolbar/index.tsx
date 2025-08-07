"use client";

import { Table } from "@tanstack/react-table";
import { FileText, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useSearch } from "@/lib/search-params";

import { DataTableFacetedFilter } from "../../../tanstack-table/data-table-faceted-filter";
import { DataTableViewOptions } from "../../../tanstack-table/data-table-view-options";

import { DataTableRevalidate } from "../../../tanstack-table/data-table-revalidate";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  error: boolean;
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
}: DataTableToolbarProps<TData>) {
  const { handleSearch, searchParams } = useSearch();
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
      <div className="flex flex-wrap flex-1 items-center gap-2 w-full">
        <Input
          placeholder="Buscar por nome, empresa, email..."
          defaultValue={searchParams.get("search") || ""}
          onChange={handleSearch}
          className="h-8 flex-grow min-w-[150px] sm:max-w-[300px]"
          disabled={error}
        />

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

        {table.getColumn("company") && (
          <DataTableFacetedFilter
            column={table.getColumn("company")}
            title="Empresa"
          />
        )}

        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 flex items-center gap-1 justify-center"
          >
            Resetar
            <X width={17} />
          </Button>
        )}

        {!error && (
          <div
            className="ml-auto flex flex-col sm:flex-row 
            gap-2 sm:gap-4 w-full sm:w-auto"
          >
            <DataTableRevalidate
              revalidateData="update-quote-status"
              rateLimit={{
                storageKey: "quote",
                maxClicks: 3,
                timeWindowMs: 30000,
                cooldownTimeMs: 15000,
              }}
            />
            <DataTableViewOptions table={table} />
          </div>
        )}
      </div>
    </div>
  );
}
