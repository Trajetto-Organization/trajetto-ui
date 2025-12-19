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
import { vehicleTableSchema } from "@/schemas/vehicle-table-schema";

import { DashboardDeleteVehicleForm } from "../dashboard-delete-vehicle-form";
import { DashboardUpdateVehicleForm } from "../dashboard-update-vehicle-form";

import { useDashboardUpdateVehicleForm } from "./hooks";
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

export function DashboardDataTableVehicleRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const collumnRowAction = vehicleTableSchema.parse(row.original);
  const {
    handleCloseUpdateVehicle,
    handleOpenDropdown,
    isDropdownOpen,
    isUpdateVehicleOpen,
  } = useDashboardUpdateVehicleForm();

  const handleCopyID = (collumn: string) => {
    navigator.clipboard
      .writeText(collumn)
      .then(() => {
        toast.success("ID copiado para a área de transferência!");
      })
      .catch((err) => {
        toast.error("Erro ao copiar o ID: " + err);
      });
  };

  const permissionsRequired = useCheckMultiplePermissions([
    {
      key: permissions.VEHICLE_MANAGE,
      action: "write",
      label: getPermissionName(permissions.VEHICLE_MANAGE),
    },
    {
      key: permissions.FUEL_TYPE_MANAGE,
      action: "read",
      label: getPermissionName(permissions.FUEL_TYPE_MANAGE),
    },
  ]);

  const menuActions = [
    {
      label: "Editar Veículo",
      onClick: handleCloseUpdateVehicle,
      disabled: !permissionsRequired.hasAllPermissions,
      tooltip: !permissionsRequired.hasAllPermissions
        ? permissionsRequired.tooltipMessage
        : "",
    },
    {
      label: "Copiar ID",
      onClick: () => handleCopyID(collumnRowAction.id),
    },
    ...(collumnRowAction.driverId !== "N/A"
      ? [
          {
            label: "Copiar ID do motorista",
            onClick: () => handleCopyID(collumnRowAction.driverId as string),
          },
        ]
      : []),
    ...(collumnRowAction.branchId !== "N/A"
      ? [
          {
            label: "Copiar ID da filial",
            onClick: () => handleCopyID(collumnRowAction.branchId as string),
          },
        ]
      : []),
    {
      label: "Copiar ID do combustível",
      onClick: () => handleCopyID(collumnRowAction.fuelTypeId as string),
    },
    ...(collumnRowAction.vehicleTypeId !== "N/A"
      ? [
          {
            label: "Copiar ID do tipo de veículo",
            onClick: () =>
              handleCopyID(collumnRowAction.vehicleTypeId as string),
          },
        ]
      : []),
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
            <TooltipProvider delayDuration={100} key={action.label}>
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
          <DashboardDeleteVehicleForm vehicleId={collumnRowAction.id} />
        </DropdownMenuContent>
      </DropdownMenu>

      {isUpdateVehicleOpen && (
        <DashboardUpdateVehicleForm
          vehicleData={collumnRowAction}
          handleCloseUpdateVehicle={handleCloseUpdateVehicle}
          isUpdateVehicleOpen={isUpdateVehicleOpen}
        />
      )}
    </>
  );
}
