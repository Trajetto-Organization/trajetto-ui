"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

import { Badge } from "@/components/ui/badge";

import { masterUserTableSchema } from "@/schemas/master-user-table-schema";
import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";

import { DataTableMasterUserRowActions } from "../data-table-row-actions";

import {
  formatPhoneNumber,
  displayValue,
  formatNotificationDate,
} from "@/lib/format-values";

const twoFactorLabels = {
  true: "Habilitado",
  false: "Desabilitado",
} as const;

const twoFactorColors = {
  true: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
  false: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200",
} as const;

const accessRevokedLabels = {
  true: "Acesso revogado",
  false: "Acesso não revogado",
} as const;

const accessRevokedColors = {
  true: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200",
  false: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
} as const;

const tableMasterUserCollumns: ColumnDef<masterUserTableSchema>[] = [
  {
    id: "select",
    meta: {
      title: "Seleção",
    },
    header: ({ table }) => (
      <Checkbox
        id="select-all-master-users"
        name="select-all-master-users"
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        id={`select-master-user-${row.id}`}
        name={`select-master-user-${row.id}`}
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "id",
    meta: {
      title: "Identificador",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Identificador" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-72">
        {displayValue(row.getValue("id"))}
      </p>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    meta: {
      title: "Nome",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-36">
        {displayValue(row.getValue("name"))}
      </p>
    ),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "email",
    meta: {
      title: "E-mail",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="E-mail" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-36">
        {displayValue(row.getValue("email"))}
      </p>
    ),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "two_factor_enabled",
    meta: {
      title: "Verificação (2FA)",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Verificação (2FA)" />
    ),
    cell: ({ row }) => {
      const twoFactor = row.getValue("two_factor_enabled") as boolean;
      return (
        <Badge
          variant="outline"
          className={
            twoFactorColors[String(twoFactor) as keyof typeof twoFactorColors]
          }
        >
          {twoFactorLabels[String(twoFactor) as keyof typeof twoFactorLabels]}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "email_verified",
    meta: {
      title: "Verificação de e-mail",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Verificação de e-mail" />
    ),
    cell: ({ row }) => {
      const emailVerified = row.getValue("email_verified") as string | null;
      const isVerified = emailVerified !== null && emailVerified !== undefined;

      return (
        <Badge
          variant="outline"
          className={
            isVerified
              ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-200"
              : "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200"
          }
        >
          {isVerified
            ? formatNotificationDate(emailVerified, "pt-BR")
            : "Não verificado"}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "whatsapp_phone",
    meta: {
      title: "Telefone WhatsApp",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Telefone WhatsApp" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-36">
        {displayValue(formatPhoneNumber(row.getValue("whatsapp_phone")))}
      </p>
    ),
  },
  {
    accessorKey: "access_revoked",
    meta: {
      title: "Revogação de acesso",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Revogação de acesso" />
    ),
    cell: ({ row }) => {
      const accessRevoked = row.getValue("access_revoked") as boolean;
      return (
        <Badge
          variant="outline"
          className={
            accessRevokedColors[
              String(accessRevoked) as keyof typeof accessRevokedColors
            ]
          }
        >
          {
            accessRevokedLabels[
              String(accessRevoked) as keyof typeof accessRevokedLabels
            ]
          }
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "created_at",
    meta: {
      title: "Criação",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data de criação" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-36">
        {displayValue(
          formatNotificationDate(row.getValue("created_at"), "pt-BR"),
        )}
      </p>
    ),
  },
  {
    accessorKey: "updated_at",
    meta: {
      title: "Atualização",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data de atualização" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-36">
        {displayValue(
          formatNotificationDate(row.getValue("updated_at"), "pt-BR"),
        )}
      </p>
    ),
  },
  {
    id: "Ações",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ações" />
    ),
    cell: ({ row }) => <DataTableMasterUserRowActions row={row} />,
  },
];

export { tableMasterUserCollumns };
