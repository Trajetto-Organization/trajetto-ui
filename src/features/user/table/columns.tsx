"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";

import {
  displayValue,
  formatNotificationDate,
  formatPhoneNumber,
} from "@/lib/format-values";

import type { AdminScope } from "../lib/scope";
import { ROLE_LABELS, type ListedRole } from "../lib/user-rules";
import type { UserRow } from "../types";

import { MasterUserRowActions } from "./master-row-actions";
import { UserRowActions } from "./row-actions";

const GREEN = "bg-green-100 text-green-800 border-green-200 hover:bg-green-200";
const RED = "bg-red-100 text-red-800 border-red-200 hover:bg-red-200";
const YELLOW =
  "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200";

/** The header every admin-users table uses (the column menu sorts via the URL). */
function header<TRow = UserRow>(title: string): ColumnDef<TRow>["header"] {
  // Named so React DevTools and react/display-name can tell the headers apart.
  return function ColumnHeader({ column }) {
    return <DataTableColumnHeader column={column} title={title} />;
  };
}

/** A plain text column; its id is the API's sort key where it has one. */
function textColumn(
  id: string,
  title: string,
  width: string,
  read: (row: UserRow) => string | null | undefined,
): ColumnDef<UserRow> {
  return {
    id,
    accessorFn: (row) => read(row) ?? "",
    meta: { title },
    header: header(title),
    cell: ({ row }) => (
      <p className={`truncate font-medium ${width}`}>
        {displayValue(read(row.original))}
      </p>
    ),
  };
}

/** The selection column, the same in every admin-users table. */
function selectColumn<TRow = UserRow>(name: string): ColumnDef<TRow> {
  return {
    id: "select",
    meta: { title: "Seleção" },
    header: ({ table }) => (
      <Checkbox
        id={`select-all-${name}`}
        name={`select-all-${name}`}
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Selecionar todos"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        id={`select-${name}-${row.id}`}
        name={`select-${name}-${row.id}`}
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Selecionar linha"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  };
}

/** The columns every user table has: identity, verification, access, dates. */
function accountColumns(): ColumnDef<UserRow>[] {
  return [
    {
      accessorKey: "id",
      meta: { title: "Identificador" },
      header: header("Identificador"),
      cell: ({ row }) => (
        <p className="w-72 truncate font-medium">
          {displayValue(row.original.id)}
        </p>
      ),
      enableHiding: false,
    },
    textColumn("name", "Nome do usuário", "w-36", (row) => row.name),
    textColumn("email", "E-mail", "w-48", (row) => row.email),
    {
      accessorKey: "two_factor_enabled",
      meta: { title: "Verificação (2FA)" },
      header: header("Verificação (2FA)"),
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={row.original.two_factor_enabled ? GREEN : RED}
        >
          {row.original.two_factor_enabled ? "Habilitada" : "Desabilitada"}
        </Badge>
      ),
    },
    {
      accessorKey: "email_verified",
      meta: { title: "Verificação de e-mail" },
      header: header("Verificação de e-mail"),
      cell: ({ row }) => {
        const verified = row.original.email_verified;

        return (
          <Badge variant="outline" className={verified ? GREEN : YELLOW}>
            {verified
              ? formatNotificationDate(verified, "pt-BR")
              : "Não verificado"}
          </Badge>
        );
      },
    },
    textColumn("whatsapp_phone", "Telefone WhatsApp", "w-36", (row) =>
      row.whatsapp_phone ? formatPhoneNumber(row.whatsapp_phone) : null,
    ),
    {
      accessorKey: "access_revoked",
      meta: { title: "Acesso" },
      header: header("Acesso"),
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={row.original.access_revoked ? RED : GREEN}
        >
          {row.original.access_revoked ? "Acesso revogado" : "Acesso liberado"}
        </Badge>
      ),
    },
  ];
}

function dateColumns(): ColumnDef<UserRow>[] {
  return [
    textColumn("created_at", "Data de criação", "w-36", (row) =>
      formatNotificationDate(row.created_at, "pt-BR"),
    ),
    textColumn("updated_at", "Data de atualização", "w-36", (row) =>
      formatNotificationDate(row.updated_at, "pt-BR"),
    ),
  ];
}

/**
 * The company user table, one definition for /admin and /dashboard. Column
 * ids are the API's sort and facet keys (features/user/server-table), so a
 * sorted header or a chosen filter goes to the server, never over the loaded
 * page. The /admin copy carried "Empresa" columns from the days it listed
 * every company at once; the list is now one company's, named in the
 * selector.
 */
function buildUserColumns(scope: AdminScope): ColumnDef<UserRow>[] {
  return [
    selectColumn("users"),
    ...accountColumns(),
    {
      accessorKey: "role",
      meta: { title: "Nível de acesso" },
      header: header("Nível de acesso"),
      cell: ({ row }) => (
        <p className="w-36 truncate font-medium">
          {displayValue(
            ROLE_LABELS[row.original.role as ListedRole] ?? row.original.role,
          )}
        </p>
      ),
    },
    textColumn(
      "profileAccess",
      "Perfil de acesso",
      "w-48",
      (row) => row.profileAccess?.name,
    ),
    textColumn(
      "driverName",
      "Motorista vinculado",
      "w-48",
      (row) => row.driver?.name,
    ),
    ...dateColumns(),
    {
      id: "Ações",
      header: header("Ações"),
      cell: ({ row }) => <UserRowActions user={row.original} scope={scope} />,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}

/**
 * The master table (/admin/master-users): a master has no role to choose, no
 * profile and no driver, so those columns and filters do not exist there.
 * Column ids are the master list's sort and facet keys (MASTER_USER_TABLE).
 */
function buildMasterColumns(): ColumnDef<UserRow>[] {
  return [
    selectColumn("masters"),
    ...accountColumns(),
    ...dateColumns(),
    {
      id: "Ações",
      header: header("Ações"),
      cell: ({ row }) => <MasterUserRowActions master={row.original} />,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}

export {
  accountColumns,
  buildMasterColumns,
  buildUserColumns,
  dateColumns,
  header,
  selectColumn,
};
