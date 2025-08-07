"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

import { profileAccessTableSchema } from "@/schemas/profile-access-schema";
import { DataTableColumnHeader } from "../../../tanstack-table/data-table-collumn-header";

import { DashboardDataTableProfileAccessRowActions } from "../dashboard-data-table-row-actions";

const dashboardTableProfileAccessCollumns: ColumnDef<profileAccessTableSchema>[] =
  [
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
        <p className="truncate font-medium w-72">
          {row.getValue("id") ?? "N/A"}
        </p>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      meta: {
        title: "Perfil de acesso",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Perfil de acesso" />
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
      cell: ({ row }) => (
        <DashboardDataTableProfileAccessRowActions row={row} />
      ),
    },
  ];

export { dashboardTableProfileAccessCollumns };
