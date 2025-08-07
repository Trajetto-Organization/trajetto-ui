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

import { accountPayableTableSchema } from "@/schemas/account-payable-table-schema";
import { DeleteAccountPayableForm } from "../delete-account-payable-form";

import { UpdateAccountPayableForm } from "../update-account-payable-form";
import { useUpdateAccountPayableForm } from "./hooks";

import { toast } from "sonner";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableAccountPayableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const collumnRowAction = accountPayableTableSchema.parse(row.original);
  const {
    isUpdateAccountPayableOpen,
    handleCloseUpdateAccountPayable,
    handleOpenDropdown,
    isDropdownOpen,
  } = useUpdateAccountPayableForm();

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
      label: "Editar Conta a Pagar",
      onClick: handleCloseUpdateAccountPayable,
    },
    {
      label: "Copiar ID",
      onClick: () => handleCopyID(collumnRowAction.id),
    },
    {
      label: "Copiar ID da empresa",
      onClick: () => handleCopyID(collumnRowAction.businessId),
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
          <DeleteAccountPayableForm
            businessId={collumnRowAction.businessId}
            accountPayableId={collumnRowAction.id}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      {isUpdateAccountPayableOpen && (
        <UpdateAccountPayableForm
          accountPayableData={collumnRowAction}
          handleCloseUpdateAccountPayable={handleCloseUpdateAccountPayable}
          isUpdateAccountPayableOpen={isUpdateAccountPayableOpen}
        />
      )}
    </>
  );
}
