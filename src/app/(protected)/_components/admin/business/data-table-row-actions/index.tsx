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

import { businessTableSchema } from "@/schemas/business-table-schema";
import { DeleteBusinessForm } from "../delete-business-form";

import { UpdateBusinessForm } from "../update-business-form";
import { useUpdateBusinessForm } from "./hooks";

import { toast } from "sonner";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableBusinessRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const collumnRowAction = businessTableSchema.parse(row.original);
  const {
    isUpdateBusinessOpen,
    handleCloseUpdateBusiness,
    handleOpenDropdown,
    isDropdownOpen,
  } = useUpdateBusinessForm();

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
      label: "Editar Empresa",
      onClick: handleCloseUpdateBusiness,
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
            >
              {action.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DeleteBusinessForm bussinessId={collumnRowAction.id} />
        </DropdownMenuContent>
      </DropdownMenu>

      {isUpdateBusinessOpen && (
        <UpdateBusinessForm
          businessData={collumnRowAction}
          handleCloseUpdateBusiness={handleCloseUpdateBusiness}
          isUpdateBusinessOpen={isUpdateBusinessOpen}
        />
      )}
    </>
  );
}
