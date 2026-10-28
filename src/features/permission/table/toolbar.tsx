"use client";

import { Table } from "@tanstack/react-table";
import { Eye, KeyRound, PencilLine, UsersRound } from "lucide-react";

import { SearchInputWithLoading } from "@/components/ui/search-input-with-loading";

import { useSearch } from "@/lib/search-params";
import { useAuthStore } from "@/store/auth-store";

import { DataTableServerFilters } from "@/app/(protected)/_components/shared/tanstack-table/data-table-server-filters";
import { DataTableViewOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table-view-options";
import { facetOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import {
  FLAG_LABELS,
  resourceFacetLabels,
  type PermissionListSearchMeta,
} from "../lib/permission-rules";

interface PermissionToolbarProps<TData> {
  /** The API's option lists and counts (`searchMeta.facets`). */
  facets?: PermissionListSearchMeta["facets"];
  /** Injected by DataTable via cloneElement — never passed by the caller. */
  table?: Table<TData>;
  error?: boolean;
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
}

/**
 * Search and filters of the permission list, answered by the server over the
 * whole company (decision 8.8). The old filters were names and companies
 * built from the ten rows on screen.
 */
function PermissionToolbar<TData>({
  facets,
  table,
  error,
  isLoading,
  setIsLoading,
}: PermissionToolbarProps<TData>) {
  const { handleSearch, searchParams, isPending } = useSearch();
  const role = useAuthStore((state) => state.role);
  const enabledModules = useAuthStore((state) => state.enabledModules);
  // Keys of the other module stay only while the company still has rows of them.
  const resourceLabels = resourceFacetLabels(
    { role, enabledModules },
    (facets?.permissionKey ?? [])
      .filter((entry) => entry.count > 0)
      .map((entry) => entry.value),
  );

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
        aria-label="Buscar permissões por nome, recurso, perfil ou ID"
        defaultValue={searchParams.get("search") || ""}
        onChange={handleSearchWithLoading}
        disabled={error}
        isLoading={isPending || isLoading}
        wrapperClassName="w-full sm:w-auto sm:min-w-[270px] sm:max-w-[270px]"
      />

      <DataTableServerFilters
        table={table}
        dataTutorial="permission-filters"
        filters={[
          {
            columnId: "permissionKey",
            title: "Recurso",
            icon: KeyRound,
            options: facetOptions(facets?.permissionKey, resourceLabels),
          },
          {
            columnId: "profile_name",
            title: "Perfil de acesso",
            icon: UsersRound,
            // Names come from the server, this company's profiles only.
            options: facetOptions(facets?.profileAccessId),
          },
          {
            columnId: "canRead",
            title: "Leitura",
            icon: Eye,
            options: facetOptions(facets?.read, FLAG_LABELS),
          },
          {
            columnId: "canWrite",
            title: "Escrita",
            icon: PencilLine,
            options: facetOptions(facets?.write, FLAG_LABELS),
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

export { PermissionToolbar };
