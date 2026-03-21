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

import { vehicleTypeTableSchema } from "@/schemas/vehicle-type-table-schema";

import { DashboardDeleteVehicleTypeForm } from "../dashboard-delete-vehicle-type-form";
import { UpdateVehicleTypeForm } from "../dashboard-update-vehicle-type-form";

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";

import { useDashboardUpdateVehicleTypeForm } from "./hooks";
import { toast } from "sonner";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableVehicleTypeRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const collumnRowAction = vehicleTypeTableSchema.parse(row.original);
  const {
    handleCloseUpdateVehicleType,
    handleOpenDropdown,
    isDropdownOpen,
    isUpdateVehicleTypeOpen,
  } = useDashboardUpdateVehicleTypeForm();

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

  const hasUserPermission = useHasPermission(
    permissions.VEHICLE_TYPE_MANAGE,
    "write",
  );

  const menuActions = [
    {
      label: "Editar Tipo do Veículo",
      onClick: handleCloseUpdateVehicleType,
      disabled: !hasUserPermission,
    },
    {
      label: "Copiar ID",
      onClick: () => handleCopyID(collumnRowAction.id),
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
            <DropdownMenuItem
              key={action.label}
              className="cursor-pointer 
              truncate block"
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DashboardDeleteVehicleTypeForm vehicleTypeId={collumnRowAction.id} />
        </DropdownMenuContent>
      </DropdownMenu>

      {isUpdateVehicleTypeOpen && (
        <UpdateVehicleTypeForm
          vehicleTypeData={collumnRowAction}
          handleCloseUpdateVehicleType={handleCloseUpdateVehicleType}
          isUpdateVehicleTypeOpen={isUpdateVehicleTypeOpen}
        />
      )}
    </>
  );
}
