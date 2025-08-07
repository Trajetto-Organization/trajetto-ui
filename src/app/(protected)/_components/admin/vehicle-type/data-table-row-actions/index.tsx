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

import { DeleteVehicleTypeForm } from "../delete-vehicle-type-form";
import { UpdateVehicleTypeForm } from "../update-vehicle-type-form";

import { toast } from "sonner";
import { useUpdateVehicleTypeForm } from "./hooks";

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
  } = useUpdateVehicleTypeForm();

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

  const menuActions = [
    {
      label: "Editar Tipo do Veículo",
      onClick: handleCloseUpdateVehicleType,
    },
    {
      label: "Copiar ID",
      onClick: () => handleCopyID(collumnRowAction.id),
    },
    {
      label: "Copiar ID da empresa",
      onClick: () => handleCopyID(collumnRowAction.businessId as string),
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
            >
              {action.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DeleteVehicleTypeForm
            businessId={collumnRowAction.businessId as string}
            vehicleTypeId={collumnRowAction.id}
          />
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
