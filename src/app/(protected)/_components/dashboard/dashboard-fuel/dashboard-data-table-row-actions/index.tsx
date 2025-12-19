"use client";

import { Row } from "@tanstack/react-table";

import { MoreHorizontal, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fuelTableSchema } from "@/schemas/fuel-table-schema";

import { useDashboardUpdateFuelForm } from "./hooks";
import { DashboardDeleteFuelForm } from "../dashboard-delete-fuel-form";

import { FuelDetailsDialog } from "../../../fuel-details-dialog";
import { useFuelDetailsDialog } from "../../../fuel-details-dialog/hooks";

import { DashboardUpdateFuelForm } from "../dashboard-update-fuel-form";

import { toast } from "sonner";
import { permissions } from "@/lib/permissions";

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

export function DashboardDataTableFuelRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const columnRowAction = fuelTableSchema.parse(row.original);

  const {
    handleOpenDropdown,
    isDropdownOpen,
    isUpdateFuelOpen,
    handleCloseUpdateFuel,
  } = useDashboardUpdateFuelForm();

  const { isOpen, handleToggleDialog } = useFuelDetailsDialog();

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
      key: permissions.FUEL_MANAGE,
      action: "write",
      label: getPermissionName(permissions.FUEL_MANAGE),
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
    {
      key: permissions.FUEL_TYPE_MANAGE,
      action: "read",
      label: getPermissionName(permissions.FUEL_TYPE_MANAGE),
    },
  ]);

  const menuActions = [
    {
      label: "Editar Abastecimento",
      onClick: handleCloseUpdateFuel,
      disabled: !permissionsRequired.hasAllPermissions,
      tooltip: !permissionsRequired.hasAllPermissions
        ? permissionsRequired.tooltipMessage
        : "",
    },
    {
      label: "Copiar ID",
      onClick: () => handleCopyID(columnRowAction.id),
    },
    {
      label: "Copiar ID da filial",
      onClick: () => handleCopyID(columnRowAction.branchId as string),
    },
    {
      label: "Copiar ID do veículo",
      onClick: () => handleCopyID(columnRowAction.vehicleId as string),
    },
    {
      label: "Copiar ID do motorista",
      onClick: () => handleCopyID(columnRowAction.driverId as string),
    },
    {
      label: "Copiar ID do combustível",
      onClick: () => handleCopyID(columnRowAction.fuelTypeId as string),
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
          <DropdownMenuItem
            onClick={handleToggleDialog}
            className="flex cursor-pointer 
            justify-between"
          >
            Ver Detalhes
            <Eye />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
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
          <DashboardDeleteFuelForm fuelId={columnRowAction.id} />
        </DropdownMenuContent>
      </DropdownMenu>

      {isOpen && (
        <FuelDetailsDialog
          fuelData={columnRowAction}
          isOpen={isOpen}
          onOpenChange={handleToggleDialog}
        />
      )}

      {isUpdateFuelOpen && (
        <DashboardUpdateFuelForm
          fuelData={columnRowAction}
          handleCloseUpdateFuel={handleCloseUpdateFuel}
          isUpdateFuelOpen={isUpdateFuelOpen}
        />
      )}
    </>
  );
}
