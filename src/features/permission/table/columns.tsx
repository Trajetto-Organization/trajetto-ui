"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";

import { displayValue, formatNotificationDate } from "@/lib/format-values";

import { header } from "@/features/user/table/columns";
import type { AdminScope } from "@/features/user/lib/scope";

import { resourceLabel } from "../lib/permission-rules";
import type { PermissionRow } from "../types";

import { PermissionRowActions } from "./row-actions";

const GREEN = "bg-green-100 text-green-800 border-green-200 hover:bg-green-200";
const RED = "bg-red-100 text-red-800 border-red-200 hover:bg-red-200";

function flagColumn(
  id: "canRead" | "canWrite",
  title: string,
): ColumnDef<PermissionRow> {
  return {
    accessorKey: id,
    meta: { title },
    header: header<PermissionRow>(title),
    cell: ({ row }) => {
      const enabled = row.original[id];

      return (
        <Badge variant="outline" className={enabled ? GREEN : RED}>
          {enabled ? "Habilitada" : "Desabilitada"}
        </Badge>
      );
    },
  };
}

/**
 * The permission table, one definition for /admin and /dashboard. Column ids
 * are the API's sort and facet keys (features/permission/server-table), so a
 * sorted header or a chosen filter goes to the server, never over the loaded
 * page. The /admin copy carried "Empresa" columns from the days it listed
 * every company at once; the list is now one company's.
 */
function buildPermissionColumns(scope: AdminScope): ColumnDef<PermissionRow>[] {
  return [
    {
      // The key of the resource it grants identifies the permission in the
      // code, the API and the logs; its label reads under it.
      accessorKey: "permissionKey",
      meta: { title: "Chave" },
      header: header<PermissionRow>("Chave"),
      cell: ({ row }) => (
        <div className="w-48">
          <p className="truncate font-mono text-sm font-medium">
            {row.original.permissionKey}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {resourceLabel(row.original.permissionKey)}
          </p>
        </div>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "action",
      meta: { title: "Nome da permissão" },
      header: header<PermissionRow>("Nome da permissão"),
      cell: ({ row }) => (
        <p className="w-48 truncate font-medium">
          {displayValue(row.original.action)}
        </p>
      ),
    },
    {
      id: "profile_name",
      accessorFn: (row) => row.profileAccess?.name ?? "",
      meta: { title: "Perfil de acesso" },
      header: header<PermissionRow>("Perfil de acesso"),
      cell: ({ row }) => (
        <p className="w-48 truncate font-medium">
          {displayValue(row.original.profileAccess?.name)}
        </p>
      ),
    },
    flagColumn("canRead", "Leitura"),
    flagColumn("canWrite", "Escrita"),
    {
      accessorKey: "created_at",
      meta: { title: "Data de criação" },
      header: header<PermissionRow>("Data de criação"),
      cell: ({ row }) => (
        <p className="w-36 truncate font-medium">
          {displayValue(
            formatNotificationDate(row.original.created_at, "pt-BR"),
          )}
        </p>
      ),
    },
    {
      accessorKey: "updated_at",
      meta: { title: "Data de atualização" },
      header: header<PermissionRow>("Data de atualização"),
      cell: ({ row }) => (
        <p className="w-36 truncate font-medium">
          {displayValue(
            formatNotificationDate(row.original.updated_at, "pt-BR"),
          )}
        </p>
      ),
    },
    {
      id: "Ações",
      header: header<PermissionRow>("Ações"),
      cell: ({ row }) => (
        <PermissionRowActions permission={row.original} scope={scope} />
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}

export { buildPermissionColumns };
