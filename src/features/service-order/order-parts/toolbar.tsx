"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Table } from "@tanstack/react-table";
import { Package, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SearchInputWithLoading } from "@/components/ui/search-input-with-loading";
import { useSearch } from "@/lib/search-params";

import { DataTableServerFilters } from "@/app/(protected)/_components/shared/tanstack-table/data-table-server-filters";
import { DataTableViewOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table-view-options";
import { facetOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import type { OrderPartSearchMeta } from "./lib/order-part-rules";

interface OrderPartToolbarProps<TData> {
  facets?: OrderPartSearchMeta["facets"];
  table?: Table<TData>;
  error?: boolean;
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
}

/**
 * Search, the part filter and — when the list came from an order's "Ver
 * Peças da Ordem" — a way back to every line. All answered by the server.
 */
function OrderPartToolbar<TData>({
  facets,
  table,
  error,
  isLoading,
  setIsLoading,
}: OrderPartToolbarProps<TData>) {
  const { handleSearch, searchParams, isPending } = useSearch();
  const pathname = usePathname();

  const oneOrder = searchParams.get("serviceOrderId");

  const withoutOrder = () => {
    const params = new URLSearchParams(searchParams.toString());

    params.delete("serviceOrderId");
    params.delete("page");

    const query = params.toString();

    return query ? pathname + "?" + query : pathname;
  };

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <SearchInputWithLoading
        placeholder="Procurar..."
        aria-label="Buscar por ID do lançamento, ID da ordem, peça ou placa"
        title="ID do lançamento, ID da ordem, peça ou placa"
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
        dataTutorial="order-part-filters"
        table={table}
        filters={[
          {
            columnId: "partDescription",
            title: "Peça",
            icon: Package,
            options: facetOptions(facets?.partId),
          },
        ]}
      />

      {oneOrder && (
        <Button
          asChild
          variant="ghost"
          className="flex h-8 items-center gap-1 px-2 lg:px-3"
        >
          <Link href={withoutOrder()}>
            Só uma ordem de serviço — ver todas
            <X className="h-4 w-4" />
          </Link>
        </Button>
      )}

      {!error && table && (
        <div className="w-full sm:ml-auto sm:w-auto">
          <DataTableViewOptions table={table} />
        </div>
      )}
    </div>
  );
}

export { OrderPartToolbar };
