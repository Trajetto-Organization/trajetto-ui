"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

import { permissionsTableSchema } from "@/schemas/permissions-table-schema";
import { DataTableColumnHeader } from "../../../tanstack-table/data-table-collumn-header";

import { DataTablePermissionRowActions } from "../data-table-row-actions";
import { permissionLabels } from "@/lib/permissions";

const tablePermissionsCollumns: ColumnDef<permissionsTableSchema>[] = [
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
    accessorKey: "action",
    meta: {
      title: "Nome da permissão",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome da permissão" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-36">
        {row.getValue("action") ?? "N/A"}
      </p>
    ),
    enableSorting: false,
    enableHiding: false,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "permission",
    meta: {
      title: "Permissão",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Permissão" />
    ),
    cell: ({ row }) => {
      const permissionKey = row.getValue(
        "permission",
      ) as keyof typeof permissionLabels;

      return (
        <p className="truncate font-medium w-36">
          {permissionLabels[permissionKey] ?? "N/A"}
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
    cell: ({ row }) => (
      <p className="truncate font-medium w-20">
        {row.getValue("canRead") === true ? "Habilitado" : "Desabilitado"}
      </p>
    ),
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
    cell: ({ row }) => (
      <p className="truncate font-medium w-20">
        {row.getValue("canWrite") === true ? "Habilitado" : "Desabilitado"}
      </p>
    ),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
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
    accessorKey: "profile_name",
    meta: {
      title: "Perfil de acesso",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Perfil de acesso" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-64">
        {row.getValue("profile_name") ?? "N/A"}
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
        {row.getValue("profileAccessId") ?? "N/A"}
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
    cell: ({ row }) => <DataTablePermissionRowActions row={row} />,
  },
];

export { tablePermissionsCollumns };
