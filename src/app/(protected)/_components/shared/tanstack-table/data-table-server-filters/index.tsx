"use client";

import type { ComponentType } from "react";

import { Table } from "@tanstack/react-table";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSharedListQuery } from "@/lib/search-params";

import { DataTableFacetedFilter } from "@/app/(protected)/_components/shared/tanstack-table/data-table-faceted-filter";
import type { FacetOption } from "../data-table/server-table";

interface ServerFilter {
  /** The column the facet belongs to (a key of the spec's `facets`). */
  columnId: string;
  title: string;
  icon?: ComponentType<{ className?: string }>;
  /** From `facetOptions(searchMeta.facets[param], labels?)`. */
  options: FacetOption[];
}

interface DataTableServerFiltersProps<TData> {
  table?: Table<TData>;
  filters: ServerFilter[];
  /** Anchor for the page's guided tour. */
  dataTutorial?: string;
}

/**
 * The facet buttons of a server-side table, plus "Resetar" while any is set.
 *
 * Each choice goes through the table's column filter, which the DataTable's
 * `server` mode writes to the URL; the page then asks the API again. Options
 * and counts are the server's, so a filter never offers only what the loaded
 * page happens to hold.
 */
function DataTableServerFilters<TData>({
  table,
  filters,
  dataTutorial,
}: DataTableServerFiltersProps<TData>) {
  const listQuery = useSharedListQuery();

  const isFiltered = (table?.getState().columnFilters.length ?? 0) > 0;

  return (
    <>
      <div
        className="flex flex-wrap items-center gap-2"
        data-tutorial={dataTutorial}
      >
        {filters.map(({ columnId, title, icon, options }) => {
          const column = table?.getColumn(columnId);
          if (!column) return null;

          return (
            <DataTableFacetedFilter
              key={columnId}
              column={column}
              title={title}
              options={options.map((option) => ({
                ...option,
                icon: option.icon ?? icon,
              }))}
            />
          );
        })}
      </div>

      {isFiltered && (
        <Button
          variant="ghost"
          // One request for the whole reset, sent now: no pause to wait for
          // more ticks after "clear everything".
          onClick={() => {
            table?.resetColumnFilters();
            listQuery?.flush();
          }}
          className="h-8 px-2 lg:px-3 flex items-center gap-1"
        >
          Resetar
          <X className="h-4 w-4" />
        </Button>
      )}
    </>
  );
}

export { DataTableServerFilters, type ServerFilter };
