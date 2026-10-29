"use client";

import { Table } from "@tanstack/react-table";
import {
  CircleDot,
  PackageCheck,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";

import { SearchInputWithLoading } from "@/components/ui/search-input-with-loading";

import { useSearch } from "@/lib/search-params";

import { DataTableServerFilters } from "@/app/(protected)/_components/shared/tanstack-table/data-table-server-filters";
import { DataTableViewOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table-view-options";
import { facetOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import {
  CATEGORY_LABELS,
  DELIVERY_STATUS_LABELS,
  SEVERITY_LABELS,
  type OccurrenceFeedSearchMeta,
} from "./server-table";

interface OccurrencesToolbarProps<TData> {
  /** The API's option lists and counts (`searchMeta.facets`). */
  facets?: OccurrenceFeedSearchMeta["facets"];
  /** Injected by DataTable via cloneElement — never passed by the caller. */
  table?: Table<TData>;
  error?: boolean;
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
}

/**
 * Search and filters of the occurrence feed. Every filter is answered by the
 * server over the whole company: the options and their counts come from the
 * API, never from the rows on screen (decision 8.8).
 *
 * The data-tutorial anchors are the deliveries toolbar's, so the tab's guided
 * tour keeps pointing at the same places.
 */
function OccurrencesToolbar<TData>({
  facets,
  table,
  error,
  isLoading,
  setIsLoading,
}: OccurrencesToolbarProps<TData>) {
  const { handleSearch, searchParams, isPending } = useSearch();

  const handleSearchWithLoading = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setIsLoading?.(true);
    handleSearch(event);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 w-full">
      <SearchInputWithLoading
        data-tutorial="deliveries-search"
        placeholder="ID, ID da entrega, destinatário ou tipo..."
        aria-label="Buscar ocorrências por ID, ID da entrega, destinatário ou tipo"
        defaultValue={searchParams.get("search") || ""}
        onChange={handleSearchWithLoading}
        disabled={error}
        isLoading={isPending || isLoading}
        wrapperClassName="w-full sm:w-auto
        sm:min-w-[270px] sm:max-w-[270px]"
      />

      <DataTableServerFilters
        table={table}
        dataTutorial="deliveries-filters"
        filters={[
          {
            columnId: "category",
            title: "Categoria",
            icon: PackageCheck,
            options: facetOptions(facets?.category, CATEGORY_LABELS),
          },
          {
            columnId: "blocking",
            title: "Gravidade",
            icon: ShieldAlert,
            options: facetOptions(facets?.severity, SEVERITY_LABELS),
          },
          {
            columnId: "typeName",
            title: "Tipo",
            icon: TriangleAlert,
            options: facetOptions(facets?.occurrenceTypeId),
          },
          {
            columnId: "deliveryStatus",
            title: "Status da entrega",
            icon: CircleDot,
            // A closed set, labelled here; the API sends no counts for it.
            options: facetOptions(undefined, DELIVERY_STATUS_LABELS),
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

export { OccurrencesToolbar };
