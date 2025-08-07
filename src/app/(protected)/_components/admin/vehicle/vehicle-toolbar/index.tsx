"use client";

import { Table } from "@tanstack/react-table";
import { Building2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useSearch } from "@/lib/search-params";
import { vehicleStatus } from "../data";

import { DataTableFacetedFilter } from "../../../tanstack-table/data-table-faceted-filter";
import { DataTableViewOptions } from "../../../tanstack-table/data-table-view-options";

import { DataTableRevalidate } from "../../../tanstack-table/data-table-revalidate";
import { CreateVehicleForm } from "../create-vehicle-form";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  error: boolean;
}

export function VehicleToolbar<TData>({
  table,
  error,
}: DataTableToolbarProps<TData>) {
  const { handleSearch, searchParams } = useSearch();
  const isFiltered = table.getState().columnFilters.length > 0;

  const filters = [
    {
      key: "business_name",
      title: "Nome da empresa",
      dynamicOptionIcon: Building2,
    },
    {
      key: "branchName",
      title: "Nome da filial",
      dynamicOptionIcon: Building2,
    },
    {
      key: "status",
      title: "Status do veículo",
      options: vehicleStatus,
    },
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
            className="h-8 px-2 flex 
            items-center gap-1 justify-center"
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
              revalidateData="update-vehicle"
              rateLimit={{
                storageKey: "vehicle",
                maxClicks: 3,
                timeWindowMs: 30000,
                cooldownTimeMs: 15000,
              }}
            />
            <DataTableViewOptions table={table} />
            <CreateVehicleForm />
          </div>
        )}
      </div>
    </div>
  );
}
