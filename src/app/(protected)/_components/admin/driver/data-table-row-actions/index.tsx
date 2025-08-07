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
import { driverTableSchema } from "@/schemas/driver-table-schema";

import { DeleteDriverForm } from "../delete-driver-form";
import { UpdateDriverForm } from "../update-driver-form";

import { useUpdateDriverForm } from "./hooks";
import { toast } from "sonner";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableDriverRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const collumnRowAction = driverTableSchema.parse(row.original);
  const {
    handleCloseUpdateDriver,
    handleOpenDropdown,
    isDropdownOpen,
    isUpdateDriverOpen,
  } = useUpdateDriverForm();

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
      label: "Editar Motorista",
      onClick: handleCloseUpdateDriver,
    },
    {
      label: "Copiar ID",
      onClick: () => handleCopyID(collumnRowAction.id),
    },
    {
      label: "Copiar ID da empresa",
      onClick: () => handleCopyID(collumnRowAction.businessId as string),
    },
    ...(collumnRowAction.branchId
      ? [
          {
            label: "Copiar ID da filial",
            onClick: () => handleCopyID(collumnRowAction.branchId as string),
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
          <DeleteDriverForm
            businessId={collumnRowAction.businessId as string}
            driverId={collumnRowAction.id}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      {isUpdateDriverOpen && (
        <UpdateDriverForm
          driverData={collumnRowAction}
          handleCloseUpdateDriver={handleCloseUpdateDriver}
          isUpdateDriverOpen={isUpdateDriverOpen}
        />
      )}
    </>
  );
}
