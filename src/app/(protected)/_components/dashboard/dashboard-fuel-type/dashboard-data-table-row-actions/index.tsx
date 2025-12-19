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

import { fuelTypeTableSchema } from "@/schemas/fuel-type-table-schema";

import { DashboardUpdateFuelTypeForm } from "../dashboard-update-fuel-type-form";
import { DashboardDeleteFuelTypeForm } from "../dashboard-delete-fuel-type-form";

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";

import { toast } from "sonner";
import { useDashboardUpdateFuelTypeForm } from "./hooks";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableFuelTypeRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const collumnRowAction = fuelTypeTableSchema.parse(row.original);
  const {
    handleCloseUpdateFuelType,
    handleOpenDropdown,
    isDropdownOpen,
    isUpdateFuelTypeOpen,
  } = useDashboardUpdateFuelTypeForm();

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
    permissions.FUEL_TYPE_MANAGE,
    "write",
  );

  const menuActions = [
    {
      label: "Editar Tipo do Combustível",
      onClick: handleCloseUpdateFuelType,
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
          <DashboardDeleteFuelTypeForm fuelTypeId={collumnRowAction.id} />
        </DropdownMenuContent>
      </DropdownMenu>

      {isUpdateFuelTypeOpen && (
        <DashboardUpdateFuelTypeForm
          fuelTypeData={collumnRowAction}
          handleCloseUpdateFuelType={handleCloseUpdateFuelType}
          isUpdateFuelTypeOpen={isUpdateFuelTypeOpen}
        />
      )}
    </>
  );
}
