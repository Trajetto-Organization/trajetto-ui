"use client";

import { Table } from "@tanstack/react-table";
import { MapPin, ShieldCheck } from "lucide-react";

import { SearchInputWithLoading } from "@/components/ui/search-input-with-loading";

import { useSearch } from "@/lib/search-params";

import { DataTableServerFilters } from "@/app/(protected)/_components/shared/tanstack-table/data-table-server-filters";
import { DataTableViewOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table-view-options";
import { facetOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import {
  BUSINESS_STATUS_LABELS,
  type BusinessSearchMeta,
} from "../lib/server-table";

interface DataTableToolbarProps<TData> {
  /** The API's option lists and counts (`searchMeta.facets`). */
  facets?: BusinessSearchMeta["facets"];
  /** Injected by DataTable via cloneElement — never passed by the caller. */
  table?: Table<TData>;
  error?: boolean;
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
}

/**
 * Search plus the status and UF filters, answered by the server over every
 * company (decision 8.8). The old toolbar filtered name, e-mail, ERP code,
 * city and CNPJ among the ten rows on screen; the search covers those now,
 * on the server. The placeholder stays "Procurar...": the guided tours
 * point at it.
 */
export function BusinessToolbar<TData>({
  facets,
  table,
  error,
  isLoading,
  setIsLoading,
}: DataTableToolbarProps<TData>) {
  const { handleSearch, searchParams, isPending } = useSearch();

  return (
    <div className="flex flex-wrap items-center gap-2 w-full">
      <SearchInputWithLoading
        placeholder="Procurar..."
        aria-label="Buscar empresas por razão social, nome fantasia, CNPJ, e-mail, cidade, código ERP, responsável ou ID"
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
        dataTutorial="business-filters"
        table={table}
        filters={[
          {
            columnId: "is_active",
            title: "Status",
            icon: ShieldCheck,
            options: facetOptions(facets?.status, BUSINESS_STATUS_LABELS),
          },
          {
            columnId: "uf",
            title: "UF",
            icon: MapPin,
            options: facetOptions(facets?.uf),
          },
        ]}
      />

      {!error && table && (
        <div className="w-full sm:w-auto sm:ml-auto">
          <DataTableViewOptions table={table} />
        </div>
      )}
    </div>
  );
}
