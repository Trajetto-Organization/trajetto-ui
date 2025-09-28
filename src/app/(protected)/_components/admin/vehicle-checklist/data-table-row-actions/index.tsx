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
import { vehicleChecklistTableSchema } from "@/schemas/vehicle-checklist-table-schema";

import { useVehicleChecklistRowActions } from "./hooks";
import { DeleteVehicleChecklistForm } from "../delete-vehicle-checklist-form";

import { UpdateVehicleChecklistForm } from "../update-vehicle-checklist-form";
import { toast } from "sonner";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableVehicleChecklistRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const columnRowAction = vehicleChecklistTableSchema.parse(row.original);

  const {
    handleOpenDropdown,
    isDropdownOpen,
    handleCloseUpdateChecklist,
    isUpdateChecklistOpen,
  } = useVehicleChecklistRowActions();

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

  const menuActions = [
    {
      label: "Editar Checklist",
      onClick: handleCloseUpdateChecklist,
    },
    {
      label: "Copiar ID",
      onClick: () => handleCopyID(columnRowAction.id),
    },
    {
      label: "Copiar ID da empresa",
      onClick: () => handleCopyID(columnRowAction.businessId as string),
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
          <DeleteVehicleChecklistForm
            businessId={columnRowAction.businessId as string}
            checklistId={columnRowAction.id}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      {isUpdateChecklistOpen && (
        <UpdateVehicleChecklistForm
          checklistData={columnRowAction}
          handleCloseUpdateChecklist={handleCloseUpdateChecklist}
          isUpdateChecklistOpen={isUpdateChecklistOpen}
        />
      )}
    </>
  );
}
