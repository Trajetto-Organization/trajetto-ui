"use client";

import type { Table } from "@tanstack/react-table";
import { Activity, CircleDot, PencilLine, User } from "lucide-react";

import { SearchInputWithLoading } from "@/components/ui/search-input-with-loading";
import { useSearch } from "@/lib/search-params";
import { useAuthStore } from "@/store/auth-store";

import { DataTableServerFilters } from "@/app/(protected)/_components/shared/tanstack-table/data-table-server-filters";
import { DataTableViewOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table-view-options";
import { facetOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import {
  ACTIVITY_ACTION_LABELS,
  activityRoleOptions,
  activityStatusOptions,
  activityTypeOptions,
  type ActivityFilterOption,
} from "../lib/activity-catalog";

interface ActivityToolbarProps<TData> {
  /** Injected by DataTable via cloneElement — never passed by the caller. */
  table?: Table<TData>;
  error?: boolean;
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
}

const asLabels = (options: ActivityFilterOption[]): Record<string, string> =>
  Object.fromEntries(options.map((option) => [option.value, option.label]));

/**
 * Search and the four filters of the activity table, answered by the server
 * over the whole trail (FLEET-ACT-3) — they used to narrow the ten rows of
 * the page. The options come from the one catalog, limited to the company's
 * modules (the MASTER sees all, FLEET-ACT-4); the rows are never hidden.
 * "Motorista" is a role now (FLEET-ACT-7). No counts: counting the whole
 * trail per option would cost a scan the table does not need.
 */
function ActivityToolbar<TData>({
  table,
  error,
  isLoading,
  setIsLoading,
}: ActivityToolbarProps<TData>) {
  const { handleSearch, searchParams, isPending } = useSearch();

  const role = useAuthStore((state) => state.role);
  const enabledModules = useAuthStore((state) => state.enabledModules);
  const isMaster = role === "MASTER";

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <SearchInputWithLoading
        placeholder="Procurar atividade..."
        aria-label="Buscar atividades por descrição, tipo, status, ID ou e-mail de quem agiu"
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
        table={table}
        filters={[
          {
            columnId: "type",
            title: "Tipo",
            icon: Activity,
            options: facetOptions(
              undefined,
              asLabels(activityTypeOptions(enabledModules, isMaster)),
            ),
          },
          {
            columnId: "action",
            title: "Ação",
            icon: PencilLine,
            options: facetOptions(undefined, ACTIVITY_ACTION_LABELS),
          },
          {
            columnId: "status",
            title: "Status",
            icon: CircleDot,
            options: facetOptions(
              undefined,
              asLabels(activityStatusOptions(enabledModules, isMaster)),
            ),
          },
          {
            columnId: "userRole",
            title: "Papel do Usuário",
            icon: User,
            options: facetOptions(
              undefined,
              asLabels(activityRoleOptions(isMaster)),
            ),
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

export { ActivityToolbar };
