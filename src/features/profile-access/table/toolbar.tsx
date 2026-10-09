"use client";

import { Table } from "@tanstack/react-table";

import { SearchInputWithLoading } from "@/components/ui/search-input-with-loading";

import { useSearch } from "@/lib/search-params";

import { DataTableViewOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table-view-options";

interface ProfileAccessToolbarProps<TData> {
  /** Injected by DataTable via cloneElement — never passed by the caller. */
  table?: Table<TData>;
  error?: boolean;
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
}

/**
 * Search of the access-profile list, answered by the server over the whole
 * company (decision 8.8). The old "Nome do perfil" and "Empresa" filters
 * were built from the ten rows on screen; the name is what the search box
 * matches, and the company is the page's.
 */
function ProfileAccessToolbar<TData>({
  table,
  error,
  isLoading,
  setIsLoading,
}: ProfileAccessToolbarProps<TData>) {
  const { handleSearch, searchParams, isPending } = useSearch();

  const handleSearchWithLoading = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setIsLoading?.(true);
    handleSearch(event);
  };

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      {/* The placeholder is also the guided tour's anchor. */}
      <SearchInputWithLoading
        placeholder="Procurar..."
        aria-label="Buscar perfis de acesso pelo nome ou identificador"
        defaultValue={searchParams.get("search") || ""}
        onChange={handleSearchWithLoading}
        disabled={error}
        isLoading={isPending || isLoading}
        wrapperClassName="w-full sm:w-auto sm:min-w-[270px] sm:max-w-[270px]"
      />

      {!error && table && (
        <div className="w-full sm:ml-auto sm:w-auto">
          <DataTableViewOptions table={table} />
        </div>
      )}
    </div>
  );
}

export { ProfileAccessToolbar };
