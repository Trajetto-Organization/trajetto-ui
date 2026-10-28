"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";

import { displayValue, formatNotificationDate } from "@/lib/format-values";

import { header } from "@/features/user/table/columns";
import type { AdminScope } from "@/features/user/lib/scope";

import { countLabel } from "../lib/profile-access-rules";
import type { ProfileAccessRow } from "../types";

import { ProfileAccessRowActions } from "./row-actions";

/**
 * The access-profile table, one definition for /admin and /dashboard. Column
 * ids are the API's sort keys (features/profile-access/server-table), so a
 * sorted header goes to the server. The /admin copy carried "Empresa"
 * columns from the days it listed every company at once; the list is now one
 * company's, named in the selector. New: how many people use each profile
 * and how many permissions it grants, counted by the database.
 */
function buildProfileAccessColumns(
  scope: AdminScope,
): ColumnDef<ProfileAccessRow>[] {
  return [
    {
      // The name is the profile's identifier, unique per company.
      accessorKey: "name",
      meta: { title: "Nome" },
      header: header<ProfileAccessRow>("Nome"),
      cell: ({ row }) => (
        <p className="w-48 truncate font-medium">
          {displayValue(row.original.name)}
        </p>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "usersCount",
      meta: { title: "Usuários" },
      header: header<ProfileAccessRow>("Usuários"),
      cell: ({ row }) => (
        <Badge variant="outline" className="whitespace-nowrap">
          {countLabel(row.original.usersCount, "usuário", "usuários")}
        </Badge>
      ),
    },
    {
      accessorKey: "permissionsCount",
      meta: { title: "Permissões" },
      header: header<ProfileAccessRow>("Permissões"),
      cell: ({ row }) => (
        <Badge variant="outline" className="whitespace-nowrap">
          {countLabel(row.original.permissionsCount, "permissão", "permissões")}
        </Badge>
      ),
    },
    {
      accessorKey: "created_at",
      meta: { title: "Data de criação" },
      header: header<ProfileAccessRow>("Data de criação"),
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
      header: header<ProfileAccessRow>("Data de atualização"),
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
      header: header<ProfileAccessRow>("Ações"),
      cell: ({ row }) => (
        <ProfileAccessRowActions profile={row.original} scope={scope} />
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}

export { buildProfileAccessColumns };
