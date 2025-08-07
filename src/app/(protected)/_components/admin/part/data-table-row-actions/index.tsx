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

import { partTableSchema } from "@/schemas/part-table-schema";
import { DeletePartForm } from "../delete-part-form";

import { useUpdatePartForm } from "./hooks";
import { UpdatePartForm } from "../update-part-form";

import { toast } from "sonner";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTablePartRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const collumnRowAction = partTableSchema.parse(row.original);
  const {
    handleCloseUpdatePart,
    handleOpenDropdown,
    isDropdownOpen,
    isUpdatePartOpen,
  } = useUpdatePartForm();

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
      label: "Editar Peça",
      onClick: handleCloseUpdatePart,
    },
    {
      label: "Copiar ID",
      onClick: () => handleCopyID(collumnRowAction.id),
    },
    {
      label: "Copiar ID da empresa",
      onClick: () => handleCopyID(collumnRowAction.businessId as string),
    },
    ...(collumnRowAction.supplierId
      ? [
          {
            label: "Copiar ID do fornecedor",
            onClick: () => handleCopyID(collumnRowAction.supplierId as string),
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
          <DeletePartForm
            businessId={collumnRowAction.businessId as string}
            partId={collumnRowAction.id}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      {isUpdatePartOpen && (
        <UpdatePartForm
          partData={collumnRowAction}
          handleCloseUpdatePart={handleCloseUpdatePart}
          isUpdatePartOpen={isUpdatePartOpen}
        />
      )}
    </>
  );
}
