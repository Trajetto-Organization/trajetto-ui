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
import { DashboardDeleteBranchForm } from "../dashboard-delete-branch-form";

import { DashboardUpdateBranchForm } from "../dashboard-update-branch-form";
import { useDashboardUpdateBranchForm } from "./hooks";

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";

import { toast } from "sonner";

interface DashboardDataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DashboardDataTableBranchRowActions<TData>({
  row,
}: DashboardDataTableRowActionsProps<TData>) {
  const collumnRowAction = branchTableSchema.parse(row.original);
  const {
    isUpdateBranchOpen,
    handleCloseUpdateBranch,
    handleOpenDropdown,
    isDropdownOpen,
  } = useDashboardUpdateBranchForm();

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
    permissions.BRANCH_MANAGE,
    "write",
  );

  const menuActions = [
    {
      label: "Editar Filial",
      onClick: handleCloseUpdateBranch,
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
          <DashboardDeleteBranchForm
            businessId={collumnRowAction.businessId}
            branchId={collumnRowAction.id}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      {isUpdateBranchOpen && (
        <DashboardUpdateBranchForm
          branchData={collumnRowAction}
          handleCloseUpdateBranch={handleCloseUpdateBranch}
          isUpdateBranchOpen={isUpdateBranchOpen}
        />
      )}
    </>
  );
}
