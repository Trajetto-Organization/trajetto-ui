"use client";

import type { Table } from "@tanstack/react-table";
import { Truck } from "lucide-react";

import { SearchInputWithLoading } from "@/components/ui/search-input-with-loading";
import { useSearch } from "@/lib/search-params";

import { DataTableServerFilters } from "@/app/(protected)/_components/shared/tanstack-table/data-table-server-filters";
import { DataTableViewOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table-view-options";
import { facetOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import type { PartSearchMeta } from "./lib/part-rules";

interface PartToolbarProps<TData> {
  facets?: PartSearchMeta["facets"];
  table?: Table<TData>;
  error?: boolean;
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
}

/** Search and the supplier filter, answered by the server (decision 8.8). */
function PartToolbar<TData>({
  facets,
  table,
  error,
  isLoading,
  setIsLoading,
}: PartToolbarProps<TData>) {
  const { handleSearch, searchParams, isPending } = useSearch();

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <SearchInputWithLoading
        placeholder="Procurar..."
        aria-label="Buscar peças por ID, descrição ou fornecedor"
        title="ID, descrição ou fornecedor"
        defaultValue={searchParams.get("search") || ""}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          setIsLoading?.(true);
          handleSearch(event);
        }}
        disabled={error}
        isLoading={isPending || isLoading}
        wrapperClassName="w-full sm:w-auto sm:min-w-[270px] sm:max-w-[270px]"
      />

      <DataTableServerFilters
        dataTutorial="part-filters"
        table={table}
        filters={[
          {
            columnId: "supplierName",
            title: "Fornecedor",
            icon: Truck,
            options: facetOptions(facets?.supplierId),
          },
        ]}
      />

      {!error && table && (
        <div className="w-full sm:ml-auto sm:w-auto">
          <DataTableViewOptions table={table} />
        </div>
      )}
    </div>
  );
}

export { PartToolbar };
