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

import { DashboardDeleteDriverForm } from "../dashboard-delete-driver-form";
import { DashboardUpdateDriverForm } from "../dashboard-update-driver-form";

import { useDashboardUpdateDriverForm } from "./hooks";
import { toast } from "sonner";

import { useHasPermission } from "@/lib/user-has-permission";
import { permissions } from "@/lib/permissions";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DashboardDataTableDriverRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const collumnRowAction = driverTableSchema.parse(row.original);
  const {
    handleCloseUpdateDriver,
    handleOpenDropdown,
    isDropdownOpen,
    isUpdateDriverOpen,
  } = useDashboardUpdateDriverForm();

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
    permissions.DRIVER_MANAGE,
    "write",
  );

  const menuActions = [
    {
      label: "Editar Motorista",
      onClick: handleCloseUpdateDriver,
      disabled: !hasUserPermission,
    },
    {
      label: "Copiar ID",
      onClick: () => handleCopyID(collumnRowAction.id),
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
              disabled={action.disabled}
            >
              {action.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DashboardDeleteDriverForm driverId={collumnRowAction.id} />
        </DropdownMenuContent>
      </DropdownMenu>

      {isUpdateDriverOpen && (
        <DashboardUpdateDriverForm
          driverData={collumnRowAction}
          handleCloseUpdateDriver={handleCloseUpdateDriver}
          isUpdateDriverOpen={isUpdateDriverOpen}
        />
      )}
    </>
  );
}
