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
import { DashboardDeletePartForm } from "../dashboard-delete-part-form";

import { useDashboardUpdatePartForm } from "./hooks";
import { DashboardUpdatePartForm } from "../dashboard-update-part-form";

import { toast } from "sonner";

import { permissions } from "@/lib/permissions";
import { useHasPermission } from "@/lib/user-has-permission";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DashboardDataTablePartRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const collumnRowAction = partTableSchema.parse(row.original);
  const {
    handleCloseUpdatePart,
    handleOpenDropdown,
    isDropdownOpen,
    isUpdatePartOpen,
  } = useDashboardUpdatePartForm();

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

  const hasUserPermission = useHasPermission(permissions.PART_MANAGE, "write");

  const menuActions = [
    {
      label: "Editar Peça",
      onClick: handleCloseUpdatePart,
      disabled: !hasUserPermission,
    },
    {
      label: "Copiar ID",
      onClick: () => handleCopyID(collumnRowAction.id),
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
              disabled={action.disabled}
            >
              {action.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DashboardDeletePartForm partId={collumnRowAction.id} />
        </DropdownMenuContent>
      </DropdownMenu>

      {isUpdatePartOpen && (
        <DashboardUpdatePartForm
          partData={collumnRowAction}
          handleCloseUpdatePart={handleCloseUpdatePart}
          isUpdatePartOpen={isUpdatePartOpen}
        />
      )}
    </>
  );
}
