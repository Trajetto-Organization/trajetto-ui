"use client";

import type { Table } from "@tanstack/react-table";
import { CircleDot, Tags } from "lucide-react";

import { SearchInputWithLoading } from "@/components/ui/search-input-with-loading";
import { useSearch } from "@/lib/search-params";

import { DataTableServerFilters } from "@/app/(protected)/_components/shared/tanstack-table/data-table-server-filters";
import { DataTableViewOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table-view-options";
import { facetOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import { ACCOUNT_PAYABLE_CATEGORY_LABELS } from "@/lib/account-payable-category";

import type { AccountPayableSearchMeta } from "../lib/server-table";
import { STATUS_GROUP_LABELS } from "../lib/status";

interface AccountPayableToolbarProps<TData> {
  /** The API's option lists and counts (`searchMeta.facets`). */
  facets?: AccountPayableSearchMeta["facets"];
  /** Injected by DataTable via cloneElement — never passed by the caller. */
  table?: Table<TData>;
  error?: boolean;
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
}

/**
 * Search and filters of the bills, answered by the server over the whole
 * company (decision 8.8). "Situação" is the API's, by the company's
 * business day. The old "Nome da filial"/"Nome da empresa" filters offered
 * only the values of the ten rows on screen. The placeholder stays
 * "Procurar...": the guided tour points at it.
 */
function AccountPayableToolbar<TData>({
  facets,
  table,
  error,
  isLoading,
  setIsLoading,
}: AccountPayableToolbarProps<TData>) {
  const { handleSearch, searchParams, isPending } = useSearch();

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <SearchInputWithLoading
        placeholder="Procurar..."
        // The API caps the term at 100 characters.
        maxLength={100}
        aria-label="Buscar contas por favorecido, fornecedor, descrição, documento, placa, filial, responsável, valor ou ID"
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
        dataTutorial="account-payable-filters"
        table={table}
        filters={[
          {
            columnId: "status",
            title: "Situação",
            icon: CircleDot,
            options: facetOptions(facets?.status, STATUS_GROUP_LABELS),
          },
          {
            columnId: "category",
            title: "Categoria",
            icon: Tags,
            // A closed set, labelled here; the API sends no counts for it.
            options: facetOptions(undefined, ACCOUNT_PAYABLE_CATEGORY_LABELS),
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

export { AccountPayableToolbar };
