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

import { branchTableSchema } from "@/schemas/branch-table-schema";
import { DeleteBranchForm } from "../delete-branch-form";

import { UpdateBranchForm } from "../update-branch-form";
import { useUpdateBranchForm } from "./hooks";

import { toast } from "sonner";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableBranchRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const collumnRowAction = branchTableSchema.parse(row.original);
  const {
    isUpdateBranchOpen,
    handleCloseUpdateBranch,
    handleOpenDropdown,
    isDropdownOpen,
  } = useUpdateBranchForm();

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
      label: "Editar Filial",
      onClick: handleCloseUpdateBranch,
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
          <DeleteBranchForm
            businessId={collumnRowAction.businessId}
            branchId={collumnRowAction.id}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      {isUpdateBranchOpen && (
        <UpdateBranchForm
          branchData={collumnRowAction}
          handleCloseUpdateBranch={handleCloseUpdateBranch}
          isUpdateBranchOpen={isUpdateBranchOpen}
        />
      )}
    </>
  );
}
