"use client";

import { Table } from "@tanstack/react-table";
import { CircleDot, Truck, UserRound, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SearchInputWithLoading } from "@/components/ui/search-input-with-loading";

import { DataTableFacetedFilter } from "@/app/(protected)/_components/shared/tanstack-table/data-table-faceted-filter";
import { DataTableViewOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table-view-options";

import { useSearch } from "@/lib/search-params";

import type { RouteListItem } from "@/actions/route/get-route";

interface RoutesTableToolbarProps {
  /**
   * Injected by DataTable via cloneElement — never passed by the caller.
   */
  table?: Table<RouteListItem>;
  error?: boolean;
  isLoading?: boolean;
  setIsLoading?: (value: boolean) => void;
}

/**
 * Two filtering systems side by side, as everywhere else in this app: the
 * search box writes `?search=` and the SERVER answers it, while the faceted
 * chips filter the page already on screen. Mixing them up is the usual way a
 * filter starts lying — the chips can only narrow what was fetched.
 */
const FILTERS = [
  { key: "status", title: "Status", dynamicOptionIcon: CircleDot },
  { key: "driverName", title: "Motorista", dynamicOptionIcon: UserRound },
  { key: "vehiclePlate", title: "Veículo", dynamicOptionIcon: Truck },
];

const RoutesTableToolbar = ({
  table,
  error,
  isLoading,
  setIsLoading,
}: RoutesTableToolbarProps): JSX.Element => {
  const { handleSearch, searchParams, isPending } = useSearch();

  const isFiltered = (table?.getState().columnFilters.length ?? 0) > 0;

  const handleSearchWithLoading = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setIsLoading?.(true);
    handleSearch(event);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 w-full">
      <SearchInputWithLoading
        data-tutorial="routes-search"
        placeholder="Nome da rota, motorista ou número..."
        defaultValue={searchParams.get("search") || ""}
        onChange={handleSearchWithLoading}
        disabled={error}
        isLoading={isPending || isLoading}
        wrapperClassName="w-full sm:w-auto sm:min-w-[270px] sm:max-w-[270px]"
      />

      <div className="flex flex-wrap items-center gap-2" data-tutorial="routes-filters">
        {FILTERS.map(({ key, title, dynamicOptionIcon }) => {
          const column = table?.getColumn(key);

          if (!column) return null;

          return (
            <DataTableFacetedFilter
              key={key}
              column={column}
              title={title}
              dynamicOptionIcon={dynamicOptionIcon}
            />
          );
        })}
      </div>

      {isFiltered && (
        <Button
          variant="ghost"
          onClick={() => table?.resetColumnFilters()}
          className="h-8 px-2 lg:px-3 flex items-center gap-1"
        >
          Resetar
          <X className="h-4 w-4" />
        </Button>
      )}

      {!error && table && (
        <div className="w-full sm:w-auto sm:ml-auto">
          <DataTableViewOptions table={table} />
        </div>
      )}
    </div>
  );
};

export { RoutesTableToolbar };
