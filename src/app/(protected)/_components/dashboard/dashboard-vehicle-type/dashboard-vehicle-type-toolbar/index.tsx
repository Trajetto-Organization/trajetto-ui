"use client";

import { Table } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";

import { useSearch } from "@/lib/search-params";
import { DataTableViewOptions } from "../../../tanstack-table/data-table-view-options";

import { DataTableRevalidate } from "../../../tanstack-table/data-table-revalidate";
import { DashboardCreateVehicleTypeForm } from "../dashboard-create-vehicle-type-form";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  error: boolean;
}

export function DashboardVehicleTypeToolbar<TData>({
  table,
  error,
}: DataTableToolbarProps<TData>) {
  const { handleSearch, searchParams } = useSearch();

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

        {!error && (
          <div className="ml-auto flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
            <DataTableRevalidate
              revalidateData="update-vehicle-type"
              rateLimit={{
                storageKey: "dashboard-vehicle-type",
                maxClicks: 3,
                timeWindowMs: 30000,
                cooldownTimeMs: 15000,
              }}
            />
            <DataTableViewOptions table={table} />
            <DashboardCreateVehicleTypeForm />
          </div>
        )}
      </div>
    </div>
  );
}
