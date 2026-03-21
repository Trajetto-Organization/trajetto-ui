"use client";

import { Row } from "@tanstack/react-table";

import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fineTableSchema } from "@/schemas/fine-table-schema";

import { useDashboardUpdateFineForm } from "./hooks";
import { DashboardDeleteFineForm } from "../dashboard-delete-fine-form";

import { toast } from "sonner";
import { permissions } from "@/lib/permissions";

import { DashboardUpdateFineForm } from "../dashboard-update-fine-form";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DashboardDataTableFineRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const columnRowAction = fineTableSchema.parse(row.original);
  const {
    handleCloseUpdateFine,
    handleOpenDropdown,
    isDropdownOpen,
    isUpdateFineOpen,
  } = useDashboardUpdateFineForm();

  const handleCopyID = (column: string) => {
    navigator.clipboard
      .writeText(column)
      .then(() => {
        toast.success("ID copiado para a área de transferência!");
      })
      .catch((err) => {
        toast.error("Erro ao copiar o ID: " + err);
      });
  };

  const permissionsRequired = useCheckMultiplePermissions([
    {
      key: permissions.FINE_MANAGE,
      action: "write",
      label: getPermissionName(permissions.FINE_MANAGE),
    },
    {
      key: permissions.BRANCH_MANAGE,
      action: "read",
      label: getPermissionName(permissions.BRANCH_MANAGE),
    },
    {
      key: permissions.VEHICLE_MANAGE,
      action: "read",
      label: getPermissionName(permissions.VEHICLE_MANAGE),
    },
    {
      key: permissions.DRIVER_MANAGE,
      action: "read",
      label: getPermissionName(permissions.DRIVER_MANAGE),
    },
  ]);

  const menuActions = [
    {
      label: "Editar Multa",
      onClick: handleCloseUpdateFine,
      disabled: !permissionsRequired.hasAllPermissions,
      tooltip: !permissionsRequired.hasAllPermissions
        ? permissionsRequired.tooltipMessage
        : "",
    },
    {
      label: "Copiar ID da multa",
      onClick: () => handleCopyID(columnRowAction.id),
    },
    {
      label: "Copiar ID da filial",
      onClick: () => handleCopyID(columnRowAction.branchId as string),
    },
    {
      label: "Copiar ID do motorista",
      onClick: () => handleCopyID(columnRowAction.driverId as string),
    },
    {
      label: "Copiar ID do veículo",
      onClick: () => handleCopyID(columnRowAction.vehicleId as string),
    },
    {
      label: "Copiar código de infração",
      onClick: () =>
        handleCopyID(columnRowAction.trafficViolationCode.code as string),
    },
  ];

  return (
    <>
      <DropdownMenu open={isDropdownOpen} onOpenChange={handleOpenDropdown}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
          >
            <MoreHorizontal />
            <span className="sr-only">Abrir Menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          {menuActions.map((action) => (
            <TooltipProvider key={action.label}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <DropdownMenuItem
                      className="cursor-pointer 
                      truncate block"
                      onClick={action.onClick}
                      disabled={action.disabled}
                    >
                      {action.label}
                    </DropdownMenuItem>
                  </div>
                </TooltipTrigger>
                {action.disabled && action.tooltip && (
                  <TooltipContent className="max-w-sm">
                    <p>{action.tooltip}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          ))}
          <DropdownMenuSeparator />
          <DashboardDeleteFineForm fineId={columnRowAction.id} />
        </DropdownMenuContent>
      </DropdownMenu>

      {isUpdateFineOpen && (
        <DashboardUpdateFineForm
          fineData={columnRowAction}
          handleCloseUpdateFine={handleCloseUpdateFine}
          isUpdateFineOpen={isUpdateFineOpen}
        />
      )}
    </>
  );
}
