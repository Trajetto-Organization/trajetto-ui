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

import { DeleteVehicleForm } from "../delete-vehicle-form";
import { UpdateVehicleForm } from "../update-vehicle-form";

import { useUpdateVehicleForm } from "./hooks";
import { toast } from "sonner";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableVehicleRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const collumnRowAction = vehicleTableSchema.parse(row.original);
  const {
    handleCloseUpdateVehicle,
    handleOpenDropdown,
    isDropdownOpen,
    isUpdateVehicleOpen,
  } = useUpdateVehicleForm();

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
      label: "Editar Veículo",
      onClick: handleCloseUpdateVehicle,
    },
    {
      label: "Copiar ID",
      onClick: () => handleCopyID(collumnRowAction.id),
    },
    {
      label: "Copiar ID da empresa",
      onClick: () => handleCopyID(collumnRowAction.businessId as string),
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
    ...(collumnRowAction.vehicleTypeId !== "N/A"
      ? [
          {
            label: "Copiar ID do tipo de veículo",
            onClick: () =>
              handleCopyID(collumnRowAction.vehicleTypeId as string),
          },
        ]
      : []),
    {
      label: "Copiar ID do combustível",
      onClick: () => handleCopyID(collumnRowAction.fuelTypeId as string),
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
          <DeleteVehicleForm
            businessId={collumnRowAction.businessId as string}
            vehicleId={collumnRowAction.id}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      {isUpdateVehicleOpen && (
        <UpdateVehicleForm
          vehicleData={collumnRowAction}
          handleCloseUpdateVehicle={handleCloseUpdateVehicle}
          isUpdateVehicleOpen={isUpdateVehicleOpen}
        />
      )}
    </>
  );
}
