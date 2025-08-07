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

import { permissionsTableSchema } from "@/schemas/permissions-table-schema";
import { useUpdatePermissionForm } from "./hooks";

import { DeletePermissionForm } from "../delete-permission-form";
import { UpdatePermissionForm } from "../update-permission-form";

import { toast } from "sonner";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTablePermissionRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const collumnRowAction = permissionsTableSchema.parse(row.original);
  const {
    isUpdatePermissionOpen,
    handleOpenUpdatePermission,
    handleOpenDropdown,
    isDropdownOpen,
  } = useUpdatePermissionForm();

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
      label: "Editar Permissão",
      onClick: handleOpenUpdatePermission,
    },
    {
      label: "Copiar ID",
      onClick: () => handleCopyID(collumnRowAction.id),
    },
    {
      label: "Copiar ID da empresa",
      onClick: () => handleCopyID(collumnRowAction.businessId),
    },
    {
      label: "Copiar ID do perfil",
      onClick: () => handleCopyID(collumnRowAction.profileAccessId),
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
          <DeletePermissionForm permissionId={collumnRowAction.id} />
        </DropdownMenuContent>
      </DropdownMenu>

      {isUpdatePermissionOpen && (
        <UpdatePermissionForm
          permissionData={collumnRowAction}
          handleOpenUpdatePermission={handleOpenUpdatePermission}
          isUpdatePermission={isUpdatePermissionOpen}
        />
      )}
    </>
  );
}
