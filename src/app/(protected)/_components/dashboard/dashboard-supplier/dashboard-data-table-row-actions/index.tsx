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
import { supplierTableSchema } from "@/schemas/supplier-table-schema";

import { DashboardDeleteSupplierForm } from "../dashboard-delete-supplier-form";
import { DashboardUpdateSupplierForm } from "../dashboard-update-supplier-form";

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";

import { useDashboardUpdateSupplierForm } from "./hooks";
import { toast } from "sonner";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DashboardDataTableSupplierRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const collumnRowAction = supplierTableSchema.parse(row.original);
  const {
    handleCloseUpdateSupplier,
    handleOpenDropdown,
    isDropdownOpen,
    isUpdateSupplierOpen,
  } = useDashboardUpdateSupplierForm();

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
    permissions.SUPPLIER_MANAGE,
    "write",
  );

  const menuActions = [
    {
      label: "Editar Fornecedor",
      onClick: handleCloseUpdateSupplier,
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
          <DashboardDeleteSupplierForm supplierId={collumnRowAction.id} />
        </DropdownMenuContent>
      </DropdownMenu>

      {isUpdateSupplierOpen && (
        <DashboardUpdateSupplierForm
          supplierData={collumnRowAction}
          handleCloseUpdateSupplier={handleCloseUpdateSupplier}
          isUpdateSupplierOpen={isUpdateSupplierOpen}
        />
      )}
    </>
  );
}
