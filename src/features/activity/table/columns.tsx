"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";
import { IdCell } from "@/app/(protected)/_components/shared/tanstack-table/id-cell";

import { displayValue, formatNotificationDate } from "@/lib/format-values";

import {
  ACTIVITY_ACTION_LABELS,
  ACTIVITY_ROLE_LABELS,
  activityActionClass,
  activityRoleClass,
  activityStatusClass,
  activityStatusLabel,
} from "../lib/activity-catalog";

type ActivityScope = "admin" | "dashboard";

/** An activity row as the API streams it (the author already presented). */
interface ActivityTableRow {
  id: string;
  type: string;
  action: string;
  entityId: string;
  description: string;
  status: string;
  performedBy: string | null;
  businessId: string | null;
  tenantName?: string | null;
  user?: { email: string | null; role: string; name: string } | null;
  business?: { corporate_reason: string } | null;
  created_at: string | Date;
  updated_at: string | Date;
}

const withTooltip = (value: string | null | undefined, className: string) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <p className={`cursor-help truncate ${className}`}>
          {displayValue(value)}
        </p>
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-lg break-words text-xs">{displayValue(value)}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

/**
 * The activity columns, one set for /admin and /dashboard (decision 8.7).
 * Badges read the one catalog (FLEET-ACT-2): a legacy "PLANNED" shows as
 * "Planejada", and a driver acting from the app as "Motorista". The company
 * column is the MASTER's only: a company reads its own trail.
 */
function buildActivityColumns(
  scope: ActivityScope,
): ColumnDef<ActivityTableRow>[] {
  const columns: ColumnDef<ActivityTableRow>[] = [
    {
      // An activity has no number of its own: the compact record id.
      id: "id",
      accessorKey: "id",
      meta: { title: "ID" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="ID" />
      ),
      cell: ({ row }) => <IdCell id={row.original.id} />,
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "type",
      accessorKey: "type",
      meta: { title: "Tipo" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tipo" />
      ),
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className="border-blue-200 bg-blue-100 text-blue-800 hover:bg-blue-200"
        >
          {displayValue(row.original.type)}
        </Badge>
      ),
      enableHiding: false,
    },
    {
      id: "action",
      accessorKey: "action",
      meta: { title: "Ação" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Ação" />
      ),
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={activityActionClass(row.original.action)}
        >
          {ACTIVITY_ACTION_LABELS[row.original.action] ?? row.original.action}
        </Badge>
      ),
      enableHiding: false,
    },
    {
      id: "description",
      accessorKey: "description",
      meta: { title: "Descrição" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Descrição" />
      ),
      cell: ({ row }) => withTooltip(row.original.description, "max-w-[300px]"),
    },
    {
      id: "userName",
      accessorFn: (row) => row.user?.name ?? "",
      meta: { title: "Usuário" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Usuário" />
      ),
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">
            {displayValue(row.original.user?.name)}
          </p>
          <p className="max-w-[200px] truncate text-xs text-muted-foreground">
            {displayValue(row.original.user?.email)}
          </p>
        </div>
      ),
    },
    {
      id: "userRole",
      accessorFn: (row) => row.user?.role ?? "",
      meta: { title: "Papel" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Papel" />
      ),
      cell: ({ row }) => {
        const role = row.original.user?.role;

        return (
          <Badge variant="outline" className={activityRoleClass(role)}>
            {displayValue(ACTIVITY_ROLE_LABELS[role ?? ""] ?? role)}
          </Badge>
        );
      },
    },
  ];

  if (scope === "admin") {
    columns.push({
      id: "business_name",
      accessorFn: (row) =>
        row.business?.corporate_reason ?? row.tenantName ?? "",
      meta: { title: "Empresa" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Empresa" />
      ),
      cell: ({ row }) =>
        withTooltip(
          row.original.business?.corporate_reason ?? row.original.tenantName,
          "max-w-[200px]",
        ),
    });
  }

  columns.push(
    {
      id: "status",
      accessorKey: "status",
      meta: { title: "Status" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={activityStatusClass(row.original.status)}
        >
          {displayValue(activityStatusLabel(row.original.status))}
        </Badge>
      ),
    },
    {
      id: "created_at",
      accessorKey: "created_at",
      meta: { title: "Data" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Data" />
      ),
      cell: ({ row }) => (
        <p className="w-36 text-sm text-muted-foreground">
          {displayValue(
            formatNotificationDate(row.original.created_at, "pt-BR"),
          )}
        </p>
      ),
    },
  );

  return columns;
}

export { buildActivityColumns, type ActivityScope, type ActivityTableRow };
