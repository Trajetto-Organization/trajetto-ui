"use client";

import { Table } from "@tanstack/react-table";
import { KeyRound, ShieldCheck, UserCog, UsersRound } from "lucide-react";

import { SearchInputWithLoading } from "@/components/ui/search-input-with-loading";

import { useSearch } from "@/lib/search-params";

import { DataTableServerFilters } from "@/app/(protected)/_components/shared/tanstack-table/data-table-server-filters";
import { DataTableViewOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table-view-options";
import { facetOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import {
  ACCESS_LABELS,
  ROLE_LABELS,
  TWO_FACTOR_LABELS,
  type UserListSearchMeta,
} from "../lib/user-rules";

interface UserToolbarProps<TData> {
  /** The API's option lists and counts (`searchMeta.facets`). */
  facets?: UserListSearchMeta["facets"];
  /** The MASTER list has neither roles nor profiles to filter by. */
  variant?: "users" | "masters";
  /** Injected by DataTable via cloneElement — never passed by the caller. */
  table?: Table<TData>;
  error?: boolean;
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
}

/**
 * Search and filters of the user lists, answered by the server over the
 * whole company (decision 8.8). The old filters were names, e-mails and
 * companies built from the ten rows on screen.
 */
function UserToolbar<TData>({
  facets,
  variant = "users",
  table,
  error,
  isLoading,
  setIsLoading,
}: UserToolbarProps<TData>) {
  const { handleSearch, searchParams, isPending } = useSearch();

  const handleSearchWithLoading = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setIsLoading?.(true);
    handleSearch(event);
  };

  const common = [
    {
      columnId: "access_revoked",
      title: "Acesso",
      icon: KeyRound,
      options: facetOptions(facets?.access, ACCESS_LABELS),
    },
    {
      columnId: "two_factor_enabled",
      title: "Verificação (2FA)",
      icon: ShieldCheck,
      options: facetOptions(facets?.two_factor, TWO_FACTOR_LABELS),
    },
  ];

  const filters =
    variant === "masters"
      ? common
      : [
          {
            columnId: "role",
            title: "Nível de acesso",
            icon: UserCog,
            options: facetOptions(facets?.role, ROLE_LABELS),
          },
          {
            columnId: "profileAccess",
            title: "Perfil de acesso",
            icon: UsersRound,
            // Names come from the server, this company's profiles only.
            options: facetOptions(facets?.profileAccessId),
          },
          ...common,
        ];

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      {/* The placeholder is also the guided tour's anchor. */}
      <SearchInputWithLoading
        placeholder="Procurar..."
        aria-label={
          variant === "masters"
            ? "Buscar masters por nome, e-mail ou ID"
            : "Buscar usuários por nome, e-mail, perfil, motorista, nível de acesso ou ID"
        }
        defaultValue={searchParams.get("search") || ""}
        onChange={handleSearchWithLoading}
        disabled={error}
        isLoading={isPending || isLoading}
        wrapperClassName="w-full sm:w-auto sm:min-w-[270px] sm:max-w-[270px]"
      />

      <DataTableServerFilters
        table={table}
        dataTutorial={
          variant === "masters" ? "master-user-filters" : "user-filters"
        }
        filters={filters}
      />

      {!error && table && (
        <div className="w-full sm:ml-auto sm:w-auto">
          <DataTableViewOptions table={table} />
        </div>
      )}
    </div>
  );
}

export { UserToolbar };
