"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

import { userTableSchema } from "@/schemas/user-table-schema";
import { DataTableColumnHeader } from "../../../tanstack-table/data-table-collumn-header";

import { DataTableUserRowActions } from "../data-table-row-actions";
import { UserBusinessRole } from "../../../dto";
import { formatPhoneNumber } from "@/lib/format-values";

const tableUserCollumns: ColumnDef<userTableSchema>[] = [
  {
    id: "select",
    meta: {
      title: "Seleção",
    },
    header: ({ table }) => (
      <Checkbox
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
      <p className="truncate font-medium w-72">{row.getValue("id") ?? "N/A"}</p>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    meta: {
      title: "Nome do usuário",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome do usuário" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-36">
        {row.getValue("name") ?? "N/A"}
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
        {row.getValue("email") ?? "N/A"}
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
    cell: ({ row }) => (
      <p className="truncate font-medium w-36">
        {row.getValue("two_factor_enabled") === true
          ? "Habilitado"
          : "Desabilitado"}
      </p>
    ),
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
    cell: ({ row }) => (
      <p className="truncate font-medium w-36">
        {row.getValue("email_verified") === true
          ? "Verificado"
          : "Não verificado"}
      </p>
    ),
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
        {formatPhoneNumber(row.getValue("whatsapp_phone"))}
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
    cell: ({ row }) => (
      <p className="truncate font-medium w-36">
        {row.getValue("access_revoked") === true
          ? "Acesso revogado"
          : "Acesso não revogado"}
      </p>
    ),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "role",
    meta: {
      title: "Nível de acesso",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nível de acesso" />
    ),
    cell: ({ row }) => {
      const role: UserBusinessRole = row.getValue("role");

      const roleMapping = {
        BUSINESS_ADMIN: "Administrador",
        BUSINESS_USER: "Usuário",
      };

      return (
        <p className="truncate font-medium w-36">
          {role ? roleMapping[role] || role : "N/A"}
        </p>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "corporate_reason",
    meta: {
      title: "Empresa",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Empresa" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-64">
        {row.getValue("corporate_reason") ?? "N/A"}
      </p>
    ),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "profileAccess",
    meta: {
      title: "Perfil de acesso",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Perfil de acesso" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-72">
        {row.getValue("profileAccess") ?? "N/A"}
      </p>
    ),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "businessId",
    meta: {
      title: "Identificador da empresa",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Identificador da empresa" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-72">
        {row.getValue("businessId") ?? "N/A"}
      </p>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "profileAccessId",
    meta: {
      title: "Identificador da perfil",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Identificador do perfil" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-72">
        {row.getValue("profileAccessId") ?? "N/A"}
      </p>
    ),
    enableSorting: false,
    enableHiding: false,
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
      <p className="truncate font-medium w-24">
        {row.getValue("created_at") ?? "N/A"}
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
      <p className="truncate font-medium w-24">
        {row.getValue("updated_at") ?? "N/A"}
      </p>
    ),
  },
  {
    id: "Ações",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ações" />
    ),
    cell: ({ row }) => <DataTableUserRowActions row={row} />,
  },
];

export { tableUserCollumns };
