"use client";

import { Table } from "@tanstack/react-table";
import { Building2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useSearch } from "@/lib/search-params";

import { DataTableFacetedFilter } from "../../../tanstack-table/data-table-faceted-filter";
import { DataTableViewOptions } from "../../../tanstack-table/data-table-view-options";

import { DataTableRevalidate } from "../../../tanstack-table/data-table-revalidate";
import { CreateVehicleChecklistForm } from "../create-vehicle-checklist-form";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  error: boolean;
}

export function VehicleChecklistToolbar<TData>({
  table,
  error,
}: DataTableToolbarProps<TData>) {
  const { handleSearch, searchParams } = useSearch();
  const isFiltered = table.getState().columnFilters.length > 0;

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
      key: "business_name",
      title: "Nome da empresa",
      dynamicOptionIcon: Building2,
    },
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
              revalidateData="update-vehicle-checklist"
              rateLimit={{
                storageKey: "vehicle-checklist",
                maxClicks: 3,
                timeWindowMs: 30000,
                cooldownTimeMs: 15000,
              }}
            />
            <DataTableViewOptions table={table} />
            <CreateVehicleChecklistForm />
          </div>
        )}
      </div>
    </div>
  );
}
