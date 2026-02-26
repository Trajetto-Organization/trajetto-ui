"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

import { Badge } from "@/components/ui/badge";

import { permissionsTableSchema } from "@/schemas/permissions-table-schema";
import { DataTableColumnHeader } from "../../../tanstack-table/data-table-collumn-header";

import { DataTablePermissionRowActions } from "../data-table-row-actions";
import { permissionLabels as permissionTypeLabels } from "@/lib/permissions";

import { formatNotificationDate, displayValue } from "@/lib/format-values";

// Labels and colors for permission badges
const permissionStatusLabels = {
  true: "Habilitado",
  false: "Desabilitado",
} as const;

const permissionColors = {
  true: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
  false: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200",
} as const;

const tablePermissionsCollumns: ColumnDef<permissionsTableSchema>[] = [
  {
    id: "select",
    meta: {
      title: "Seleção",
    },
    header: ({ table }) => (
      <Checkbox
        id="select-all-permissions"
        name="select-all-permissions"
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
        id={`select-permission-${row.id}`}
        name={`select-permission-${row.id}`}
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
    accessorKey: "action",
    meta: {
      title: "Nome da permissão",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome da permissão" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-36">
        {displayValue(row.getValue("action"))}
      </p>
    ),
    enableSorting: false,
    enableHiding: false,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "permissionKey",
    meta: {
      title: "Permissão",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Permissão" />
    ),
    cell: ({ row }) => {
      const permissionKey = row.getValue(
        "permissionKey",
      ) as keyof typeof permissionTypeLabels;

      return (
        <p className="truncate font-medium w-36">
          {displayValue(permissionTypeLabels[permissionKey])}
        </p>
      );
    },
    enableSorting: false,
    enableHiding: false,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "canRead",
    meta: {
      title: "Leitura",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Leitura" />
    ),
    cell: ({ row }) => {
      const canRead = row.getValue("canRead") as boolean;
      return (
        <Badge
          variant="outline"
          className={
            permissionColors[String(canRead) as keyof typeof permissionColors]
          }
        >
          {
            permissionStatusLabels[
              String(canRead) as keyof typeof permissionStatusLabels
            ]
          }
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "canWrite",
    meta: {
      title: "Escrita",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Escrita" />
    ),
    cell: ({ row }) => {
      const canWrite = row.getValue("canWrite") as boolean;
      return (
        <Badge
          variant="outline"
          className={
            permissionColors[String(canWrite) as keyof typeof permissionColors]
          }
        >
          {
            permissionStatusLabels[
              String(canWrite) as keyof typeof permissionStatusLabels
            ]
          }
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "business_name",
    accessorFn: (row) => row.business?.corporate_reason || "",
    meta: {
      title: "Empresa",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Empresa" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-64">
        {displayValue(row.original.business?.corporate_reason)}
      </p>
    ),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "profile_name",
    accessorFn: (row) => row.profileAccess.name || "",
    meta: {
      title: "Perfil de acesso",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Perfil de acesso" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-64">
        {displayValue(row.original.profileAccess.name)}
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
        {displayValue(row.getValue("businessId"))}
      </p>
    ),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "profileAccessId",
    meta: {
      title: "Identificador do perfil",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Identificador do perfil" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-72">
        {displayValue(row.getValue("profileAccessId"))}
      </p>
    ),
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
    cell: ({ row }) => <DataTablePermissionRowActions row={row} />,
  },
];

export { tablePermissionsCollumns };
