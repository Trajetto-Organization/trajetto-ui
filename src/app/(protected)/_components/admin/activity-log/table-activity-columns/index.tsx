"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { activityTableSchema } from "@/schemas/activity-table-schema";
import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";

import { displayValue, formatNotificationDate } from "@/lib/format-values";

// Action labels
const actionLabels: Record<string, string> = {
  create: "Criar",
  update: "Atualizar",
  delete: "Deletar",
};

// Action colors
const actionColors: Record<string, string> = {
  create: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
  update: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200",
  delete: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200",
};

// Status colors
// Soft palette, same shape as the type/action badges above: the solid fills
// used before were the only badges in the table shouting for attention.
const statusColors: Record<string, string> = {
  Ativo: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
  Inativo: "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200",
  Bloqueado: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200",
  "Em Rota": "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200",
  Completo:
    "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200",
  Pendente:
    "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200",
  Atualizado:
    "bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200",
  Deletado: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200",
  Criado: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
  Entregue:
    "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200",
  Insucesso: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200",
  Cancelada: "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200",
};

// Role colors
const roleColors: Record<string, string> = {
  MASTER: "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200",
  BUSINESS_ADMIN: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200",
  BUSINESS_USER: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200",
};

// Role labels
const roleLabels: Record<string, string> = {
  MASTER: "Master",
  BUSINESS_ADMIN: "Admin",
  BUSINESS_USER: "Colaborador",
};

const tableActivityColumns: ColumnDef<activityTableSchema>[] = [
  {
    accessorKey: "id",
    meta: {
      title: "ID",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ID" />
    ),
    cell: ({ row }) => (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <p
              className="truncate w-56
              font-medium cursor-help"
            >
              {displayValue(row.getValue("id"))}
            </p>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs truncate">
              {displayValue(row.getValue("id"))}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ),
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: "type",
    meta: {
      title: "Tipo",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tipo" />
    ),
    cell: ({ row }) => {
      const type = row.getValue("type") as string;

      return (
        <Badge
          variant="outline"
          className="bg-blue-100 text-blue-800
          border-blue-200 hover:bg-blue-200"
        >
          {displayValue(type)}
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
    accessorKey: "action",
    meta: {
      title: "Ação",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ação" />
    ),
    cell: ({ row }) => {
      const action = row.getValue("action") as string;

      const colorClass = actionColors[action] || actionColors["create"];
      const label = actionLabels[action] || action;

      return (
        <Badge variant="outline" className={colorClass}>
          {displayValue(label)}
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
    accessorKey: "description",
    meta: {
      title: "Descrição",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Descrição" />
    ),
    cell: ({ row }) => {
      const description = row.getValue("description") as string;

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <p
                className="max-w-[300px]
                truncate cursor-help"
              >
                {displayValue(description)}
              </p>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-lg truncate">{displayValue(description)}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "userName",
    meta: {
      title: "Usuário",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Usuário" />
    ),
    cell: ({ row }) => {
      const userName = row.original.user?.name;
      const userEmail = row.original.user?.email;

      return (
        <div className="flex flex-col gap-1">
          <p className="font-medium text-sm">{displayValue(userName)}</p>
          <p
            className="text-xs text-muted-foreground
            truncate max-w-[200px]"
          >
            {displayValue(userEmail)}
          </p>
        </div>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "userRole",
    accessorFn: (row) => row.user?.role || "",
    meta: {
      title: "Papel",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Papel" />
    ),
    cell: ({ row }) => {
      const role = row.original.user?.role;
      const colorClass = roleColors[role || ""] || roleColors["BUSINESS_USER"];

      const label = roleLabels[role || ""] || role;

      return (
        <Badge variant="outline" className={colorClass}>
          {displayValue(label)}
        </Badge>
      );
    },
    enableSorting: false,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "business_name",
    accessorFn: (row) => row.business?.corporate_reason || row.tenantName || "",
    meta: {
      title: "Empresa",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Empresa" />
    ),
    cell: ({ row }) => {
      const businessName =
        row.original.business?.corporate_reason ?? row.original.tenantName;

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="max-w-[200px] truncate cursor-help">
                {displayValue(businessName)}
              </p>
            </TooltipTrigger>
            <TooltipContent>
              <p>{displayValue(businessName)}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
    enableSorting: false,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "status",
    meta: {
      title: "Status",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const colorClass =
        statusColors[status] ||
        "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200";

      return (
        <Badge variant="outline" className={colorClass}>
          {displayValue(status)}
        </Badge>
      );
    },
    enableSorting: false,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "created_at",
    meta: {
      title: "Data",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data" />
    ),
    cell: ({ row }) => {
      return (
        <p
          className="text-sm w-36
          text-muted-foreground"
        >
          {displayValue(
            formatNotificationDate(row.getValue("created_at"), "pt-BR"),
          )}
        </p>
      );
    },
    enableSorting: false,
  },
];

export { tableActivityColumns };
