"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";
import { profileAccessTableSchema } from "@/schemas/profile-access-schema";

import { DashboardDataTableProfileAccessRowActions } from "../dashboard-data-table-row-actions";
import { displayValue, formatNotificationDate } from "@/lib/format-values";

const dashboardTableProfileAccessCollumns: ColumnDef<profileAccessTableSchema>[] =
  [
    {
      id: "select",
      meta: {
        title: "Seleção",
      },
      header: ({ table }) => (
        <Checkbox
          id="select-all-dashboard-profile-access"
          name="select-all-dashboard-profile-access"
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
          id={`select-dashboard-profile-access-${row.id}`}
          name={`select-dashboard-profile-access-${row.id}`}
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
        title: "Perfil de acesso",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Perfil de acesso" />
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
      cell: ({ row }) => (
        <DashboardDataTableProfileAccessRowActions row={row} />
      ),
    },
  ];

export { dashboardTableProfileAccessCollumns };
