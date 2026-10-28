"use client";

import type { Table } from "@tanstack/react-table";
import { MapPin } from "lucide-react";

import { SearchInputWithLoading } from "@/components/ui/search-input-with-loading";
import { useSearch } from "@/lib/search-params";

import { DataTableServerFilters } from "@/app/(protected)/_components/shared/tanstack-table/data-table-server-filters";
import { DataTableViewOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table-view-options";
import { facetOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import type { SupplierSearchMeta } from "../lib/server-table";

interface SupplierToolbarProps<TData> {
  /** The API's option lists and counts (`searchMeta.facets`). */
  facets?: SupplierSearchMeta["facets"];
  /** Injected by DataTable via cloneElement — never passed by the caller. */
  table?: Table<TData>;
  error?: boolean;
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
}

/**
 * Search and the UF filter of the supplier list, answered by the server over
 * the whole company (decision 8.8). The placeholder stays "Procurar...": the
 * guided tour points at it.
 */
function SupplierToolbar<TData>({
  facets,
  table,
  error,
  isLoading,
  setIsLoading,
}: SupplierToolbarProps<TData>) {
  const { handleSearch, searchParams, isPending } = useSearch();

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <SearchInputWithLoading
        placeholder="Procurar..."
        // The API caps the term at 100 characters.
        maxLength={100}
        aria-label="Buscar fornecedores por nome, CNPJ, e-mail, telefone, cidade, endereço ou ID"
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
        dataTutorial="supplier-filters"
        table={table}
        filters={[
          {
            columnId: "uf",
            title: "Estado",
            icon: MapPin,
            // UFs are their own labels; the counts come from the API.
            options: facetOptions(facets?.uf),
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

export { SupplierToolbar };
