"use client";

import { Table } from "@tanstack/react-table";
import { SearchInputWithLoading } from "@/components/ui/search-input-with-loading";

import { useSearch } from "@/lib/search-params";
import { DataTableViewOptions } from "../../../tanstack-table/data-table-view-options";

import { DataTableRevalidate } from "../../../tanstack-table/data-table-revalidate";
import { DashboardCreateVehicleTypeForm } from "../dashboard-create-vehicle-type-form";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  error: boolean;
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
}

export function DashboardVehicleTypeToolbar<TData>({
  table,
  error,
  isLoading,
  setIsLoading,
}: DataTableToolbarProps<TData>) {
  const { handleSearch, searchParams, isPending } = useSearch();

  const handleSearchWithLoading = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setIsLoading?.(true);
    handleSearch(event);
  };

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
