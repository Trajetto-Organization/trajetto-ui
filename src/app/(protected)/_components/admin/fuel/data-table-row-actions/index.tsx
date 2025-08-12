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

import { useFuelRowActions } from "./hooks";
import { DeleteFuelForm } from "../delete-fuel-form";

import { FuelDetailsDialog } from "../fuel-details-dialog";
import { useFuelDetailsDialog } from "../fuel-details-dialog/hooks";

import { toast } from "sonner";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableFuelRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const columnRowAction = fuelTableSchema.parse(row.original);

  const { handleOpenDropdown, isDropdownOpen } = useFuelRowActions();
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

  const menuActions = [
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
          <DeleteFuelForm
            businessId={columnRowAction.businessId as string}
            fuelId={columnRowAction.id}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      {isOpen && (
        <FuelDetailsDialog
          fuelData={columnRowAction}
          isOpen={isOpen}
          onOpenChange={handleToggleDialog}
        />
      )}
    </>
  );
}
